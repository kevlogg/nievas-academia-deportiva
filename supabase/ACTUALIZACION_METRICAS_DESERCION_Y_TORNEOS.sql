-- ======================================================================================
-- NIEVAS ACADEMIA DEPORTIVA - ACTUALIZACIÓN COMPLETA DE BASE DE DATOS
-- Ejecutar este script en: Supabase Dashboard -> SQL Editor -> Run
-- ======================================================================================

-- 1. Soporte de Subcategorías en Alumnos e Historial de Graduaciones
ALTER TABLE public.alumnos 
ADD COLUMN IF NOT EXISTS subcategoria_actual TEXT;

ALTER TABLE public.historial_graduaciones 
ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- 2. Tabla: Historial de Bajas y Deserción (Alumnos que no vuelven / continúan)
CREATE TABLE IF NOT EXISTS public.historial_bajas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    alumno_nombre TEXT NOT NULL,
    cinturon TEXT NOT NULL,
    subcategoria TEXT,
    fecha_baja DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo TEXT NOT NULL DEFAULT 'NO_VUELVE',
    motivo TEXT,
    ausencias_consecutivas INTEGER NOT NULL DEFAULT 4,
    telefono_contacto TEXT,
    contacto_emergencia TEXT,
    registrado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    registrado_por_nombre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_historial_bajas_alumno ON public.historial_bajas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_historial_bajas_fecha ON public.historial_bajas(fecha_baja);

-- Políticas RLS para Historial de Bajas
ALTER TABLE public.historial_bajas ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura historial bajas para autenticados' AND tablename = 'historial_bajas') THEN
        CREATE POLICY "Lectura historial bajas para autenticados" ON public.historial_bajas FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestion historial bajas para autenticados' AND tablename = 'historial_bajas') THEN
        CREATE POLICY "Gestion historial bajas para autenticados" ON public.historial_bajas FOR ALL USING (true);
    END IF;
END $$;

-- 3. Tabla: Torneos
CREATE TABLE IF NOT EXISTS public.torneos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    lugar TEXT,
    descripcion TEXT,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    creado_por_nombre TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_torneos_fecha ON public.torneos(fecha);

-- 4. Tabla: Participaciones de Alumnos en Torneos
CREATE TABLE IF NOT EXISTS public.torneo_participaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torneo_id UUID NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    categoria TEXT,
    puesto_premio TEXT NOT NULL,
    medalla TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_torneo_participaciones_torneo ON public.torneo_participaciones(torneo_id);
CREATE INDEX IF NOT EXISTS idx_torneo_participaciones_alumno ON public.torneo_participaciones(alumno_id);

-- Políticas RLS para Torneos y Participaciones
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo_participaciones ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura torneos' AND tablename = 'torneos') THEN
        CREATE POLICY "Lectura torneos" ON public.torneos FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestion torneos' AND tablename = 'torneos') THEN
        CREATE POLICY "Gestion torneos" ON public.torneos FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura torneo_participaciones' AND tablename = 'torneo_participaciones') THEN
        CREATE POLICY "Lectura torneo_participaciones" ON public.torneo_participaciones FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Gestion torneo_participaciones' AND tablename = 'torneo_participaciones') THEN
        CREATE POLICY "Gestion torneo_participaciones" ON public.torneo_participaciones FOR ALL USING (true);
    END IF;
END $$;
