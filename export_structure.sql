-- ============================================================================
-- SCRIPT PARA EXPORTAR TODA LA ESTRUCTURA DE SUPABASE
-- ============================================================================
-- Ejecuta cada sección por separado y guarda los resultados
-- ============================================================================

-- ============================================================================
-- 1. TABLAS Y COLUMNAS
-- ============================================================================
SELECT 
  t.table_schema,
  t.table_name,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================================
-- 2. PRIMARY KEYS
-- ============================================================================
SELECT 
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- 3. FOREIGN KEYS
-- ============================================================================
SELECT 
  tc.table_name AS tabla_origen,
  kcu.column_name AS columna_origen,
  ccu.table_name AS tabla_referenciada,
  ccu.column_name AS columna_referenciada,
  tc.constraint_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. FUNCIONES Y TRIGGERS
-- ============================================================================
-- Funciones
SELECT 
  n.nspname as schema,
  p.proname as nombre_funcion,
  pg_get_function_arguments(p.oid) as argumentos,
  pg_get_functiondef(p.oid) as definicion
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- Triggers
SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 7. ENUMS (Tipos personalizados)
-- ============================================================================
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- ============================================================================
-- 8. VISTAS
-- ============================================================================
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- 9. RESUMEN GENERAL
-- ============================================================================
SELECT 
  'Tablas' as tipo,
  count(*) as cantidad
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Vistas',
  count(*)
FROM information_schema.views
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Funciones',
  count(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'

UNION ALL

SELECT 
  'Triggers',
  count(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT 
  'Políticas RLS',
  count(*)
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Indexes',
  count(*)
FROM pg_indexes
WHERE schemaname = 'public';

-- ============================================================================
-- 10. VERIFICAR RLS HABILITADO
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
