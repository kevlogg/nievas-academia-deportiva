-- Migración: Nievas Academia Deportiva - Historial de Deserción y Bajas
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

-- Políticas RLS
ALTER TABLE public.historial_bajas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura historial bajas para usuarios autenticados"
ON public.historial_bajas FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Gestion historial bajas para direccion"
ON public.historial_bajas FOR ALL
USING (auth.role() = 'authenticated');
