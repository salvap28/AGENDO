#!/usr/bin/env node
/**
 * Script para listar modelos disponibles de Gemini
 */

import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY no está configurada');
  process.exit(1);
}

async function listModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Error:', res.status, errorText);
      process.exit(1);
    }
    
    const data = await res.json();
    console.log('📋 Modelos disponibles de Gemini:\n');
    
    if (data.models && Array.isArray(data.models)) {
      const generateContentModels = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          name: m.name,
          displayName: m.displayName,
          description: m.description,
        }));
      
      generateContentModels.forEach((model, index) => {
        console.log(`${index + 1}. ${model.displayName || model.name}`);
        if (model.description) {
          console.log(`   ${model.description}`);
        }
        console.log(`   Nombre: ${model.name}\n`);
      });
      
      // Sugerir el mejor modelo
      const flashModel = generateContentModels.find(m => m.name.includes('flash'));
      const proModel = generateContentModels.find(m => m.name.includes('pro') && !m.name.includes('flash'));
      
      console.log('\n💡 Recomendaciones:');
      if (flashModel) {
        console.log(`   Para velocidad: ${flashModel.name.split('/').pop()}`);
      }
      if (proModel) {
        console.log(`   Para calidad: ${proModel.name.split('/').pop()}`);
      }
    } else {
      console.log('No se encontraron modelos');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listModels();











