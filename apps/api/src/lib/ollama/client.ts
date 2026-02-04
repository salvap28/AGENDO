import { OLLAMA_HOST, OLLAMA_MODEL, OLLAMA_NUM_GPU, OLLAMA_NUM_CTX } from '../config/llm.js';

export type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OllamaChatRequest = {
  model?: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    num_gpu?: number;
  };
};

export type OllamaChatResponse = {
  model: string;
  created_at?: string;
  message: {
    role: 'assistant' | 'user' | 'system';
    content: string;
  };
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  content: string;
};

export async function callOllamaChat(params: OllamaChatRequest): Promise<OllamaChatResponse> {
  const body = {
    model: params.model ?? OLLAMA_MODEL,
    messages: params.messages,
    stream: false,
    options: {
      num_gpu: params.options?.num_gpu ?? OLLAMA_NUM_GPU,
      num_ctx: OLLAMA_NUM_CTX,
    },
  };

  try {
    const res = await safeFetch(`${OLLAMA_HOST}/api/chat`, body);
    const data = (await res.json()) as OllamaChatResponse & Partial<Record<string, unknown>>;
    const content = typeof data.message?.content === 'string' ? data.message.content : '';
    return { ...data, content };
  } catch (error) {
    const gpuOption = params.options?.num_gpu ?? OLLAMA_NUM_GPU;
    if (gpuOption > 0) {
      console.warn('[ollama] GPU call failed, retrying on CPU', error);
      const cpuBody = { ...body, options: { ...body.options, num_gpu: 0 } };
      const res = await safeFetch(`${OLLAMA_HOST}/api/chat`, cpuBody);
      const data = (await res.json()) as OllamaChatResponse & Partial<Record<string, unknown>>;
      const content = typeof data.message?.content === 'string' ? data.message.content : '';
      return { ...data, content };
    }
    throw error;
  }
}

export type OllamaGenerateRequest = {
  model?: string;
  prompt: string;
  stream?: boolean;
  options?: {
    num_gpu?: number;
  };
};

export type OllamaGenerateResponse = {
  model: string;
  created_at?: string;
  response: string;
  done?: boolean;
  outputText: string;
};

export async function callOllamaGenerate(params: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
  const body = {
    model: params.model ?? OLLAMA_MODEL,
    prompt: params.prompt,
    stream: false,
    options: {
      num_gpu: params.options?.num_gpu ?? OLLAMA_NUM_GPU,
      num_ctx: OLLAMA_NUM_CTX,
    },
  };
  try {
    const res = await safeFetch(`${OLLAMA_HOST}/api/generate`, body);
    const data = (await res.json()) as OllamaGenerateResponse & { response?: string };
    const outputText = data.response ?? '';
    return { ...data, outputText };
  } catch (error) {
    const gpuOption = params.options?.num_gpu ?? OLLAMA_NUM_GPU;
    if (gpuOption > 0) {
      console.warn('[ollama] GPU generate failed, retrying on CPU', error);
      const cpuBody = { ...body, options: { ...body.options, num_gpu: 0 } };
      const res = await safeFetch(`${OLLAMA_HOST}/api/generate`, cpuBody);
      const data = (await res.json()) as OllamaGenerateResponse & { response?: string };
      const outputText = data.response ?? '';
      return { ...data, outputText };
    }
    throw error;
  }
}

async function safeFetch(url: string, body: Record<string, unknown>): Promise<Response> {
  const timeoutMsEnv = Number(process.env.OLLAMA_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutMsEnv) && timeoutMsEnv > 0 ? timeoutMsEnv : 90000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Intentar parsear el error de Ollama para dar un mensaje más claro
      let errorMessage = `Ollama no responde en ${url}: ${res.status}`;
      try {
        const errorData = JSON.parse(text);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Si no se puede parsear, usar el texto completo
        if (text) {
          errorMessage = `${errorMessage} - ${text}`;
        }
      }
      throw new Error(errorMessage);
    }
    return res;
  } catch (error) {
    if (error instanceof Error) {
      const reason = error.name === 'AbortError' ? `timeout ${timeoutMs}ms` : error.message;
      throw new Error(reason || `Ollama no responde en ${url}`);
    }
    throw new Error(`Ollama no responde en ${url}`);
  } finally {
    clearTimeout(timer);
  }
}
