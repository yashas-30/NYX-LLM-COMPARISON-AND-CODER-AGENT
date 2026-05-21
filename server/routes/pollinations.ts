/**
 * @file server/routes/pollinations.ts
 * @description Pollinations.ai keyless free AI model proxy.
 */

import { Router } from 'express';

export const pollinationsRouter = Router();

pollinationsRouter.post('/stream', async (req, res) => {
  try {
    const { model, prompt, settings, systemInstruction, history } = req.body;

    if (!model || !prompt) {
      return res.status(400).json({ error: 'Model and prompt are required' });
    }

    const realModel = model.replace('pollinations/', '');

    // Build messages in OpenAI compatible format
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
      temperature: settings?.temperature ?? 0.7,
    };

    console.log(`[Pollinations Proxy] Sending to Pollinations.ai: ${realModel}`);

    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Pollinations Error] ${response.status}: ${errText}`);
      return res.status(response.status).json({ error: `Pollinations API Error ${response.status}: ${errText}` });
    }

    let text = '';
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        const textData = await response.text();
        try {
          const data = JSON.parse(textData);
          text = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || data.text || '';
        } catch {
          // If it claims to be JSON but fails parsing, use the raw text content
          text = textData;
        }
      } catch (e: any) {
        console.warn('[Pollinations Proxy] Failed to read response as text:', e.message);
      }
    } else {
      text = await response.text();
    }

    if (!text || text.trim() === '') {
      return res.status(500).json({ error: 'Empty response returned from Pollinations.ai' });
    }

    return res.json({ text });
  } catch (e: any) {
    console.error('[Pollinations Error]:', e.message);
    return res.status(500).json({ error: e.message });
  }
});
