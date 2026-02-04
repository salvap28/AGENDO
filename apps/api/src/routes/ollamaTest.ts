import { Router } from 'express';
import { callOllamaChat } from '../lib/ollama/client.js';
import { OLLAMA_HOST } from '../lib/config/llm.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const response = await callOllamaChat({
      messages: [
        { role: 'system', content: 'Sos Agendo AI, respondés en español de forma breve.' },
        { role: 'user', content: 'Decime en una sola frase que Agendo está conectado correctamente con Ollama.' },
      ],
    });
    const llmOutput = response.content ?? response.message?.content ?? '';
    res.json({ message: 'OK', llmOutput, model: response.model });
  } catch (error) {
    console.error('[ai/ollama-test] Error', error);
    res.status(502).json({
      message: 'Error al comunicarse con Ollama',
      error: error instanceof Error ? error.message : 'Error desconocido',
      model: null,
      host: OLLAMA_HOST,
    });
  }
});

export default router;
