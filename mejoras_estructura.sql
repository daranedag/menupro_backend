-- ============================================================================
-- MEJORAS CRÍTICAS Y RECOMENDADAS PARA LA ESTRUCTURA
-- ============================================================================

-- ============================================================================
-- 1. CRÍTICO: Agregar email a user_profiles
-- ============================================================================
-- Actualmente user_profiles no tiene email, pero lo necesitamos para identificar usuarios
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Poblar emails desde auth.users
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
  AND up.email IS NULL;

-- Hacer que sea NOT NULL después de poblar
-- ALTER TABLE user_profiles ALTER COLUMN email SET NOT NULL;

-- ============================================================================
-- 2. IMPORTANTE: Índices únicos en slugs
-- ============================================================================
-- Verificar si ya existen estos índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_slug_unique 
ON restaurants(slug) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_menus_slug_unique 
ON menus(restaurant_id, slug);

-- ============================================================================
-- 3. IMPORTANTE: Restricción para evitar chains anidadas
-- ============================================================================
-- Un restaurant con parent_restaurant_id NO puede ser parent de otro
CREATE OR REPLACE FUNCTION check_no_nested_chains()
RETURNS TRIGGER AS $$
BEGIN
  -- Si este restaurant tiene un parent, no puede ser parent de otros
  IF NEW.parent_restaurant_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM restaurants 
      WHERE parent_restaurant_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Un restaurant que es sucursal no puede tener sucursales propias';
    END IF;
  END IF;
  
  -- Si intentan hacer que este restaurant sea parent de otro que ya tiene hijos
  IF NEW.parent_restaurant_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = NEW.parent_restaurant_id
        AND r.parent_restaurant_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'No se pueden crear chains de más de 2 niveles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_nested_chains ON restaurants;
CREATE TRIGGER trigger_check_nested_chains
  BEFORE INSERT OR UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION check_no_nested_chains();

-- ============================================================================
-- 4. RECOMENDADO: Campo de moneda para internacionalización
-- ============================================================================
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Agregar constraint para monedas válidas (drop first if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_currency'
  ) THEN
    ALTER TABLE restaurants
    ADD CONSTRAINT check_valid_currency 
    CHECK (currency IN ('USD', 'EUR', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'BRL'));
  END IF;
END $$;

-- ============================================================================
-- 5. RECOMENDADO: Soft delete cascading
-- ============================================================================
-- Cuando se elimina un restaurant (soft delete), marcar sus recursos
CREATE OR REPLACE FUNCTION cascade_soft_delete_restaurant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Marcar menús como no publicados
    UPDATE menus
    SET is_published = false, updated_at = now()
    WHERE restaurant_id = NEW.id;
    
    -- Opcional: desactivar suscripción
    UPDATE restaurant_subscriptions
    SET active = false
    WHERE restaurant_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cascade_soft_delete ON restaurants;
CREATE TRIGGER trigger_cascade_soft_delete
  AFTER UPDATE ON restaurants
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION cascade_soft_delete_restaurant();

-- ============================================================================
-- 6. RECOMENDADO: Índices de rendimiento faltantes
-- ============================================================================
-- Para queries de restaurants por owner
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_active 
ON restaurants(owner_id, deleted_at, active);

-- Para queries de menús publicados
CREATE INDEX IF NOT EXISTS idx_menus_restaurant_published 
ON menus(restaurant_id, is_published);

-- Para búsqueda de items por sección
CREATE INDEX IF NOT EXISTS idx_menu_items_section_order 
ON menu_items(section_id, order_index, available);

-- Para auditoría por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs(user_id, created_at DESC);

-- Para suscripciones activas
CREATE INDEX IF NOT EXISTS idx_subscriptions_active 
ON restaurant_subscriptions(restaurant_id, active, expires_at);

-- ============================================================================
-- 7. OPCIONAL: Campos adicionales útiles
-- ============================================================================
-- Tracking de último acceso a restaurant
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Email de contacto del restaurant (diferente al owner)
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Website y redes sociales
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS website TEXT;

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS instagram TEXT;

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS facebook TEXT;

-- ============================================================================
-- 8. VERIFICACIÓN: Constraints de precios
-- ============================================================================
-- Asegurar que los precios sean positivos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_price_positive'
  ) THEN
    ALTER TABLE menu_items
    ADD CONSTRAINT check_price_positive 
    CHECK (price >= 0);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_discount_valid'
  ) THEN
    ALTER TABLE menu_items
    ADD CONSTRAINT check_discount_valid 
    CHECK (
      (discount_type = 'none' AND discount_value = 0) OR
      (discount_type = 'percentage' AND discount_value >= 0 AND discount_value <= 100) OR
      (discount_type = 'fixed' AND discount_value >= 0)
    );
  END IF;
END $$;

-- Lo mismo para sections
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_section_discount_valid'
  ) THEN
    ALTER TABLE menu_sections
    ADD CONSTRAINT check_section_discount_valid 
    CHECK (
      (discount_type = 'none' AND discount_value = 0) OR
      (discount_type = 'percentage' AND discount_value >= 0 AND discount_value <= 100) OR
      (discount_type = 'fixed' AND discount_value >= 0)
    );
  END IF;
END $$;

-- ============================================================================
-- 9. SEGURIDAD: Verificar que RLS está habilitado
-- ============================================================================
-- Listar tablas sin RLS habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Si alguna tabla NO tiene RLS, habilitarlo
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RESUMEN DE PRIORIDADES
-- ============================================================================
/*
CRÍTICO (implementar YA):
1. ✅ Agregar campo email a user_profiles
2. ✅ Índices únicos en slugs
3. ✅ Prevenir chains anidadas (trigger)

IMPORTANTE (implementar pronto):
4. ✅ Campo currency para internacionalización
5. ✅ Soft delete cascading
6. ✅ Índices de rendimiento

OPCIONAL (nice to have):
7. ⚪ Campos adicionales (website, redes sociales)
8. ⚪ Constraints de validación de precios
9. ⚪ Verificación de RLS

PRÓXIMOS PASOS:
- Ejecutar secciones 1-6 en orden
- Probar constraints con datos reales
- Verificar performance de índices con EXPLAIN ANALYZE
*/
