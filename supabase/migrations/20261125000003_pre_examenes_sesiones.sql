-- Migración: Nievas Academia Deportiva - Mesas y Fechas de Pre-Examen con Lista de Calificación
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

-- Agregar referencia a sesion en pre_examenes
ALTER TABLE public.pre_examenes ADD COLUMN IF NOT EXISTS sesion_id UUID REFERENCES public.pre_examen_sesiones(id) ON DELETE SET NULL;

-- Permitir que las notas sean nulas para calificaciones en progreso
ALTER TABLE public.pre_examenes ALTER COLUMN kihon_nota DROP NOT NULL;
ALTER TABLE public.pre_examenes ALTER COLUMN kata_nota DROP NOT NULL;
ALTER TABLE public.pre_examenes ALTER COLUMN kumite_nota DROP NOT NULL;
ALTER TABLE public.pre_examenes ALTER COLUMN resultado_promedio DROP NOT NULL;
ALTER TABLE public.pre_examenes ALTER COLUMN resultado_score DROP NOT NULL;
ALTER TABLE public.pre_examenes ALTER COLUMN resultado_estado DROP NOT NULL;

-- Políticas RLS para pre_examen_sesiones
ALTER TABLE public.pre_examen_sesiones ENABLE ROW LEVEL SECURITY;

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
END $$;
