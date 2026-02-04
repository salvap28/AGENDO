import { NextResponse } from 'next/server';
import { callOllamaChat } from '../../../../../lib/ollama/client.js';
import { AGENDO_SYSTEM_PROMPT } from '../../../../../lib/ollama/personality.js';

export async function POST() {
  try {
    const response = await callOllamaChat({
      messages: [
        { role: 'system', content: AGENDO_SYSTEM_PROMPT },
        { role: 'user', content: 'Probando la personalidad de Agendo. Decime quién sos en dos oraciones.' },
      ],
      stream: false,
    });
    const output = response.content ?? response.message?.content ?? '';
    return NextResponse.json({ message: 'OK', output });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error al comunicarse con Ollama', error: error instanceof Error ? error.message : 'desconocido' },
      { status: 502 },
    );
  }
}
