/**
 * @file server/routes/opencode.ts
 * @description OpenCode free models direct REST proxy.
 */

import { Router } from 'express';
import { Gateway } from '../lib/gateway.js';

export const opencodeRouter = Router();

const SYSTEM_KEY = process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || '';

opencodeRouter.post('/stream', async (req, res) => {
  try {
    const { model, prompt, apiKey, settings, systemInstruction, history, gatewayUrls } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({ error: 'Model and prompt are required' });
    }

    // Resolve active key
    const isUserKey = (apiKey && apiKey.trim() !== '' && apiKey !== 'null' && apiKey !== 'undefined');
    const activeKey = isUserKey ? apiKey.trim() : SYSTEM_KEY;

    // Validation
    const authResult = Gateway.validateAuth('opencode', model, apiKey);
    if (!authResult.valid) {
      return res.status(401).json({ error: authResult.error });
    }

    // Map model ID
    const mappedModel = Gateway.mapOpenCodeModel(model);

    // Build messages
    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    if (history && Array.isArray(history)) {
      messages.push(...history.map((m: any) => ({ role: m.role, content: m.content })));
    }
    messages.push({ role: 'user', content: prompt });

    // Build URL with gateway support (custom user gateway takes priority)
    const { url } = Gateway.buildUrl('opencode', '/chat/completions', gatewayUrls);

    // Make request to OpenCode Zen API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LLM Reference - OpenCode Zen',
      },
      body: JSON.stringify({
        model: mappedModel,
        messages,
        stream: false,
        temperature: settings?.temperature ?? 0.7,
        max_tokens: settings?.maxTokens ?? 512,
        top_p: settings?.topP ?? 1,
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
  } catch (error: any) {
    console.error('[OpenCode Error]:', error);
    return res.status(500).json({ error: error.message });
  }
});