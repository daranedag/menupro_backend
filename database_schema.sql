-- ============================================================================
-- MenuPro Database Schema
-- PostgreSQL + Supabase
-- Fecha: Diciembre 2025
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM (
  'platform_admin',
  'restaurant_owner'
);

-- Tipo de descuento
CREATE TYPE discount_type AS ENUM (
  'none',
  'percentage',
  'fixed'
);

-- ============================================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 User Profiles (extiende auth.users de Supabase)
-- ---------------------------------------------------------------------------
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'restaurant_owner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.2 Tiers / Planes de suscripción
-- ---------------------------------------------------------------------------
CREATE TABLE tiers (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  max_menus int NOT NULL, -- -1 para ilimitado
  price_per_additional_menu numeric(10,2) DEFAULT 0, -- Precio por menú adicional
  customization_level int NOT NULL,
  allows_pdf boolean DEFAULT false,
  allows_custom_fonts boolean DEFAULT false,
  allows_images boolean DEFAULT false,
  allows_multiple_locations boolean DEFAULT false, -- Para cadenas
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.3 Restaurants
-- ---------------------------------------------------------------------------
CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_restaurant_id uuid REFERENCES restaurants(id), -- Para sucursales/cadenas
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  location_name text, -- Ej: "Sucursal Centro", "Madrid", "Bogotá Norte"
  logo_url text,
  primary_color text DEFAULT '#000000',
  secondary_color text DEFAULT '#FFFFFF',
  phone text,
  address text,
  city text,
  country text,
  timezone text DEFAULT 'UTC',
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.4 Restaurant Subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE restaurant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tier_id int NOT NULL REFERENCES tiers(id),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- NULL = ilimitado
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.5 Menús / Cartas
-- ---------------------------------------------------------------------------
CREATE TABLE menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  qr_code_url text,
  view_count int DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.6 Secciones del menú
-- ---------------------------------------------------------------------------
CREATE TABLE menu_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index int NOT NULL,
  discount_type discount_type DEFAULT 'none',
  discount_value numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.7 Platos / Items del menú
-- ---------------------------------------------------------------------------
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  image_url text,
  discount_type discount_type DEFAULT 'none',
  discount_value numeric(10,2) DEFAULT 0,
  available boolean DEFAULT true,
  order_index int NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2.8 Audit Logs (Auditoría)
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. CONSTRAINTS
-- ============================================================================

-- Solo una suscripción activa por restaurant
CREATE UNIQUE INDEX one_active_subscription_per_restaurant 
ON restaurant_subscriptions (restaurant_id) 
WHERE active = true;

-- Slug único por restaurant en menus
CREATE UNIQUE INDEX menus_restaurant_slug 
ON menus(restaurant_id, slug);

-- Validación de descuentos en secciones
ALTER TABLE menu_sections ADD CONSTRAINT valid_section_discount
  CHECK (
    (discount_type = 'none' AND discount_value = 0) OR
    (discount_type = 'percentage' AND discount_value BETWEEN 0 AND 100) OR
    (discount_type = 'fixed' AND discount_value >= 0)
  );

-- Validación de descuentos en platos
ALTER TABLE menu_items ADD CONSTRAINT valid_item_discount
  CHECK (
    (discount_type = 'none' AND discount_value = 0) OR
    (discount_type = 'percentage' AND discount_value BETWEEN 0 AND 100) OR
    (discount_type = 'fixed' AND discount_value >= 0)
  );

-- Precio positivo en platos
ALTER TABLE menu_items ADD CONSTRAINT positive_price
  CHECK (price >= 0);

-- Order index positivo
ALTER TABLE menu_sections ADD CONSTRAINT positive_order_index
  CHECK (order_index >= 0);

ALTER TABLE menu_items ADD CONSTRAINT positive_order_index
  CHECK (order_index >= 0);

-- ============================================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Restaurants
CREATE INDEX idx_restaurants_owner ON restaurants(owner_id) WHERE active = true;
CREATE INDEX idx_restaurants_slug ON restaurants(slug) WHERE active = true;
CREATE INDEX idx_restaurants_deleted ON restaurants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_restaurants_parent ON restaurants(parent_restaurant_id) WHERE parent_restaurant_id IS NOT NULL;
CREATE INDEX idx_restaurants_city ON restaurants(city) WHERE active = true;

-- Subscriptions
CREATE INDEX idx_subscriptions_restaurant ON restaurant_subscriptions(restaurant_id, active);
CREATE INDEX idx_subscriptions_active ON restaurant_subscriptions(active, expires_at);

-- Menus
CREATE INDEX idx_menus_restaurant ON menus(restaurant_id) WHERE is_published = true;
CREATE INDEX idx_menus_published ON menus(is_published, published_at);
CREATE INDEX idx_menus_slug ON menus(restaurant_id, slug);

-- Sections
CREATE INDEX idx_sections_menu ON menu_sections(menu_id, order_index);

-- Items
CREATE INDEX idx_items_section ON menu_items(section_id, order_index) WHERE available = true;
CREATE INDEX idx_items_available ON menu_items(available);

-- Audit logs
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id, created_at);

-- ============================================================================
-- 5. FUNCIONES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 Función para actualizar updated_at automáticamente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 5.2 Función para calcular precio final con descuentos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_final_price(
  item_price numeric,
  item_discount_type discount_type,
  item_discount_value numeric,
  section_discount_type discount_type,
  section_discount_value numeric
)
RETURNS numeric AS $$
DECLARE
  final_price numeric := item_price;
BEGIN
  -- Aplicar descuento de plato primero (tiene prioridad)
  IF item_discount_type = 'percentage' THEN
    final_price := final_price * (1 - item_discount_value / 100);
  ELSIF item_discount_type = 'fixed' THEN
    final_price := final_price - item_discount_value;
  -- Si no hay descuento en plato, aplicar descuento de sección
  ELSIF section_discount_type = 'percentage' THEN
    final_price := final_price * (1 - section_discount_value / 100);
  ELSIF section_discount_type = 'fixed' THEN
    final_price := final_price - section_discount_value;
  END IF;
  
  -- El precio final no puede ser negativo
  RETURN GREATEST(final_price, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 5.3 Función para generar slug único
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_unique_slug(base_text text, table_name text, column_name text)
RETURNS text AS $$
DECLARE
  slug text;
  counter int := 0;
  temp_slug text;
BEGIN
  -- Convertir a slug básico: lowercase, reemplazar espacios y caracteres especiales
  slug := lower(trim(base_text));
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '-+', '-', 'g');
  slug := trim(both '-' from slug);
  
  temp_slug := slug;
  
  -- Verificar unicidad y agregar contador si es necesario
  WHILE EXISTS (
    SELECT 1 FROM restaurants WHERE slug = temp_slug
  ) OR EXISTS (
    SELECT 1 FROM menus WHERE slug = temp_slug
  ) LOOP
    counter := counter + 1;
    temp_slug := slug || '-' || counter;
  END LOOP;
  
  RETURN temp_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Trigger para updated_at en user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at en restaurants
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at en menus
CREATE TRIGGER update_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at en menu_sections
CREATE TRIGGER update_menu_sections_updated_at
  BEFORE UPDATE ON menu_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at en menu_items
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger para establecer published_at cuando se publica un menú
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND OLD.is_published = false THEN
    NEW.published_at = now();
  ELSIF NEW.is_published = false THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_menu_published_at
  BEFORE UPDATE ON menus
  FOR EACH ROW
  EXECUTE FUNCTION set_published_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activar RLS en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7.1 Policies - User Profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Platform admins can view all profiles"
ON user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- ---------------------------------------------------------------------------
-- 7.2 Policies - Restaurants
-- ---------------------------------------------------------------------------
CREATE POLICY "Owners can manage their restaurants"
ON restaurants FOR ALL
USING (owner_id = auth.uid());

CREATE POLICY "Platform admins can view all restaurants"
ON restaurants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- ---------------------------------------------------------------------------
-- 7.3 Policies - Restaurant Subscriptions
-- ---------------------------------------------------------------------------
CREATE POLICY "Owners can view their subscriptions"
ON restaurant_subscriptions FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Platform admins can manage all subscriptions"
ON restaurant_subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- ---------------------------------------------------------------------------
-- 7.4 Policies - Menus
-- ---------------------------------------------------------------------------
CREATE POLICY "Owners can manage their menus"
ON menus FOR ALL
USING (
  restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view published menus"
ON menus FOR SELECT
USING (is_published = true);

CREATE POLICY "Platform admins can view all menus"
ON menus FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- ---------------------------------------------------------------------------
-- 7.5 Policies - Menu Sections
-- ---------------------------------------------------------------------------
CREATE POLICY "Owners can manage their sections"
ON menu_sections FOR ALL
USING (
  menu_id IN (
    SELECT m.id FROM menus m
    JOIN restaurants r ON r.id = m.restaurant_id
    WHERE r.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view sections of published menus"
ON menu_sections FOR SELECT
USING (
  menu_id IN (
    SELECT id FROM menus WHERE is_published = true
  )
);

-- ---------------------------------------------------------------------------
-- 7.6 Policies - Menu Items
-- ---------------------------------------------------------------------------
CREATE POLICY "Owners can manage their items"
ON menu_items FOR ALL
USING (
  section_id IN (
    SELECT ms.id
    FROM menu_sections ms
    JOIN menus m ON m.id = ms.menu_id
    JOIN restaurants r ON r.id = m.restaurant_id
    WHERE r.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view items of published menus"
ON menu_items FOR SELECT
USING (
  section_id IN (
    SELECT ms.id
    FROM menu_sections ms
    JOIN menus m ON m.id = ms.menu_id
    WHERE m.is_published = true
  )
);

-- ---------------------------------------------------------------------------
-- 7.7 Policies - Audit Logs
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view their own audit logs"
ON audit_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Platform admins can view all audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
);

-- ============================================================================
-- 8. DATOS INICIALES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 Tiers / Planes
-- ---------------------------------------------------------------------------
INSERT INTO tiers (name, max_menus, price_per_additional_menu, customization_level, allows_pdf, allows_custom_fonts, allows_images, allows_multiple_locations)
VALUES
  ('free', 1, 0, 0, false, false, false, false),
  ('basic', 1, 0, 1, false, false, true, false),
  ('pro', 5, 0, 2, true, false, true, false),
  ('premium', -1, 0, 3, true, true, true, false),
  ('chain', 1, 5.00, 3, true, true, true, true) -- Base: 1 menú, +$5 por menú adicional
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 9. VISTAS ÚTILES (OPCIONAL)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 9.1 Vista para menús con información del restaurant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW menus_with_restaurant AS
SELECT 
  m.id,
  m.name AS menu_name,
  m.slug AS menu_slug,
  m.description,
  m.is_published,
  m.published_at,
  m.qr_code_url,
  m.view_count,
  m.last_viewed_at,
  r.id AS restaurant_id,
  r.name AS restaurant_name,
  r.slug AS restaurant_slug,
  r.logo_url,
  r.primary_color,
  r.secondary_color,
  r.phone,
  r.address,
  m.created_at,
  m.updated_at
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE r.active = true AND r.deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 9.2 Vista para platos con precio final calculado
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW menu_items_with_final_price AS
SELECT 
  mi.id,
  mi.section_id,
  mi.name,
  mi.description,
  mi.price AS original_price,
  mi.discount_type AS item_discount_type,
  mi.discount_value AS item_discount_value,
  ms.discount_type AS section_discount_type,
  ms.discount_value AS section_discount_value,
  calculate_final_price(
    mi.price,
    mi.discount_type,
    mi.discount_value,
    ms.discount_type,
    ms.discount_value
  ) AS final_price,
  mi.image_url,
  mi.available,
  mi.order_index,
  ms.name AS section_name,
  ms.menu_id
FROM menu_items mi
JOIN menu_sections ms ON ms.id = mi.section_id;

-- ---------------------------------------------------------------------------
-- 9.3 Vista para suscripciones activas con detalles del tier
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW active_subscriptions AS
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
-- 10. FUNCIONES HELPER ADICIONALES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 10.1 Función para verificar límite de menús según tier
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_menu_limit(p_restaurant_id uuid)
RETURNS boolean AS $$
DECLARE
  v_max_menus int;
  v_current_count int;
BEGIN
  -- Obtener el límite de menús del tier activo
  SELECT t.max_menus INTO v_max_menus
  FROM restaurant_subscriptions rs
  JOIN tiers t ON t.id = rs.tier_id
  WHERE rs.restaurant_id = p_restaurant_id 
    AND rs.active = true
  LIMIT 1;
  
  -- Si no hay suscripción, no permitir
  IF v_max_menus IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si es ilimitado (-1), siempre permitir
  IF v_max_menus = -1 THEN
    RETURN true;
  END IF;
  
  -- Contar menús existentes
  SELECT COUNT(*) INTO v_current_count
  FROM menus
  WHERE restaurant_id = p_restaurant_id;
  
  -- Verificar si está dentro del límite
  RETURN v_current_count < v_max_menus;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 10.2 Función para registrar auditoría
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity, p_entity_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 10.3 Función para calcular costo de suscripción según menús
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_subscription_cost(p_restaurant_id uuid)
RETURNS numeric AS $$
DECLARE
  v_tier_id int;
  v_max_menus int;
  v_price_per_additional numeric;
  v_menu_count int;
  v_base_price numeric := 0; -- Aquí irías el precio base del tier (lo defines en tu backend)
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
  
  -- Contar menús actuales
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

-- ---------------------------------------------------------------------------
-- 10.4 Función para obtener todas las sucursales de una cadena
-- ---------------------------------------------------------------------------
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

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
REGLAS DE NEGOCIO A IMPLEMENTAR EN EL BACKEND:

1. Validar max_menus según tier antes de crear un nuevo menú
   - Usar la función check_menu_limit()

2. Generar QR code solo cuando is_published = true
   - El trigger set_published_at ya maneja published_at

3. Aplicar descuento en cascada:
   - Prioridad: Descuento de plato > Descuento de sección > Sin descuento
   - Usar la función calculate_final_price() o la vista menu_items_with_final_price

4. Soft delete para restaurants:
   - Usar deleted_at en lugar de DELETE físico
   - Las queries deben filtrar por deleted_at IS NULL

5. Expiración de suscripciones:
   - Verificar expires_at antes de permitir operaciones
   - NULL en expires_at = suscripción ilimitada

6. Generación de slugs:
   - Usar la función generate_unique_slug() para evitar duplicados

7. Order index:
   - Mantener consistencia en order_index al agregar/eliminar items
   - Implementar lógica de reordenamiento en el backend

8. QR Codes:
   - URL pública: https://tudominio.com/menu/{restaurant_slug}/{menu_slug}
   - Almacenar qr_code_url después de generarlo

9. Analytics:
   - Incrementar view_count cuando se visualice un menú
   - Actualizar last_viewed_at

10. Validaciones de tier:
    - Antes de permitir subida de imágenes, verificar allows_images
    - Antes de generar PDF, verificar allows_pdf
    - Antes de aplicar custom fonts, verificar allows_custom_fonts
    - Antes de crear sucursales, verificar allows_multiple_locations

11. CADENAS DE RESTAURANTES (Nuevo):
    - Modelo: Un restaurant "padre" (parent_restaurant_id = NULL)
    - Sucursales: Restaurants "hijos" con parent_restaurant_id apuntando al padre
    - Cada sucursal puede tener su propio menú diferente
    - La suscripción se calcula sobre el restaurant padre
    - Usar calculate_subscription_cost() para facturación dinámica
    
    Ejemplo de estructura:
    - "Burger King" (padre, tier: chain)
      ├── "Burger King Centro" (sucursal con menú A)
      ├── "Burger King Norte" (sucursal con menú B)
      └── "Burger King Sur" (sucursal con menú C)
    
    Costo: Precio base + (2 menús adicionales × $5) = Base + $10

12. PRICING PARA TIER "CHAIN":
    - max_menus: Cantidad incluida en el precio base (ej: 1)
    - price_per_additional_menu: Precio por cada menú extra (ej: $5)
    - Ejemplo: Base $50 incluye 1 menú, cada adicional $5
      * 3 menús = $50 + (2 × $5) = $60/mes
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
