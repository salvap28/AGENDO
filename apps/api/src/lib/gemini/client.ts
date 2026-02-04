/**
 * Cliente para Google AI Studio (Gemini API)
 */

export type GeminiChatMessage = {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
};

export type GeminiChatRequest = {
  model?: string;
  messages: Array<{
    role: 'user' | 'model' | 'system';
    content: string;
  }>;
  stream?: boolean;
};

export type GeminiChatResponse = {
  model: string;
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason?: string;
  }>;
  content?: string;
  message?: {
    role: string;
    content: string;
  };
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.warn('[gemini] ⚠ GEMINI_API_KEY no está configurada. Las llamadas a Gemini fallarán.');
  console.warn('[gemini] Obtén una clave API en: https://aistudio.google.com/apikey');
}

/**
 * Convierte mensajes en formato Ollama a formato Gemini
 */
function convertMessagesToGeminiFormat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Array<{ role: 'user' | 'model'; parts: { text: string }[] }> {
  const geminiMessages: Array<{ role: 'user' | 'model'; parts: { text: string }[] }> = [];
  let systemPrompt = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      // En Gemini, los system prompts se incluyen en el primer mensaje de usuario
      systemPrompt = msg.content;
    } else if (msg.role === 'user') {
      // Combinar system prompt con el primer mensaje de usuario si existe
      const content = geminiMessages.length === 0 && systemPrompt 
        ? `${systemPrompt}\n\n${msg.content}`
        : msg.content;
      geminiMessages.push({
        role: 'user',
        parts: [{ text: content }],
      });
    } else if (msg.role === 'assistant') {
      geminiMessages.push({
        role: 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  return geminiMessages;
}

/**
 * Llama a la API de Gemini para generar contenido
 */
export async function callGeminiChat(params: GeminiChatRequest): Promise<GeminiChatResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada. Por favor, configura la variable de entorno GEMINI_API_KEY.');
  }

  const model = params.model || GEMINI_MODEL;
  const geminiMessages = convertMessagesToGeminiFormat(
    params.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }))
  );

  const requestBody = {
    contents: geminiMessages,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 90000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Usar v1beta para acceso a modelos más recientes
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let errorMessage = `Gemini API error: ${res.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
          role?: string;
        };
        finishReason?: string;
      }>;
      model?: string;
    };

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const modelName = data.model || model;

    // Formatear la respuesta para que sea compatible con el formato de Ollama
    return {
      model: modelName,
      candidates: data.candidates || [],
      content: text,
      message: {
        role: 'assistant',
        content: text,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      const reason = error.name === 'AbortError' ? `timeout ${timeoutMs}ms` : error.message;
      throw new Error(`Error al comunicarse con Gemini: ${reason}`);
    }
    throw new Error('Error al comunicarse con Gemini');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Llama a la API de Gemini para generar texto simple (compatible con generate)
 */
export async function callGeminiGenerate(params: { model?: string; prompt: string; stream?: boolean }): Promise<{ model: string; response: string; outputText: string }> {
  const response = await callGeminiChat({
    model: params.model,
    messages: [{ role: 'user', content: params.prompt }],
    stream: params.stream,
  });

  return {
    model: response.model,
    response: response.content || '',
    outputText: response.content || '',
  };
}

