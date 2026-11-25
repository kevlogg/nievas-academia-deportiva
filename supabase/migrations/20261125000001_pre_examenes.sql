-- Migración: Nievas Academia Deportiva - Pre-Exámenes Tatami (Evaluación Semáforo Kata, Kihon, Kumite)
CREATE TABLE IF NOT EXISTS public.pre_examenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    profesor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    profesor_nombre TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cinturon_actual TEXT NOT NULL,
    subcategoria_actual TEXT,
    cinturon_postula TEXT,
    subcategoria_postula TEXT,
    kihon_nota TEXT NOT NULL CHECK (kihon_nota IN ('ROJO', 'AMARILLO', 'VERDE')),
    kata_nota TEXT NOT NULL CHECK (kata_nota IN ('ROJO', 'AMARILLO', 'VERDE')),
    kumite_nota TEXT NOT NULL CHECK (kumite_nota IN ('ROJO', 'AMARILLO', 'VERDE')),
    resultado_promedio TEXT NOT NULL CHECK (resultado_promedio IN ('ROJO', 'AMARILLO', 'VERDE')),
    resultado_score NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    resultado_estado TEXT NOT NULL CHECK (resultado_estado IN ('APROBADO', 'REGULAR', 'A_MEJORAR')),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_pre_examenes_alumno ON public.pre_examenes(alumno_id);
CREATE INDEX IF NOT EXISTS idx_pre_examenes_fecha ON public.pre_examenes(fecha);
CREATE INDEX IF NOT EXISTS idx_pre_examenes_profesor ON public.pre_examenes(profesor_id);

-- Políticas RLS
ALTER TABLE public.pre_examenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pre_examenes para usuarios autenticados"
ON public.pre_examenes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Gestion pre_examenes para usuarios autenticados"
ON public.pre_examenes FOR ALL
USING (auth.role() = 'authenticated');
