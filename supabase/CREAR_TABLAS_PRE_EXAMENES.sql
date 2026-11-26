-- ======================================================================================
-- MIGRACIÓN COMPLETA Y DEFINITIVA: PRE-EXÁMENES Y MESAS DE EVALUACIÓN
-- Nievas Academia Deportiva
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard/project/ydophhbpkfurlspxczug/sql)
-- ======================================================================================

-- 1. Crear tabla de Mesas/Fechas de Pre-Examen
CREATE TABLE IF NOT EXISTS public.pre_examen_sesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    profesor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    profesor_nombre TEXT,
    estado TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'FINALIZADA')),
    alumnos_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_pre_examen_sesiones_fecha ON public.pre_examen_sesiones(fecha);

-- 2. Crear tabla de Evaluaciones de Pre-Examen
CREATE TABLE IF NOT EXISTS public.pre_examenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID REFERENCES public.pre_examen_sesiones(id) ON DELETE SET NULL,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    alumno_nombre TEXT,
    profesor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    profesor_nombre TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cinturon_actual TEXT NOT NULL,
    subcategoria_actual TEXT,
    cinturon_postula TEXT,
    subcategoria_postula TEXT,
    kihon_nota TEXT CHECK (kihon_nota IS NULL OR kihon_nota IN ('ROJO', 'AMARILLO', 'VERDE')),
    kata_nota TEXT CHECK (kata_nota IS NULL OR kata_nota IN ('ROJO', 'AMARILLO', 'VERDE')),
    kumite_nota TEXT CHECK (kumite_nota IS NULL OR kumite_nota IN ('ROJO', 'AMARILLO', 'VERDE')),
    resultado_promedio TEXT CHECK (resultado_promedio IS NULL OR resultado_promedio IN ('ROJO', 'AMARILLO', 'VERDE')),
    resultado_score NUMERIC(3, 2) DEFAULT 0.00,
    resultado_estado TEXT CHECK (resultado_estado IS NULL OR resultado_estado IN ('APROBADO', 'REGULAR', 'A_MEJORAR')),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_pre_examenes_alumno ON public.pre_examenes(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pre_examenes_fecha ON public.pre_examenes(fecha);
CREATE INDEX IF NOT EXISTS idx_pre_examenes_sesion ON public.pre_examenes(sesion_id);

-- 3. Habilitar RLS
ALTER TABLE public.pre_examen_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_examenes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pre_examen_sesiones' AND policyname = 'Lectura pre_examen_sesiones autenticados'
    ) THEN
        CREATE POLICY "Lectura pre_examen_sesiones autenticados"
        ON public.pre_examen_sesiones FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pre_examen_sesiones' AND policyname = 'Gestion pre_examen_sesiones autenticados'
    ) THEN
        CREATE POLICY "Gestion pre_examen_sesiones autenticados"
        ON public.pre_examen_sesiones FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pre_examenes' AND policyname = 'Lectura pre_examenes autenticados'
    ) THEN
        CREATE POLICY "Lectura pre_examenes autenticados"
        ON public.pre_examenes FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pre_examenes' AND policyname = 'Gestion pre_examenes autenticados'
    ) THEN
        CREATE POLICY "Gestion pre_examenes autenticados"
        ON public.pre_examenes FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;
