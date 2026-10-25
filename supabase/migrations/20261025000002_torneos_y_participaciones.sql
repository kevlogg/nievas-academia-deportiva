-- Migración: Nievas Academia Deportiva - Torneos y Participaciones de Alumnos
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
CREATE INDEX IF NOT EXISTS idx_torneos_fecha ON public.torneos(fecha);

-- Políticas RLS
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo_participaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura torneos para usuarios autenticados"
ON public.torneos FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Gestion torneos para usuarios autenticados"
ON public.torneos FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura torneo_participaciones para usuarios autenticados"
ON public.torneo_participaciones FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Gestion torneo_participaciones para usuarios autenticados"
ON public.torneo_participaciones FOR ALL
USING (auth.role() = 'authenticated');
