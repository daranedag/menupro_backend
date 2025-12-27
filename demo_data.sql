-- ============================================================================
-- DEMO DATA - MenuPro
-- Fecha: Diciembre 2025
-- ============================================================================
-- Este script crea datos de demostración para cada tier del sistema.
-- IMPORTANTE: Ejecutar DESPUÉS de crear usuarios en Supabase Auth
-- ============================================================================

-- ============================================================================
-- INSTRUCCIONES
-- ============================================================================
/*
1. Primero crea los usuarios en Supabase Auth Dashboard o via API:
   - demo-free@menupro.com (password: Demo123!)
   - demo-basic@menupro.com (password: Demo123!)
   - demo-pro@menupro.com (password: Demo123!)
   - demo-premium@menupro.com (password: Demo123!)
   - demo-chain@menupro.com (password: Demo123!)

2. Obtén los UUIDs de esos usuarios desde auth.users

3. Reemplaza los UUIDs en las variables a continuación

4. Ejecuta este script completo
*/

-- ============================================================================
-- VARIABLES - REEMPLAZAR CON LOS UUIDs REALES
-- ============================================================================
DO $$
DECLARE
  -- IMPORTANTE: Reemplazar estos UUIDs con los de tus usuarios reales
  user_free_id uuid := '99eeab8c-551f-4aa7-a4fa-876f45b2adb4'; -- Reemplazar
  user_basic_id uuid := 'd737344f-a93a-4db1-b129-6c08110d2e37'; -- Reemplazar
  user_pro_id uuid := '0a4049ab-ad09-416e-922a-b081e51d05da'; -- Reemplazar
  user_premium_id uuid := 'b2495d49-8400-49ec-908c-8c582bca9c52'; -- Reemplazar
  user_chain_id uuid := 'f34ad072-2f1f-4787-b69c-fc51338d4e1a'; -- Reemplazar
  
  -- IDs que se generarán
  restaurant_free_id uuid;
  restaurant_basic_id uuid;
  restaurant_pro_id uuid;
  restaurant_premium_id uuid;
  restaurant_chain_parent_id uuid;
  restaurant_chain_centro_id uuid;
  restaurant_chain_norte_id uuid;
  
  menu_free_id uuid;
  menu_basic_id uuid;
  menu_pro_1_id uuid;
  menu_pro_2_id uuid;
  menu_premium_1_id uuid;
  menu_premium_2_id uuid;
  menu_chain_centro_id uuid;
  menu_chain_norte_id uuid;
  
  section_id uuid;
  
BEGIN
  
  -- ==========================================================================
  -- 1. CREAR USER PROFILES
  -- ==========================================================================
  
  INSERT INTO user_profiles (id, email, role) VALUES
    (user_free_id, 'demo-free@menupro.com', 'restaurant_owner'),
    (user_basic_id, 'demo-basic@menupro.com', 'restaurant_owner'),
    (user_pro_id, 'demo-pro@menupro.com', 'restaurant_owner'),
    (user_premium_id, 'demo-premium@menupro.com', 'restaurant_owner'),
    (user_chain_id, 'demo-chain@menupro.com', 'restaurant_owner')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✓ User profiles creados';
  
  -- ==========================================================================
  -- 2. DEMO TIER FREE
  -- ==========================================================================
  
  -- Restaurant
  INSERT INTO restaurants (owner_id, name, slug, phone, address, city, country, currency, primary_color, secondary_color, contact_email)
  VALUES (
    user_free_id,
    'Café Demo Free',
    'cafe-demo-free',
    '+1 234 567 8900',
    'Calle Principal 123',
    'Demo City',
    'Demo Country',
    'USD',
    '#6B4423',
    '#F5DEB3',
    'contacto@cafedemofree.com'
  )
  RETURNING id INTO restaurant_free_id;
  
  -- Subscription Free
  INSERT INTO restaurant_subscriptions (restaurant_id, tier_id, active)
  VALUES (restaurant_free_id, (SELECT id FROM tiers WHERE name = 'free'), true);
  
  -- Menu Free (1 solo menú permitido)
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_free_id,
    'Menú del Día',
    'menu-del-dia',
    'Nuestro menú diario con opciones frescas',
    true
  )
  RETURNING id INTO menu_free_id;
  
  -- Sección: Desayunos
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_free_id, 'Desayunos', 'Disponible de 7am a 12pm', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, order_index, available)
  VALUES
    (section_id, 'Café Americano', 'Café de origen colombiano', 2.50, 0, true),
    (section_id, 'Tostadas con Mantequilla', 'Pan artesanal tostado', 3.00, 1, true),
    (section_id, 'Huevos Revueltos', 'Huevos orgánicos con tostadas', 5.50, 2, true);
  
  -- Sección: Bebidas
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_free_id, 'Bebidas', 'Bebidas frías y calientes', 1)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, order_index, available)
  VALUES
    (section_id, 'Jugo de Naranja', 'Natural 100%', 3.50, 0, true),
    (section_id, 'Café Latte', 'Espresso con leche vaporizada', 4.00, 1, true);
  
  RAISE NOTICE '✓ Demo FREE creado - Restaurant: %', restaurant_free_id;
  
  -- ==========================================================================
  -- 3. DEMO TIER BASIC
  -- ==========================================================================
  
  -- Restaurant
  INSERT INTO restaurants (owner_id, name, slug, phone, address, city, country, currency, primary_color, secondary_color, contact_email, instagram, facebook)
  VALUES (
    user_basic_id,
    'Pizzería Demo Basic',
    'pizzeria-demo-basic',
    '+1 234 567 8901',
    'Avenida Italia 456',
    'Demo City',
    'Demo Country',
    'USD',
    '#D32F2F',
    '#FFEBEE',
    'info@pizzeriademobasic.com',
    '@pizzeriademobasic',
    'pizzeriademobasic'
  )
  RETURNING id INTO restaurant_basic_id;
  
  -- Subscription Basic
  INSERT INTO restaurant_subscriptions (restaurant_id, tier_id, active)
  VALUES (restaurant_basic_id, (SELECT id FROM tiers WHERE name = 'basic'), true);
  
  -- Menu Basic (1 menú con imágenes)
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_basic_id,
    'Carta de Pizzas',
    'carta-pizzas',
    'Las mejores pizzas artesanales de la ciudad',
    true
  )
  RETURNING id INTO menu_basic_id;
  
  -- Sección: Pizzas Clásicas
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_basic_id, 'Pizzas Clásicas', 'Nuestras recetas tradicionales', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'Margherita', 'Tomate, mozzarella, albahaca', 12.99, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002', 0, true),
    (section_id, 'Pepperoni', 'Pepperoni, mozzarella, orégano', 14.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e', 1, true),
    (section_id, 'Cuatro Quesos', 'Mozzarella, parmesano, gorgonzola, provolone', 15.99, 'https://images.unsplash.com/photo-1513104890138-7c749659a591', 2, true);
  
  -- Sección: Pizzas Especiales con descuento
  INSERT INTO menu_sections (menu_id, name, description, order_index, discount_type, discount_value)
  VALUES (menu_basic_id, 'Pizzas Especiales', '🔥 20% de descuento en pizzas especiales', 1, 'percentage', 20)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'BBQ Chicken', 'Pollo, BBQ, cebolla morada, cilantro', 16.99, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38', 0, true),
    (section_id, 'Hawaiana', 'Jamón, piña, mozzarella', 14.99, 'https://images.unsplash.com/photo-1565299507177-b0ac66763828', 1, true);
  
  RAISE NOTICE '✓ Demo BASIC creado - Restaurant: %', restaurant_basic_id;
  
  -- ==========================================================================
  -- 4. DEMO TIER PRO
  -- ==========================================================================
  
  -- Restaurant
  INSERT INTO restaurants (owner_id, name, slug, phone, address, city, country, currency, primary_color, secondary_color, contact_email, website, instagram)
  VALUES (
    user_pro_id,
    'Restaurante Demo Pro',
    'restaurante-demo-pro',
    '+1 234 567 8902',
    'Boulevard Gourmet 789',
    'Demo City',
    'Demo Country',
    'EUR',
    '#1976D2',
    '#E3F2FD',
    'reservas@restaurantedemopro.com',
    'https://restaurantedemopro.com',
    '@restaurantedemopro'
  )
  RETURNING id INTO restaurant_pro_id;
  
  -- Subscription Pro
  INSERT INTO restaurant_subscriptions (restaurant_id, tier_id, active)
  VALUES (restaurant_pro_id, (SELECT id FROM tiers WHERE name = 'pro'), true);
  
  -- Menu Pro 1: Almuerzo
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_pro_id,
    'Menú Almuerzo',
    'menu-almuerzo',
    'Menú ejecutivo de lunes a viernes',
    true
  )
  RETURNING id INTO menu_pro_1_id;
  
  -- Sección: Entradas
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_pro_1_id, 'Entradas', 'Para comenzar', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'Ensalada César', 'Lechuga romana, crutones, parmesano', 8.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1', 0, true),
    (section_id, 'Sopa del Día', 'Pregunta por el sabor de hoy', 6.99, null, 1, true);
  
  -- Sección: Platos Fuertes
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_pro_1_id, 'Platos Fuertes', 'Principales', 1)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'Filete de Res', 'Con papas y vegetales', 22.99, 'https://images.unsplash.com/photo-1600891964092-4316c288032e', 0, true),
    (section_id, 'Salmón a la Plancha', 'Con risotto de limón', 24.99, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288', 1, true),
    (section_id, 'Pasta Carbonara', 'Receta tradicional italiana', 16.99, 'https://images.unsplash.com/photo-1612874742237-6526221588e3', 2, true);
  
  -- Menu Pro 2: Cena
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_pro_id,
    'Menú Cena',
    'menu-cena',
    'Experiencia gastronómica nocturna',
    true
  )
  RETURNING id INTO menu_pro_2_id;
  
  -- Sección: Cenas Especiales
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_pro_2_id, 'Cenas Especiales', 'Lo mejor para la noche', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'Parrillada Premium', 'Carnes selectas a la parrilla', 32.99, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd', 0, true),
    (section_id, 'Langostinos al Ajillo', 'Con arroz mediterráneo', 28.99, 'https://images.unsplash.com/photo-1559847844-5315695dadae', 1, true);
  
  RAISE NOTICE '✓ Demo PRO creado - Restaurant: % | Menús: %, %', restaurant_pro_id, menu_pro_1_id, menu_pro_2_id;
  
  -- ==========================================================================
  -- 5. DEMO TIER PREMIUM
  -- ==========================================================================
  
  -- Restaurant
  INSERT INTO restaurants (owner_id, name, slug, phone, address, city, country, currency, primary_color, secondary_color, contact_email, website, instagram, facebook)
  VALUES (
    user_premium_id,
    'Gourmet Demo Premium',
    'gourmet-demo-premium',
    '+1 234 567 8903',
    'Plaza Elegance 321',
    'Demo City',
    'Demo Country',
    'EUR',
    '#7B1FA2',
    '#F3E5F5',
    'reservas@gourmetdemopremium.com',
    'https://gourmetdemopremium.com',
    '@gourmetdemopremium',
    'gourmetdemopremium'
  )
  RETURNING id INTO restaurant_premium_id;
  
  -- Subscription Premium
  INSERT INTO restaurant_subscriptions (restaurant_id, tier_id, active)
  VALUES (restaurant_premium_id, (SELECT id FROM tiers WHERE name = 'premium'), true);
  
  -- Menu Premium 1: Degustación
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_premium_id,
    'Menú Degustación',
    'menu-degustacion',
    'Experiencia gastronómica de 7 tiempos',
    true
  )
  RETURNING id INTO menu_premium_1_id;
  
  -- Múltiples secciones para demostrar ilimitado
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES 
    (menu_premium_1_id, 'Amuse-bouche', 'Aperitivo de bienvenida', 0),
    (menu_premium_1_id, 'Entrada Fría', 'Frescura y elegancia', 1),
    (menu_premium_1_id, 'Entrada Caliente', 'Sabores intensos', 2),
    (menu_premium_1_id, 'Plato Principal', 'La estrella de la noche', 3),
    (menu_premium_1_id, 'Quesos', 'Selección de quesos artesanales', 4),
    (menu_premium_1_id, 'Pre-postre', 'Limpiador de paladar', 5),
    (menu_premium_1_id, 'Postre', 'El final perfecto', 6);
  
  -- Menu Premium 2: Carta
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_premium_id,
    'Carta Premium',
    'carta-premium',
    'Platos a la carta con productos de primera calidad',
    true
  )
  RETURNING id INTO menu_premium_2_id;
  
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_premium_2_id, 'Carnes Premium', 'Cortes importados', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available, discount_type, discount_value)
  VALUES
    (section_id, 'Wagyu A5', 'Corte japonés premium 200g', 89.99, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143', 0, true, 'none', 0),
    (section_id, 'Tomahawk Steak', 'Corte americano 800g', 69.99, 'https://images.unsplash.com/photo-1558030006-450675393462', 1, true, 'fixed', 10);
  
  RAISE NOTICE '✓ Demo PREMIUM creado - Restaurant: %', restaurant_premium_id;
  
  -- ==========================================================================
  -- 6. DEMO TIER CHAIN (Cadena con sucursales)
  -- ==========================================================================
  
  -- Restaurant Padre
  INSERT INTO restaurants (owner_id, name, slug, location_name, phone, city, country, currency, primary_color, secondary_color, contact_email, website, instagram)
  VALUES (
    user_chain_id,
    'Burger Demo Chain',
    'burger-demo-chain',
    'Matriz',
    '+1 234 567 8904',
    'Demo City',
    'Demo Country',
    'USD',
    '#FF6F00',
    '#FFF3E0',
    'info@burgerdemochain.com',
    'https://burgerdemochain.com',
    '@burgerdemochain'
  )
  RETURNING id INTO restaurant_chain_parent_id;
  
  -- Subscription Chain
  INSERT INTO restaurant_subscriptions (restaurant_id, tier_id, active)
  VALUES (restaurant_chain_parent_id, (SELECT id FROM tiers WHERE name = 'chain'), true);
  
  -- Sucursal Centro
  INSERT INTO restaurants (owner_id, parent_restaurant_id, name, slug, location_name, phone, address, city, country, currency, primary_color, secondary_color, contact_email)
  VALUES (
    user_chain_id,
    restaurant_chain_parent_id,
    'Burger Demo Chain Centro',
    'burger-demo-chain-centro',
    'Centro',
    '+1 234 567 8905',
    'Calle Centro 100',
    'Demo City',
    'Demo Country',
    'USD',
    '#FF6F00',
    '#FFF3E0',
    'centro@burgerdemochain.com'
  )
  RETURNING id INTO restaurant_chain_centro_id;
  
  -- Sucursal Norte
  INSERT INTO restaurants (owner_id, parent_restaurant_id, name, slug, location_name, phone, address, city, country, currency, primary_color, secondary_color, contact_email)
  VALUES (
    user_chain_id,
    restaurant_chain_parent_id,
    'Burger Demo Chain Norte',
    'burger-demo-chain-norte',
    'Norte',
    '+1 234 567 8906',
    'Avenida Norte 200',
    'Demo City',
    'Demo Country',
    'USD',
    '#FF6F00',
    '#FFF3E0',
    'norte@burgerdemochain.com'
  )
  RETURNING id INTO restaurant_chain_norte_id;
  
  -- Menu para Sucursal Centro (Menú Fast Food)
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_chain_centro_id,
    'Menú Fast Food',
    'menu-fast-food',
    'Hamburguesas clásicas para llevar',
    true
  )
  RETURNING id INTO menu_chain_centro_id;
  
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_chain_centro_id, 'Hamburguesas', 'Nuestras mejores burgers', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'Classic Burger', 'Carne, lechuga, tomate, cebolla', 9.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd', 0, true),
    (section_id, 'Cheese Burger', 'Doble queso cheddar', 11.99, 'https://images.unsplash.com/photo-1550547660-d9450f859349', 1, true),
    (section_id, 'Bacon Burger', 'Bacon crujiente y BBQ', 12.99, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b', 2, true);
  
  -- Menu para Sucursal Norte (Menú Gourmet)
  INSERT INTO menus (restaurant_id, name, slug, description, is_published)
  VALUES (
    restaurant_chain_norte_id,
    'Menú Gourmet Burgers',
    'menu-gourmet-burgers',
    'Hamburguesas premium con ingredientes selectos',
    true
  )
  RETURNING id INTO menu_chain_norte_id;
  
  INSERT INTO menu_sections (menu_id, name, description, order_index)
  VALUES (menu_chain_norte_id, 'Burgers Premium', 'Experiencia gourmet', 0)
  RETURNING id INTO section_id;
  
  INSERT INTO menu_items (section_id, name, description, price, image_url, order_index, available)
  VALUES
    (section_id, 'Truffle Burger', 'Wagyu, trufa negra, rúcula', 24.99, 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9', 0, true),
    (section_id, 'Blue Cheese Burger', 'Queso azul, cebolla caramelizada', 19.99, 'https://images.unsplash.com/photo-1585238341710-0c0e81b397f4', 1, true);
  
  RAISE NOTICE '✓ Demo CHAIN creado - Parent: % | Sucursales: %, %', restaurant_chain_parent_id, restaurant_chain_centro_id, restaurant_chain_norte_id;
  
  -- ==========================================================================
  -- RESUMEN
  -- ==========================================================================
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'DEMO DATA CREADA EXITOSAMENTE';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
  RAISE NOTICE 'FREE Tier:';
  RAISE NOTICE '  Restaurant: %', restaurant_free_id;
  RAISE NOTICE '  Menús: 1';
  RAISE NOTICE '';
  RAISE NOTICE 'BASIC Tier:';
  RAISE NOTICE '  Restaurant: %', restaurant_basic_id;
  RAISE NOTICE '  Menús: 1';
  RAISE NOTICE '';
  RAISE NOTICE 'PRO Tier:';
  RAISE NOTICE '  Restaurant: %', restaurant_pro_id;
  RAISE NOTICE '  Menús: 2';
  RAISE NOTICE '';
  RAISE NOTICE 'PREMIUM Tier:';
  RAISE NOTICE '  Restaurant: %', restaurant_premium_id;
  RAISE NOTICE '  Menús: 2+';
  RAISE NOTICE '';
  RAISE NOTICE 'CHAIN Tier:';
  RAISE NOTICE '  Restaurant Padre: %', restaurant_chain_parent_id;
  RAISE NOTICE '  Sucursales: 2';
  RAISE NOTICE '  Menús totales: 2';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todos los datos de demo han sido creados';
  RAISE NOTICE '====================================';
  
END $$;
