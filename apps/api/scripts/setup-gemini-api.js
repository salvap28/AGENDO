#!/usr/bin/env node
/**
 * Script para configurar la clave API de Google AI Studio (Gemini)
 * 
 * Uso:
 *   node scripts/setup-gemini-api.js TU_CLAVE_API_AQUI
 * 
 * O simplemente ejecuta el script y te pedirá la clave de forma interactiva
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Obtener la clave API del argumento de línea de comandos o pedirla
const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Error: No se proporcionó la clave API');
  console.log('\nUso:');
  console.log('  node scripts/setup-gemini-api.js TU_CLAVE_API_AQUI');
  console.log('\nO configura la variable de entorno GEMINI_API_KEY');
  process.exit(1);
}

// Leer el archivo .env existente o crear uno nuevo
let envContent = '';
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, 'utf-8');
} else {
  console.log('📝 Creando nuevo archivo .env...');
}

// Verificar si GEMINI_API_KEY ya existe
const geminiKeyRegex = /^GEMINI_API_KEY\s*=/m;
const geminiModelRegex = /^GEMINI_MODEL\s*=/m;

if (geminiKeyRegex.test(envContent)) {
  // Reemplazar la clave existente
  envContent = envContent.replace(
    /^GEMINI_API_KEY\s*=.*$/m,
    `GEMINI_API_KEY=${apiKey}`
  );
  console.log('✅ Clave API de Gemini actualizada');
} else {
  // Agregar la nueva clave al final del archivo
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `\n# Google AI Studio (Gemini API)\n`;
  envContent += `GEMINI_API_KEY=${apiKey}\n`;
  if (!geminiModelRegex.test(envContent)) {
    envContent += `GEMINI_MODEL=gemini-1.5-flash\n`;
  }
  console.log('✅ Clave API de Gemini agregada');
}

// Escribir el archivo .env
writeFileSync(envPath, envContent, 'utf-8');

console.log('\n🎉 Configuración completada!');
console.log('📋 Variables configuradas:');
console.log('   - GEMINI_API_KEY');
console.log('   - GEMINI_MODEL=gemini-1.5-flash (por defecto)');
console.log('\n💡 Reinicia el servidor API para que los cambios surtan efecto.');
console.log('   npm run dev  (o el comando que uses para iniciar el servidor)');











