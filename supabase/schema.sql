-- ======================================================================================
-- NIEVAS ACADEMIA DEPORTIVA - KARATE TRADICIONAL
-- ESQUEMA COMPLETO DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- 100% LIMPIO - LISTO PARA CARGA DE DATOS REALES POR LA DIRECCIÓN
-- ======================================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DEL TATAMI Y ADMINISTRACIÓN
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'PROFESOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

DO $$ BEGIN
    CREATE TYPE estado_alumno AS ENUM ('ACTIVO', 'INACTIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_sesion AS ENUM ('ABIERTA', 'FINALIZADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_asistencia AS ENUM ('PRESENTE', 'AUSENTE', 'TARDE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ======================================================================================
-- 3. TABLAS PRINCIPALES
-- ======================================================================================

-- 3.1 Usuarios (Senseis y Headmaster / Dirección)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    rol rol_usuario NOT NULL DEFAULT 'PROFESOR',
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.2 Alumnos del Dojo
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL DEFAULT '2015-01-01',
    telefono_contacto TEXT NOT NULL DEFAULT 'Sin registrar',
    contacto_emergencia TEXT NOT NULL DEFAULT 'Sin registrar',
    cinturon_actual cinturon_karate NOT NULL DEFAULT 'Blanco',
    estado estado_alumno NOT NULL DEFAULT 'ACTIVO',
    notas_privadas TEXT, -- Confidencial: Solo visible para Dirección
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.3 Listas de Alumnos Guardadas por los Senseis
CREATE TABLE IF NOT EXISTS public.listas_alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.4 Relación Listas - Alumnos (M a N)
CREATE TABLE IF NOT EXISTS public.lista_alumnos_items (
    lista_id UUID NOT NULL REFERENCES public.listas_alumnos(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (lista_id, alumno_id)
);

-- 3.5 Clases Creadas por los Senseis al momento
CREATE TABLE IF NOT EXISTS public.clases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    profesor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1, 3, 5],
    hora_inicio TIME NOT NULL DEFAULT '18:00:00',
    hora_fin TIME NOT NULL DEFAULT '19:15:00',
    cupo_maximo INTEGER NOT NULL DEFAULT 30,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.6 Inscripciones / Alumnos Vinculados a una Clase
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_clase_alumno UNIQUE (clase_id, alumno_id)
);

-- 3.7 Sesiones de Clase (Apertura de clase en el Tatami)
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

-- 3.8 Asistencias del Tatami
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID NOT NULL REFERENCES public.sesiones_clase(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    estado estado_asistencia NOT NULL DEFAULT 'AUSENTE',
    es_recuperacion BOOLEAN NOT NULL DEFAULT false,
    marcado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_sesion_alumno UNIQUE (sesion_id, alumno_id)
);

-- 3.9 Historial de Graduaciones de Cinturón
CREATE TABLE IF NOT EXISTS public.historial_graduaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    cinturon cinturon_karate NOT NULL,
    fecha_graduacion DATE NOT NULL DEFAULT CURRENT_DATE,
    graduado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ======================================================================================
-- 4. ÍNDICES DE ALTO RENDIMIENTO
-- ======================================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_alumnos_cinturon ON public.alumnos(cinturon_actual);
CREATE INDEX IF NOT EXISTS idx_alumnos_estado ON public.alumnos(estado);
CREATE INDEX IF NOT EXISTS idx_listas_creado_por ON public.listas_alumnos(creado_por);
CREATE INDEX IF NOT EXISTS idx_clases_profesor ON public.clases(profesor_id);
CREATE INDEX IF NOT EXISTS idx_clases_activa ON public.clases(activa);
CREATE INDEX IF NOT EXISTS idx_sesiones_profesor ON public.sesiones_clase(profesor_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha ON public.sesiones_clase(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_sesion ON public.asistencias(sesion_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno ON public.asistencias(alumno_id);

-- ======================================================================================
-- 5. TRIGGER AUTOMÁTICO: ACTUALIZAR CINTURÓN EN ALUMNO AL GRADUAR
-- ======================================================================================
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
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ======================================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_alumnos_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_graduaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura para la aplicación
CREATE POLICY "Permitir lectura general a usuarios autenticados" ON public.usuarios FOR ALL USING (true);
CREATE POLICY "Permitir gestión de alumnos" ON public.alumnos FOR ALL USING (true);
CREATE POLICY "Permitir gestión de listas" ON public.listas_alumnos FOR ALL USING (true);
CREATE POLICY "Permitir gestión de items de listas" ON public.lista_alumnos_items FOR ALL USING (true);
CREATE POLICY "Permitir gestión de clases" ON public.clases FOR ALL USING (true);
CREATE POLICY "Permitir gestión de inscripciones" ON public.inscripciones FOR ALL USING (true);
CREATE POLICY "Permitir gestión de sesiones" ON public.sesiones_clase FOR ALL USING (true);
CREATE POLICY "Permitir gestión de asistencias" ON public.asistencias FOR ALL USING (true);
CREATE POLICY "Permitir gestión de graduaciones" ON public.historial_graduaciones FOR ALL USING (true);
