/**
 * @file server/routes/nvidia.ts
 * @description NVIDIA NIM API direct REST proxy.
 * Requires a valid NVIDIA API key (nvapi-*) for authentication.
 */

import { Router } from 'express';

export const nvidiaRouter = Router();

// NVIDIA NIM free model mapping (UI ID -> Real API ID)
const NVIDIA_MODELS: Record<string, string> = {
  'nvidia/llama-3.3-70b-instruct': 'meta/llama-3.3-70b-instruct',
  'nvidia/deepseek-r1': 'deepseek-ai/deepseek-r1',
  'nvidia/deepseek-v3': 'deepseek-ai/deepseek-v3',
  'nvidia/llama-3.1-nemotron-70b-instruct': 'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/nemotron-4-340b-instruct': 'nvidia/nemotron-4-340b-instruct',
  'nvidia/gemma-3-27b-it': 'google/gemma-3-27b-it',
  'nvidia/gemma-2-9b-it': 'google/gemma-2-9b-it',
  'nvidia/phi-4': 'microsoft/phi-4',
  'nvidia/ministral-8b': 'mistralai/ministral-8b-instruct-v0.3',
};

nvidiaRouter.post('/stream', async (req, res) => {
  try {
    const { model, prompt, apiKey, settings, systemInstruction, history, gatewayUrls } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({ error: 'Model and prompt are required' });
    }

    // Map UI model ID to real NVIDIA API model ID
    const realModel = NVIDIA_MODELS[model] || model.replace('nvidia/', '');

    if (!realModel) {
      return res.status(400).json({ error: `Unknown NVIDIA model: ${model}` });
    }

    // Build messages
    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    if (history && Array.isArray(history)) {
      messages.push(...history.map((m: any) => ({ role: m.role, content: m.content })));
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: realModel,
      messages,
      stream: false,
      max_tokens: settings?.maxTokens ?? 4096,
      temperature: settings?.temperature ?? 0.7,
      top_p: settings?.topP ?? 1.0,
    };

    // Resolve API key: request body > env var
    const activeKey = apiKey || process.env.NVIDIA_API_KEY || '';
    if (!activeKey || !activeKey.startsWith('nvapi-')) {
      return res.status(401).json({ error: 'NVIDIA API key is required. Add your nvapi-* key in Settings.' });
    }

    console.log(`[NVIDIA Proxy] Sending to NVIDIA NIM: ${realModel}`);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[NVIDIA Error] ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: `NVIDIA API Error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return res.json({ text });
  } catch (e: any) {
    console.error('[NVIDIA Error]:', e.message);
    return res.status(500).json({ error: e.message });
  }
});
