-- ============================================================================
-- MIGRACIÓN: Soporte para Cadenas de Restaurantes
-- Fecha: Diciembre 2025
-- ============================================================================
-- Este script agrega las columnas y funcionalidades necesarias para soportar
-- cadenas de restaurantes con múltiples ubicaciones y pricing variable.
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNAS A TIERS
-- ============================================================================

-- Agregar precio por menú adicional
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tiers' AND column_name = 'price_per_additional_menu'
  ) THEN
    ALTER TABLE tiers ADD COLUMN price_per_additional_menu numeric(10,2) DEFAULT 0;
    RAISE NOTICE 'Columna price_per_additional_menu agregada a tiers';
  ELSE
    RAISE NOTICE 'Columna price_per_additional_menu ya existe en tiers';
  END IF;
END $$;

-- Agregar flag para múltiples ubicaciones
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tiers' AND column_name = 'allows_multiple_locations'
  ) THEN
    ALTER TABLE tiers ADD COLUMN allows_multiple_locations boolean DEFAULT false;
    RAISE NOTICE 'Columna allows_multiple_locations agregada a tiers';
  ELSE
    RAISE NOTICE 'Columna allows_multiple_locations ya existe en tiers';
  END IF;
END $$;

-- ============================================================================
-- 2. AGREGAR COLUMNAS A RESTAURANTS
-- ============================================================================

-- Agregar referencia al restaurant padre (para sucursales)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'parent_restaurant_id'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN parent_restaurant_id uuid REFERENCES restaurants(id);
    RAISE NOTICE 'Columna parent_restaurant_id agregada a restaurants';
  ELSE
    RAISE NOTICE 'Columna parent_restaurant_id ya existe en restaurants';
  END IF;
END $$;

-- Agregar nombre de ubicación
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'location_name'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN location_name text;
    RAISE NOTICE 'Columna location_name agregada a restaurants';
  ELSE
    RAISE NOTICE 'Columna location_name ya existe en restaurants';
  END IF;
END $$;

-- Agregar ciudad
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'city'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN city text;
    RAISE NOTICE 'Columna city agregada a restaurants';
  ELSE
    RAISE NOTICE 'Columna city ya existe en restaurants';
  END IF;
END $$;

-- Agregar país
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'country'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN country text;
    RAISE NOTICE 'Columna country agregada a restaurants';
  ELSE
    RAISE NOTICE 'Columna country ya existe en restaurants';
  END IF;
END $$;

-- ============================================================================
-- 3. CREAR ÍNDICES NUEVOS
-- ============================================================================

-- Índice para búsqueda de sucursales
CREATE INDEX IF NOT EXISTS idx_restaurants_parent 
ON restaurants(parent_restaurant_id) 
WHERE parent_restaurant_id IS NOT NULL;

-- Índice para búsqueda por ciudad
CREATE INDEX IF NOT EXISTS idx_restaurants_city 
ON restaurants(city) 
WHERE active = true;

-- ============================================================================
-- 4. ACTUALIZAR TIERS EXISTENTES
-- ============================================================================

-- Actualizar tiers existentes con los nuevos campos (solo si no tienen valores)
UPDATE tiers 
SET 
  price_per_additional_menu = 0,
  allows_multiple_locations = false
WHERE price_per_additional_menu IS NULL 
   OR allows_multiple_locations IS NULL;

-- ============================================================================
-- 5. AGREGAR NUEVO TIER "CHAIN"
-- ============================================================================

INSERT INTO tiers (
  name, 
  max_menus, 
  price_per_additional_menu, 
  customization_level, 
  allows_pdf, 
  allows_custom_fonts, 
  allows_images, 
  allows_multiple_locations
)
VALUES (
  'chain', 
  1, 
  5.00, 
  3, 
  true, 
  true, 
  true, 
  true
)
ON CONFLICT (name) DO UPDATE SET
  max_menus = EXCLUDED.max_menus,
  price_per_additional_menu = EXCLUDED.price_per_additional_menu,
  customization_level = EXCLUDED.customization_level,
  allows_pdf = EXCLUDED.allows_pdf,
  allows_custom_fonts = EXCLUDED.allows_custom_fonts,
  allows_images = EXCLUDED.allows_images,
  allows_multiple_locations = EXCLUDED.allows_multiple_locations;

-- ============================================================================
-- 6. ACTUALIZAR VISTA active_subscriptions
-- ============================================================================

-- Primero eliminar la vista existente para evitar conflictos de columnas
DROP VIEW IF EXISTS active_subscriptions;

-- Recrear la vista con las nuevas columnas
CREATE VIEW active_subscriptions AS
SELECT 
  rs.id,
  rs.restaurant_id,
  r.name AS restaurant_name,
  r.slug AS restaurant_slug,
  t.id AS tier_id,
  t.name AS tier_name,
  t.max_menus,
  t.price_per_additional_menu,
  t.customization_level,
  t.allows_pdf,
  t.allows_custom_fonts,
  t.allows_images,
  t.allows_multiple_locations,
  rs.started_at,
  rs.expires_at,
  CASE 
    WHEN rs.expires_at IS NULL THEN true
    WHEN rs.expires_at > now() THEN true
    ELSE false
  END AS is_valid
FROM restaurant_subscriptions rs
JOIN restaurants r ON r.id = rs.restaurant_id
JOIN tiers t ON t.id = rs.tier_id
WHERE rs.active = true AND r.active = true;

-- ============================================================================
-- 7. CREAR FUNCIÓN: calculate_subscription_cost
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_subscription_cost(p_restaurant_id uuid)
RETURNS numeric AS $$
DECLARE
  v_tier_id int;
  v_max_menus int;
  v_price_per_additional numeric;
  v_menu_count int;
  v_base_price numeric := 0; -- Precio base del tier (definir en backend)
  v_additional_menus int := 0;
BEGIN
  -- Obtener datos del tier activo
  SELECT t.id, t.max_menus, t.price_per_additional_menu 
  INTO v_tier_id, v_max_menus, v_price_per_additional
  FROM restaurant_subscriptions rs
  JOIN tiers t ON t.id = rs.tier_id
  WHERE rs.restaurant_id = p_restaurant_id 
    AND rs.active = true
  LIMIT 1;
  
  -- Si no hay suscripción, retornar 0
  IF v_tier_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Contar menús actuales del restaurant
  SELECT COUNT(*) INTO v_menu_count
  FROM menus
  WHERE restaurant_id = p_restaurant_id;
  
  -- Calcular menús adicionales
  IF v_max_menus > 0 AND v_menu_count > v_max_menus THEN
    v_additional_menus := v_menu_count - v_max_menus;
  END IF;
  
  -- Costo total = base + (adicionales * precio_por_adicional)
  RETURN v_base_price + (v_additional_menus * v_price_per_additional);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_subscription_cost(uuid) IS 
'Calcula el costo mensual de suscripción basado en la cantidad de menús. 
Incluye el costo base (definir en backend) más el cargo por menús adicionales.';

-- ============================================================================
-- 8. CREAR FUNCIÓN: get_chain_locations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chain_locations(p_parent_restaurant_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  location_name text,
  city text,
  address text,
  menu_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.location_name,
    r.city,
    r.address,
    COUNT(m.id) AS menu_count
  FROM restaurants r
  LEFT JOIN menus m ON m.restaurant_id = r.id
  WHERE r.parent_restaurant_id = p_parent_restaurant_id
    AND r.active = true
    AND r.deleted_at IS NULL
  GROUP BY r.id, r.name, r.location_name, r.city, r.address
  ORDER BY r.created_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_chain_locations(uuid) IS 
'Obtiene todas las sucursales de un restaurant padre (cadena), 
incluyendo el conteo de menús por ubicación.';

-- ============================================================================
-- 9. FUNCIÓN HELPER: Contar menús totales de una cadena
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chain_total_menus(p_parent_restaurant_id uuid)
RETURNS int AS $$
DECLARE
  v_total int;
BEGIN
  -- Contar menús del padre + todas las sucursales
  SELECT COUNT(*) INTO v_total
  FROM menus m
  JOIN restaurants r ON r.id = m.restaurant_id
  WHERE r.id = p_parent_restaurant_id 
     OR r.parent_restaurant_id = p_parent_restaurant_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_chain_total_menus(uuid) IS 
'Cuenta todos los menús de un restaurant incluyendo sus sucursales.';

-- ============================================================================
-- 10. VERIFICACIÓN DE MIGRACIÓN
-- ============================================================================

-- Verificar que las columnas se agregaron correctamente
DO $$
DECLARE
  v_tiers_cols int;
  v_restaurants_cols int;
  v_chain_tier_exists boolean;
BEGIN
  -- Verificar columnas en tiers
  SELECT COUNT(*) INTO v_tiers_cols
  FROM information_schema.columns
  WHERE table_name = 'tiers' 
    AND column_name IN ('price_per_additional_menu', 'allows_multiple_locations');
  
  -- Verificar columnas en restaurants
  SELECT COUNT(*) INTO v_restaurants_cols
  FROM information_schema.columns
  WHERE table_name = 'restaurants' 
    AND column_name IN ('parent_restaurant_id', 'location_name', 'city', 'country');
  
  -- Verificar tier chain
  SELECT EXISTS (
    SELECT 1 FROM tiers WHERE name = 'chain'
  ) INTO v_chain_tier_exists;
  
  -- Mostrar resultados
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Columnas agregadas a tiers: %/2', v_tiers_cols;
  RAISE NOTICE 'Columnas agregadas a restaurants: %/4', v_restaurants_cols;
  RAISE NOTICE 'Tier "chain" existe: %', v_chain_tier_exists;
  
  IF v_tiers_cols = 2 AND v_restaurants_cols = 4 AND v_chain_tier_exists THEN
    RAISE NOTICE '✓ Migración completada exitosamente';
  ELSE
    RAISE WARNING '⚠ Revisa los mensajes anteriores para ver qué falta';
  END IF;
  RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

/*
PRÓXIMOS PASOS:

1. Ejecuta este script en Supabase SQL Editor
2. Verifica el mensaje de verificación al final
3. Prueba las nuevas funciones:
   
   -- Ejemplo: Calcular costo de suscripción
   SELECT calculate_subscription_cost('tu-restaurant-uuid');
   
   -- Ejemplo: Ver sucursales de una cadena
   SELECT * FROM get_chain_locations('restaurant-padre-uuid');
   
   -- Ejemplo: Contar menús totales de una cadena
   SELECT get_chain_total_menus('restaurant-padre-uuid');

4. Actualiza tu backend para usar las nuevas columnas y funciones

NOTAS IMPORTANTES:
- Esta migración es NO destructiva (no borra datos)
- Usa IF NOT EXISTS para evitar errores si ya ejecutaste parte del script
- Los datos existentes no se modifican
- Los nuevos campos tienen valores por defecto seguros
*/
