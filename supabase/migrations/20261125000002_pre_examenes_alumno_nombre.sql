-- Migración: Nievas Academia Deportiva - Columna alumno_nombre en pre_examenes
ALTER TABLE public.pre_examenes ADD COLUMN IF NOT EXISTS alumno_nombre TEXT;
