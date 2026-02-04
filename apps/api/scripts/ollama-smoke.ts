import 'dotenv/config';
import { callOllamaChat } from '../src/lib/ollama/client.js';

async function main() {
  const res = await callOllamaChat({
    messages: [
      { role: 'system', content: 'Eres un asistente de prueba.' },
      { role: 'user', content: 'Responde solo con OK si lees esto.' },
    ],
  });
  console.log('Respuesta de Ollama:', res.content ?? res.message?.content ?? '');
}

main().catch((err) => {
  console.error('Fallo smoke test Ollama:', err.message);
  process.exit(1);
});
