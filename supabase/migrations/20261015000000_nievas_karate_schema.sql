-- ======================================================================================
-- NIEVAS ACADEMIA DEPORTIVA - KARATE TRADICIONAL
-- MIGRACIÓN DE BASE DE DATOS Y POLÍTICAS ROW LEVEL SECURITY (RLS)
-- Fecha: 2026-10-15
-- ======================================================================================

-- 1. EXTENSIONES Y ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rol de usuario del dojo
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'PROFESOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Cinturones tradicionales de Karate Do
DO $$ BEGIN
    CREATE TYPE cinturon_karate AS ENUM (
        'Blanco',
        'Blanco/Amarillo',
        'Amarillo',
        'Naranja',
        'Verde',
        'Azul',
        'Marrón',
        'Negro'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estado del alumno
DO $$ BEGIN
    CREATE TYPE estado_alumno AS ENUM ('ACTIVO', 'INACTIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estado de sesión de tatami
DO $$ BEGIN
    CREATE TYPE estado_sesion AS ENUM ('ABIERTA', 'FINALIZADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estado de asistencia
DO $$ BEGIN
    CREATE TYPE estado_asistencia AS ENUM ('PRESENTE', 'AUSENTE', 'TARDE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ======================================================================================
-- 2. TABLAS PRINCIPALES
-- ======================================================================================

-- 2.1 Usuarios (Senseis y Headmaster vinculados a auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    rol rol_usuario NOT NULL DEFAULT 'PROFESOR',
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2.2 Alumnos de Nievas Academia Deportiva
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    telefono_contacto TEXT NOT NULL,
    contacto_emergencia TEXT NOT NULL,
    cinturon_actual cinturon_karate NOT NULL DEFAULT 'Blanco',
    estado estado_alumno NOT NULL DEFAULT 'ACTIVO',
    notas_privadas TEXT, -- Confidencial: Solo visible por ADMIN
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2.3 Historial de Graduaciones (Pase de cinto)
CREATE TABLE IF NOT EXISTS public.historial_graduaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    cinturon cinturon_karate NOT NULL,
    fecha_graduacion DATE NOT NULL DEFAULT CURRENT_DATE,
    graduado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2.4 Clases / Horarios de Karate
CREATE TABLE IF NOT EXISTS public.clases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL, -- Ej: 'Infantiles Kumite', 'Adultos Avanzados'
    profesor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    dias_semana INTEGER[] NOT NULL, -- Array 0-6 (0=Domingo, 1=Lunes, 2=Martes...)
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    cupo_maximo INTEGER NOT NULL DEFAULT 30,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2.5 Inscripciones de Alumnos en Clases
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_clase_alumno UNIQUE (clase_id, alumno_id)
);

-- 2.6 Sesiones de Clase (Apertura de clase en el tatami por día)
CREATE TABLE IF NOT EXISTS public.sesiones_clase (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    profesor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_apertura TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    estado estado_sesion NOT NULL DEFAULT 'ABIERTA',
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2.7 Asistencias individuales en la sesión
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID NOT NULL REFERENCES public.sesiones_clase(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    estado estado_asistencia NOT NULL DEFAULT 'PRESENTE',
    es_recuperacion BOOLEAN NOT NULL DEFAULT false,
    marcado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_sesion_alumno UNIQUE (sesion_id, alumno_id)
);

-- ======================================================================================
-- 3. ÍNDICES DE RENDIMIENTO PARA DISPOSITIVOS MÓVILES
-- ======================================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_alumnos_estado ON public.alumnos(estado);
CREATE INDEX IF NOT EXISTS idx_alumnos_cinturon ON public.alumnos(cinturon_actual);
CREATE INDEX IF NOT EXISTS idx_clases_profesor ON public.clases(profesor_id);
CREATE INDEX IF NOT EXISTS idx_clases_activa ON public.clases(activa);
CREATE INDEX IF NOT EXISTS idx_inscripciones_clase ON public.inscripciones(clase_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno ON public.inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_clase_fecha ON public.sesiones_clase(clase_id, fecha);
CREATE INDEX IF NOT EXISTS idx_sesiones_profesor ON public.sesiones_clase(profesor_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_sesion ON public.asistencias(sesion_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno ON public.asistencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_marcado ON public.asistencias(marcado_en);
CREATE INDEX IF NOT EXISTS idx_historial_alumno ON public.historial_graduaciones(alumno_id);

-- ======================================================================================
-- 4. FUNCIONES HELPER DE SEGURIDAD (RBAC)
-- ======================================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS rol_usuario AS $$
DECLARE
    v_rol rol_usuario;
BEGIN
    SELECT rol INTO v_rol
    FROM public.usuarios
    WHERE id = auth.uid() AND activo = true;
    
    RETURN v_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.current_user_role() = 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger para sincronizar auth.users con public.usuarios al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, rol, nombre_completo, activo)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'PROFESOR'),
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1)),
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar cinturon_actual en alumno al registrar graduación
CREATE OR REPLACE FUNCTION public.handle_alumno_graduacion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.alumnos
    SET cinturon_actual = NEW.cinturon
    WHERE id = NEW.alumno_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_graduacion_inserted ON public.historial_graduaciones;
CREATE TRIGGER on_graduacion_inserted
    AFTER INSERT ON public.historial_graduaciones
    FOR EACH ROW EXECUTE FUNCTION public.handle_alumno_graduacion();

-- ======================================================================================
-- 5. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ======================================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_graduaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- 5.1 RLS: USUARIOS
CREATE POLICY "Admin tiene acceso total a usuarios"
    ON public.usuarios
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Usuarios pueden ver su propio perfil"
    ON public.usuarios
    FOR SELECT
    USING (id = auth.uid());

-- 5.2 RLS: ALUMNOS
-- Admin ve todo incluyendo notas_privadas
CREATE POLICY "Admin tiene acceso total a alumnos"
    ON public.alumnos
    FOR ALL
    USING (public.is_admin());

-- Profesor puede ver datos de alumnos activos para tomar lista y recuperaciones
CREATE POLICY "Profesor puede ver alumnos"
    ON public.alumnos
    FOR SELECT
    USING (public.current_user_role() = 'PROFESOR');

-- Profesor puede inscribir nuevos alumnos rápidamente desde el tatami
CREATE POLICY "Profesor puede insertar alumnos rápidos"
    ON public.alumnos
    FOR INSERT
    WITH CHECK (public.current_user_role() = 'PROFESOR' AND notas_privadas IS NULL);

-- 5.3 RLS: HISTORIAL GRADUACIONES
CREATE POLICY "Admin tiene acceso total a graduaciones"
    ON public.historial_graduaciones
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Profesor puede ver historial de graduaciones"
    ON public.historial_graduaciones
    FOR SELECT
    USING (public.current_user_role() = 'PROFESOR');

-- 5.4 RLS: CLASES
CREATE POLICY "Admin tiene acceso total a clases"
    ON public.clases
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Profesor ve sus clases asignadas"
    ON public.clases
    FOR SELECT
    USING (
        public.current_user_role() = 'PROFESOR' AND profesor_id = auth.uid()
    );

-- 5.5 RLS: INSCRIPCIONES
CREATE POLICY "Admin tiene acceso total a inscripciones"
    ON public.inscripciones
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Profesor ve inscripciones de sus clases"
    ON public.inscripciones
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.clases c
            WHERE c.id = inscripciones.clase_id
            AND (c.profesor_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Profesor puede inscribir alumnos en sus clases"
    ON public.inscripciones
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clases c
            WHERE c.id = inscripciones.clase_id
            AND c.profesor_id = auth.uid()
        )
    );

-- 5.6 RLS: SESIONES CLASE
CREATE POLICY "Admin tiene acceso total a sesiones"
    ON public.sesiones_clase
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Profesor ve y gestiona sesiones de sus clases"
    ON public.sesiones_clase
    FOR ALL
    USING (
        profesor_id = auth.uid() OR public.is_admin()
    )
    WITH CHECK (
        profesor_id = auth.uid() OR public.is_admin()
    );

-- 5.7 RLS: ASISTENCIAS
CREATE POLICY "Admin tiene acceso total a asistencias"
    ON public.asistencias
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Profesor ve y marca asistencias de sus sesiones"
    ON public.asistencias
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.sesiones_clase s
            WHERE s.id = asistencias.sesion_id
            AND (s.profesor_id = auth.uid() OR public.is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sesiones_clase s
            WHERE s.id = asistencias.sesion_id
            AND (s.profesor_id = auth.uid() OR public.is_admin())
        )
    );

-- ======================================================================================
-- 6. DATOS SEMILLA (SEED DATA) DEMO PARA NIEVAS ACADEMIA DEPORTIVA
-- ======================================================================================
-- Usuarios Sensei
INSERT INTO public.usuarios (id, email, rol, nombre_completo, telefono, activo)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@nievaskarate.com', 'ADMIN', 'Sensei Marcos Nievas (Headmaster)', '+54 9 11 5555-0101', true),
    ('22222222-2222-2222-2222-222222222222', 'profesor@nievaskarate.com', 'PROFESOR', 'Sensei Lucas Benítez', '+54 9 11 5555-0202', true)
ON CONFLICT (id) DO UPDATE SET 
    nombre_completo = EXCLUDED.nombre_completo,
    rol = EXCLUDED.rol;

-- Clases
INSERT INTO public.clases (id, nombre, profesor_id, dias_semana, hora_inicio, hora_fin, cupo_maximo, activa)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Infantiles Kumite (6-12 años)', '22222222-2222-2222-2222-222222222222', ARRAY[1, 3, 5], '18:00:00', '19:15:00', 25, true),
    ('c2222222-2222-2222-2222-222222222222', 'Juveniles Kata & Bunkai', '22222222-2222-2222-2222-222222222222', ARRAY[2, 4], '19:30:00', '21:00:00', 20, true),
    ('c3333333-3333-3333-3333-333333333333', 'Adultos Tradicional y Dan', '11111111-1111-1111-1111-111111111111', ARRAY[1, 3, 5], '20:30:00', '22:00:00', 30, true)
ON CONFLICT (id) DO NOTHING;

-- Alumnos muestra
INSERT INTO public.alumnos (id, nombre, apellido, fecha_nacimiento, telefono_contacto, contacto_emergencia, cinturon_actual, estado, notas_privadas)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Joaquín', 'Martínez', '2014-05-12', '+54 9 11 4444-1111', 'Madre: Mariana +54 9 11 4444-1112', 'Amarillo', 'ACTIVO', 'Asmático leve, lleva inhalador en su bolso.'),
    ('a2222222-2222-2222-2222-222222222222', 'Sofía', 'Gómez', '2013-09-20', '+54 9 11 4444-2221', 'Padre: Roberto +54 9 11 4444-2222', 'Naranja', 'ACTIVO', 'Excelente rendimiento técnico. Candidata a torneo regional.'),
    ('a3333333-3333-3333-3333-333333333333', 'Mateo', 'Rossi', '2012-02-14', '+54 9 11 4444-3331', 'Tutor: Claudio +54 9 11 4444-3332', 'Verde', 'ACTIVO', 'Requiere seguimiento en guardias altas.'),
    ('a4444444-4444-4444-4444-444444444444', 'Valentina', 'Díaz', '2015-11-03', '+54 9 11 4444-4441', 'Madre: Patricia +54 9 11 4444-4442', 'Blanco', 'ACTIVO', 'Ingreso reciente con hermano.'),
    ('a5555555-5555-5555-5555-555555555555', 'Facundo', 'Fernández', '2011-07-29', '+54 9 11 4444-5551', 'Padre: Gabriel +54 9 11 4444-5552', 'Azul', 'ACTIVO', 'Alerta: 3 faltas por viaje familiar avisado.'),
    ('a6666666-6666-6666-6666-666666666666', 'Camila', 'López', '2010-04-18', '+54 9 11 4444-6661', 'Madre: Elena +54 9 11 4444-6662', 'Marrón', 'ACTIVO', 'Preparándose para examen de cinturón negro en Diciembre.'),
    ('a7777777-7777-7777-7777-777777777777', 'Agustín', 'Pérez', '2008-01-10', '+54 9 11 4444-7771', 'Padre: Juan +54 9 11 4444-7772', 'Blanco/Amarillo', 'ACTIVO', 'Atento a puntualidad.')
ON CONFLICT (id) DO NOTHING;

-- Inscripciones a clases
INSERT INTO public.inscripciones (clase_id, alumno_id, fecha_alta, activo)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '2026-01-15', true),
    ('c1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', '2026-01-15', true),
    ('c1111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', '2026-02-01', true),
    ('c1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', '2026-03-01', true),
    ('c1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', '2026-01-10', true),
    ('c2222222-2222-2222-2222-222222222222', 'a6666666-6666-6666-6666-666666666666', '2026-01-10', true),
    ('c2222222-2222-2222-2222-222222222222', 'a7777777-7777-7777-7777-777777777777', '2026-02-15', true)
ON CONFLICT (clase_id, alumno_id) DO NOTHING;
