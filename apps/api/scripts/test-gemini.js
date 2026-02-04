#!/usr/bin/env node
/**
 * Script de prueba para verificar la configuración de Google AI Studio (Gemini)
 * 
 * Ejecutar con: npm run test:gemini
 * O directamente: tsx scripts/test-gemini.ts
 */

import 'dotenv/config';
import { callGeminiChat } from '../src/lib/gemini/client.ts';

async function testGemini() {
  console.log('🧪 Probando conexión con Google AI Studio (Gemini)...\n');

  // Verificar que la clave API esté configurada
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY no está configurada en el archivo .env');
    console.log('\n💡 Agrega la siguiente línea a tu archivo apps/api/.env:');
    console.log('   GEMINI_API_KEY=tu_clave_api_aqui\n');
    process.exit(1);
  }

  console.log('✅ GEMINI_API_KEY encontrada');
  console.log(`📋 Modelo: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}\n`);

  try {
    console.log('🔄 Enviando prueba a Gemini...\n');
    
    const response = await callGeminiChat({
      messages: [
        {
          role: 'user',
          content: 'Responde con "OK" si puedes leer este mensaje.',
        },
      ],
      stream: false,
    });

    const text = response?.content || response?.message?.content || '';
    
    if (text) {
      console.log('✅ ¡Conexión exitosa con Gemini!\n');
      console.log('📝 Respuesta del modelo:');
      console.log(`   "${text}"\n`);
      console.log('🎉 La configuración está funcionando correctamente.');
      console.log('💡 Puedes reiniciar el servidor API para usar Gemini en producción.\n');
    } else {
      console.error('❌ Error: Gemini respondió pero sin contenido');
      console.log('Respuesta recibida:', JSON.stringify(response, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error al comunicarse con Gemini:\n');
    
    if (error instanceof Error) {
      console.error(`   ${error.message}\n`);
      
      if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('401') || error.message.includes('403')) {
        console.log('💡 Posibles soluciones:');
        console.log('   1. Verifica que GEMINI_API_KEY sea correcta');
        console.log('   2. Asegúrate de que la clave API esté activa en Google AI Studio');
        console.log('   3. Verifica que no haya espacios extra en el archivo .env');
        console.log('   4. Obtén una nueva clave en: https://aistudio.google.com/apikey\n');
      } else if (error.message.includes('timeout')) {
        console.log('💡 El servidor tardó demasiado en responder. Verifica tu conexión a internet.\n');
      } else {
        console.log('💡 Revisa los logs del servidor para más detalles.\n');
      }
    } else {
      console.error('   Error desconocido:', error);
    }
    
    process.exit(1);
  }
}

testGemini().catch((error) => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});

