export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:1b';

// Forzamos CPU por defecto para evitar cuelgues con GPUs no compatibles o lentas.
if (!process.env.OLLAMA_NO_GPU) {
  process.env.OLLAMA_NO_GPU = '1';
}
const parsedNumGpu = Number(process.env.OLLAMA_NUM_GPU);
export const OLLAMA_NUM_GPU = Number.isFinite(parsedNumGpu) ? parsedNumGpu : 0;

const parsedNumCtx = Number(process.env.OLLAMA_NUM_CTX);
export const OLLAMA_NUM_CTX = Number.isFinite(parsedNumCtx) && parsedNumCtx > 0 ? parsedNumCtx : 2048;
