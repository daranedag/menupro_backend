#!/usr/bin/env bun
/**
 * Script de migración de base de datos
 * Ejecuta los archivos SQL en orden
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Ejecutar un archivo SQL
 */
async function executeSqlFile(filePath: string): Promise<void> {
  try {
    const sql = await readFile(filePath, 'utf-8');
    console.log(`📄 Ejecutando: ${filePath}`);
    
    // Nota: Supabase no permite ejecutar SQL directamente desde el cliente
    // Debes ejecutar estos scripts manualmente en el SQL Editor de Supabase
    console.log('⚠️  Este script debe ejecutarse manualmente en Supabase SQL Editor');
    console.log('   O usar la CLI de Supabase: npx supabase db push');
    
  } catch (error) {
    console.error(`❌ Error ejecutando ${filePath}:`, error);
    throw error;
  }
}

/**
 * Ejecutar migraciones
 */
async function migrate() {
  const sqlDir = join(process.cwd(), 'sql_files');
  
  console.log('🚀 Iniciando migraciones...\n');
  
  try {
    const files = await readdir(sqlDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('📋 Archivos SQL encontrados:');
    sqlFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    console.log('💡 Instrucciones:');
    console.log('   1. Ve a https://supabase.com/dashboard/project/[tu-proyecto]/editor');
    console.log('   2. Ejecuta los siguientes archivos en orden:');
    console.log('      - database_schema.sql (primero)');
    console.log('      - migration_cadenas.sql (si usas cadenas)');
    console.log('      - demo_data.sql (opcional, para datos de prueba)');
    console.log('');
    console.log('   O usa Supabase CLI:');
    console.log('   $ npx supabase db push');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrate();
