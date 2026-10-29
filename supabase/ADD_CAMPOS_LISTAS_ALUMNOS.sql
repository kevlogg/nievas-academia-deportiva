-- ======================================================================================
-- NIEVAS ACADEMIA DEPORTIVA - NUEVOS CAMPOS EN LISTAS DE ALUMNOS (DÍAS Y HORARIO)
-- Opcional para ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- Nota: El sistema ya es 100% compatible y funcional con resiliencia en la app.
-- ======================================================================================

ALTER TABLE public.listas_alumnos 
ADD COLUMN IF NOT EXISTS dias_semana INTEGER[] DEFAULT '{}';

ALTER TABLE public.listas_alumnos 
ADD COLUMN IF NOT EXISTS horario TEXT;

ALTER TABLE public.listas_alumnos 
ADD COLUMN IF NOT EXISTS hora_inicio TIME;

ALTER TABLE public.listas_alumnos 
ADD COLUMN IF NOT EXISTS hora_fin TIME;
