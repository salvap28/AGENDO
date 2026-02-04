import { NextResponse } from 'next/server';
import { callOllamaChat } from '../../../../lib/ollama/client.js';
import { OLLAMA_MODEL } from '../../../../lib/config/llm.js';

export async function GET() {
  try {
    const response = await callOllamaChat({
      messages: [
        { role: 'system', content: 'Sos Agendo AI, respondés en español de forma breve.' },
        { role: 'user', content: 'Decime en una sola frase que Agendo está conectado correctamente con Ollama.' },
      ],
    });

    const llmOutput = response.content ?? response.message?.content ?? '';
    return NextResponse.json({ message: 'OK', llmOutput, model: response.model ?? OLLAMA_MODEL });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Error al comunicarse con Ollama',
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 502 },
    );
  }
}
