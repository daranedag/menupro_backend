-- ============================================================================
-- SCRIPT PARA LIMPIAR TODOS LOS DATOS DE DEMO
-- ============================================================================
-- ADVERTENCIA: Esto eliminará TODOS los datos de las tablas
-- Usa con precaución. Ejecuta cada sección según necesites.
-- ============================================================================

BEGIN;

-- 1. Eliminar datos en orden respetando foreign keys
-- (De hijos a padres)

-- Auditoría
DELETE FROM audit_logs;
RAISE NOTICE 'Eliminados % registros de audit_logs', (SELECT count(*) FROM audit_logs);

-- Items de menú
DELETE FROM menu_items;
RAISE NOTICE 'Eliminados % items de menú', (SELECT count(*) FROM menu_items);

-- Secciones de menú
DELETE FROM menu_sections;
RAISE NOTICE 'Eliminadas % secciones de menú', (SELECT count(*) FROM menu_sections);

-- Menús
DELETE FROM menus;
RAISE NOTICE 'Eliminados % menús', (SELECT count(*) FROM menus);

-- Suscripciones
DELETE FROM restaurant_subscriptions;
RAISE NOTICE 'Eliminadas % suscripciones', (SELECT count(*) FROM restaurant_subscriptions);

-- Restaurantes
DELETE FROM restaurants;
RAISE NOTICE 'Eliminados % restaurantes', (SELECT count(*) FROM restaurants);

-- User profiles (CUIDADO: esto no elimina usuarios de auth.users)
DELETE FROM user_profiles;
RAISE NOTICE 'Eliminados % user profiles', (SELECT count(*) FROM user_profiles);

-- Tiers (OPCIONAL - probablemente quieres mantenerlos)
-- DELETE FROM tiers;
-- RAISE NOTICE 'Eliminados % tiers', (SELECT count(*) FROM tiers);

-- 2. Resetear secuencias si las hay (actualmente no usamos SERIAL)
-- No aplica para este schema

-- 3. Mostrar resumen final
SELECT 
  'audit_logs' as tabla, count(*) as registros FROM audit_logs
UNION ALL
SELECT 'menu_items', count(*) FROM menu_items
UNION ALL
SELECT 'menu_sections', count(*) FROM menu_sections
UNION ALL
SELECT 'menus', count(*) FROM menus
UNION ALL
SELECT 'restaurant_subscriptions', count(*) FROM restaurant_subscriptions
UNION ALL
SELECT 'restaurants', count(*) FROM restaurants
UNION ALL
SELECT 'user_profiles', count(*) FROM user_profiles
UNION ALL
SELECT 'tiers', count(*) FROM tiers;

-- COMMIT; -- Descomenta para confirmar cambios
ROLLBACK; -- Comenta esta línea cuando estés seguro
