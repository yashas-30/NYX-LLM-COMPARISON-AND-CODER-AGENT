/**
 * @file server/routes/openrouter.ts
 * @description OpenRouter direct REST proxy with Cloudflare AI Gateway support.
 */

import { Router } from 'express';
import { Gateway } from '../lib/gateway.js';

export const openrouterRouter = Router();

openrouterRouter.post('/stream', async (req, res) => {
  try {
    const { model, prompt, apiKey, settings, systemInstruction, history, gatewayUrls } = req.body;

    // Auth validation
    const authResult = Gateway.validateAuth('openrouter', model, apiKey);
    if (!authResult.valid) {
      return res.status(401).json({ error: authResult.error });
    }

    if (!model || !prompt) {
      return res.status(400).json({ error: 'Model and prompt are required' });
    }

    const activeKey = Gateway.getActiveKey('openrouter', apiKey);

    // Build messages
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    if (history && Array.isArray(history)) {
      messages.push(...history.map((m: any) => ({ role: m.role, content: m.content })));
    }
    messages.push({ role: 'user', content: prompt });

    // Build URL with gateway support (custom user gateway takes priority)
    const { url } = Gateway.buildUrl('openrouter', '/chat/completions', gatewayUrls);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LLM Reference Dashboard',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...settings,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter Error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return res.json({ text });
  } catch (e: any) {
    console.error('[OpenRouter Error]:', e.message);
    return res.status(500).json({ error: e.message });
  }
});