import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { callGeminiGenerate } from '../lib/gemini/client.js';

const router = Router();

const Body = z.object({
  prompt: z.string().min(1),
  model: z.string().optional(),
});

router.post('/chat', requireAuth, async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { prompt, model } = parsed.data;
  try {
    const response = await callGeminiGenerate({ model, prompt, stream: false });
    res.json({ model: response.model, message: response.response });
  } catch (e) {
    console.error('[IA ERROR]', e);
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    res.status(500).json({ error: 'IA not available', details: errorMessage });
  }
});

export default router;
