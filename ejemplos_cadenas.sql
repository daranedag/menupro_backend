-- ============================================================================
-- Ejemplos de Uso - Cadenas de Restaurantes
-- ============================================================================

-- ============================================================================
-- 1. CREAR UNA CADENA DE RESTAURANTES
-- ============================================================================

-- Paso 1: Crear el restaurant "padre" (matriz)
INSERT INTO restaurants (
  owner_id,
  name,
  slug,
  location_name,
  city,
  country,
  address,
  phone
) VALUES (
  'uuid-del-owner',
  'Burger King Colombia',
  'burger-king-colombia',
  'Matriz',
  'Bogotá',
  'Colombia',
  'Calle 100 #15-25',
  '+57 1 234 5678'
) RETURNING id;

-- Guardemos el ID devuelto, digamos: 'parent-uuid-123'

-- Paso 2: Asignar suscripción tier "chain"
INSERT INTO restaurant_subscriptions (
  restaurant_id,
  tier_id
) VALUES (
  'parent-uuid-123',
  (SELECT id FROM tiers WHERE name = 'chain')
);

-- Paso 3: Crear sucursales (restaurants "hijos")
INSERT INTO restaurants (
  owner_id,
  parent_restaurant_id,
  name,
  slug,
  location_name,
  city,
  country,
  address,
  phone
) VALUES 
  -- Sucursal Centro
  (
    'uuid-del-owner',
    'parent-uuid-123',
    'Burger King Centro',
    'burger-king-centro-bogota',
    'Centro',
    'Bogotá',
    'Colombia',
    'Carrera 7 #12-34',
    '+57 1 234 5679'
  ),
  -- Sucursal Norte
  (
    'uuid-del-owner',
    'parent-uuid-123',
    'Burger King Unicentro',
    'burger-king-unicentro',
    'Norte',
    'Bogotá',
    'Colombia',
    'Av. 15 #123-45, CC Unicentro',
    '+57 1 234 5680'
  ),
  -- Sucursal en otra ciudad
  (
    'uuid-del-owner',
    'parent-uuid-123',
    'Burger King Medellín',
    'burger-king-medellin',
    'El Poblado',
    'Medellín',
    'Colombia',
    'Calle 10 #35-20',
    '+57 4 567 8901'
  );

-- ============================================================================
-- 2. CREAR MENÚS DIFERENTES POR SUCURSAL
-- ============================================================================

-- Menú para sucursal Centro (desayunos)
INSERT INTO menus (restaurant_id, name, slug, description, is_published)
VALUES (
  'uuid-sucursal-centro',
  'Menú Desayunos',
  'desayunos-centro',
  'Desayunos disponibles de 6am a 11am',
  true
);

-- Menú para sucursal Norte (completo)
INSERT INTO menus (restaurant_id, name, slug, description, is_published)
VALUES (
  'uuid-sucursal-norte',
  'Menú Completo',
  'menu-completo-unicentro',
  'Todo el menú disponible todo el día',
  true
);

-- Menú para Medellín (especialidades regionales)
INSERT INTO menus (restaurant_id, name, slug, description, is_published)
VALUES (
  'uuid-sucursal-medellin',
  'Menú Paisa',
  'menu-paisa-medellin',
  'Especialidades de la región',
  true
);

-- ============================================================================
-- 3. CONSULTAS ÚTILES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 Ver todas las sucursales de una cadena
-- ---------------------------------------------------------------------------
SELECT * FROM get_chain_locations('parent-uuid-123');

-- O manualmente:
SELECT 
  id,
  name,
  location_name,
  city,
  address,
  COUNT(m.id) as menu_count
FROM restaurants r
LEFT JOIN menus m ON m.restaurant_id = r.id
WHERE parent_restaurant_id = 'parent-uuid-123'
  AND active = true
GROUP BY r.id
ORDER BY city, location_name;

-- ---------------------------------------------------------------------------
-- 3.2 Calcular costo actual de la suscripción
-- ---------------------------------------------------------------------------
SELECT calculate_subscription_cost('parent-uuid-123') as monthly_cost;

-- Detalle del cálculo:
SELECT 
  r.name as restaurant,
  t.name as tier,
  t.max_menus as included_menus,
  COUNT(m.id) as total_menus,
  GREATEST(0, COUNT(m.id) - t.max_menus) as additional_menus,
  t.price_per_additional_menu,
  GREATEST(0, COUNT(m.id) - t.max_menus) * t.price_per_additional_menu as additional_cost
FROM restaurants r
JOIN restaurant_subscriptions rs ON rs.restaurant_id = r.id
JOIN tiers t ON t.id = rs.tier_id
LEFT JOIN menus m ON m.restaurant_id = r.id
WHERE r.id = 'parent-uuid-123'
  AND rs.active = true
GROUP BY r.id, r.name, t.name, t.max_menus, t.price_per_additional_menu;

-- ---------------------------------------------------------------------------
-- 3.3 Ver todos los menús de una cadena (todas las sucursales)
-- ---------------------------------------------------------------------------
SELECT 
  r.name as sucursal,
  r.city,
  r.location_name,
  m.name as menu_name,
  m.is_published,
  m.qr_code_url,
  COUNT(DISTINCT ms.id) as sections_count,
  COUNT(DISTINCT mi.id) as items_count
FROM restaurants r
JOIN menus m ON m.restaurant_id = r.id
LEFT JOIN menu_sections ms ON ms.menu_id = m.id
LEFT JOIN menu_items mi ON mi.section_id = ms.id
WHERE r.id = 'parent-uuid-123' 
   OR r.parent_restaurant_id = 'parent-uuid-123'
GROUP BY r.id, r.name, r.city, r.location_name, m.id, m.name, m.is_published, m.qr_code_url
ORDER BY r.city, r.location_name, m.name;

-- ---------------------------------------------------------------------------
-- 3.4 Verificar si puede crear más menús (respetando límite del tier)
-- ---------------------------------------------------------------------------
SELECT check_menu_limit('uuid-sucursal-centro') as can_create_menu;

-- ---------------------------------------------------------------------------
-- 3.5 Dashboard de cadena: Resumen por ciudad
-- ---------------------------------------------------------------------------
SELECT 
  r.city,
  COUNT(DISTINCT r.id) as sucursales,
  COUNT(DISTINCT m.id) as menus_totales,
  SUM(m.view_count) as vistas_totales,
  COUNT(DISTINCT CASE WHEN m.is_published THEN m.id END) as menus_publicados
FROM restaurants r
LEFT JOIN menus m ON m.restaurant_id = r.id
WHERE parent_restaurant_id = 'parent-uuid-123'
  AND r.active = true
GROUP BY r.city
ORDER BY sucursales DESC;

-- ============================================================================
-- 4. EJEMPLOS DE BACKEND (Pseudocódigo TypeScript)
-- ============================================================================

/*

// Obtener estructura de la cadena
const getChainStructure = async (parentRestaurantId: string) => {
  const parent = await supabase
    .from('restaurants')
    .select('*, subscription:restaurant_subscriptions(*)')
    .eq('id', parentRestaurantId)
    .single();
  
  const locations = await supabase
    .rpc('get_chain_locations', { p_parent_restaurant_id: parentRestaurantId });
  
  const cost = await supabase
    .rpc('calculate_subscription_cost', { p_restaurant_id: parentRestaurantId });
  
  return {
    parent,
    locations: locations.data,
    monthlyCost: cost.data
  };
};

// Crear nueva sucursal
const createLocation = async (
  ownerId: string, 
  parentId: string, 
  locationData: LocationData
) => {
  // Verificar que el tier permita múltiples ubicaciones
  const { data: subscription } = await supabase
    .from('active_subscriptions')
    .select('allows_multiple_locations')
    .eq('restaurant_id', parentId)
    .single();
  
  if (!subscription?.allows_multiple_locations) {
    throw new Error('Su plan actual no permite múltiples ubicaciones. Actualice a "Chain"');
  }
  
  // Crear la sucursal
  return await supabase
    .from('restaurants')
    .insert({
      owner_id: ownerId,
      parent_restaurant_id: parentId,
      name: locationData.name,
      slug: generateSlug(locationData.name),
      location_name: locationData.locationName,
      city: locationData.city,
      address: locationData.address,
      phone: locationData.phone
    });
};

// Crear menú para sucursal (con validación de límite)
const createMenuForLocation = async (restaurantId: string, menuData: MenuData) => {
  // Verificar límite
  const { data: canCreate } = await supabase
    .rpc('check_menu_limit', { p_restaurant_id: restaurantId });
  
  if (!canCreate) {
    const cost = await calculateAdditionalMenuCost(restaurantId);
    throw new Error(`Límite de menús alcanzado. Costo adicional: $${cost}/mes`);
  }
  
  return await supabase
    .from('menus')
    .insert({
      restaurant_id: restaurantId,
      name: menuData.name,
      slug: menuData.slug,
      description: menuData.description
    });
};

*/

-- ============================================================================
-- 5. MIGRAR UN RESTAURANT EXISTENTE A CADENA
-- ============================================================================

-- Si ya tienes un restaurant y quieres convertirlo en cadena:

-- Paso 1: Actualizar suscripción al tier "chain"
UPDATE restaurant_subscriptions
SET tier_id = (SELECT id FROM tiers WHERE name = 'chain')
WHERE restaurant_id = 'existing-restaurant-uuid'
  AND active = true;

-- Paso 2: El restaurant existente se convierte en la "matriz"
-- Sus menús actuales quedan asociados a él

-- Paso 3: Crear sucursales nuevas apuntando a este como padre
INSERT INTO restaurants (
  owner_id,
  parent_restaurant_id,
  name,
  slug,
  location_name,
  city
) VALUES (
  'owner-uuid',
  'existing-restaurant-uuid', -- El restaurant existente es ahora el padre
  'Mi Restaurant - Sucursal 2',
  'mi-restaurant-sucursal-2',
  'Zona Norte',
  'Ciudad'
);

-- ============================================================================
-- FIN DE EJEMPLOS
-- ============================================================================
