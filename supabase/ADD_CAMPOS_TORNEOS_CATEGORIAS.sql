-- ======================================================================================
-- MIGRACIÓN OPCIONAL: CATEGORÍAS EN TORNEOS
-- Nievas Academia Deportiva
-- ======================================================================================

-- 1. Agregar columna categorias (array de textos) a public.torneos si no existe
ALTER TABLE public.torneos 
ADD COLUMN IF NOT EXISTS categorias TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Índice GIN para búsquedas eficientes por categoría
CREATE INDEX IF NOT EXISTS idx_torneos_categorias ON public.torneos USING GIN (categorias);

-- NOTA: El sistema cuenta con fallback y serialización retrocompatible automática en
-- el campo descripcion ([CATEGORIAS:...]), por lo que la aplicación funciona al 100%
-- tanto si se corre este script como si no.
