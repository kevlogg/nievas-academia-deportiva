-- Migración: Nievas Academia Deportiva - Auto-cierre de Clases Abiertas a las 2HS
-- Regla de negocio: Si pasaron 2 horas desde que se abrió la clase (hora_apertura), se cierra automáticamente (estado = 'FINALIZADA')
-- manteniendo intactos todos los registros de asistencia tomados.

CREATE OR REPLACE FUNCTION public.cerrar_sesiones_expiradas_2hs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cerradas_count INTEGER;
BEGIN
    UPDATE public.sesiones_clase
    SET estado = 'FINALIZADA'
    WHERE estado = 'ABIERTA'
      AND hora_apertura <= timezone('utc', now()) - interval '2 hours';
      
    GET DIAGNOSTICS cerradas_count = ROW_COUNT;
    RETURN cerradas_count;
END;
$$;

COMMENT ON FUNCTION public.cerrar_sesiones_expiradas_2hs() IS 
'Cierra automáticamente todas las sesiones de tatami con estado ABIERTA que tengan más de 2 horas desde su hora_apertura, conservando todas las asistencias registradas.';
