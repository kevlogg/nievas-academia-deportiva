-- Migración: Nievas Academia Deportiva
-- 1. Agregar cinturón Violeta al enum cinturon_karate
-- 2. Agregar columnas subcategoria_actual a alumnos e historial_graduaciones
-- 3. Actualizar registros existentes de Azul a Violeta

DO $$ 
BEGIN
    -- Agregar valor 'Violeta' al tipo enum si existe
    BEGIN
        ALTER TYPE cinturon_karate ADD VALUE IF NOT EXISTS 'Violeta' AFTER 'Verde';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;

-- Columnas de subcategoría (Kyu / Dan)
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS subcategoria_actual TEXT;
ALTER TABLE public.historial_graduaciones ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- Actualizar registros de 'Azul' a 'Violeta'
UPDATE public.alumnos 
SET cinturon_actual = 'Violeta' 
WHERE cinturon_actual::text = 'Azul';

UPDATE public.historial_graduaciones 
SET cinturon = 'Violeta' 
WHERE cinturon::text = 'Azul';
