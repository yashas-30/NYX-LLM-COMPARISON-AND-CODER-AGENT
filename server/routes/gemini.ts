// ─── server/routes/gemini.ts ──────────────────────────────────────────────────
// Gemini (Google Generative AI) direct REST proxy.
// Wires POST requests to non-streaming generateContent endpoint.

import { Router } from 'express';

export const geminiRouter = Router();

const SYSTEM_KEY = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '';

function resolveRealModel(model: string): string {
  const modelMap: Record<string, string> = {
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemma-4-31b-it': 'gemma-4-31b-it',
    'gemma-4-26b-a4b-it': 'gemma-4-26b-a4b-it',
    'gemma-4-e4b-it': 'gemma-4-e4b-it',
    'gemma-4-e2b-it': 'gemma-4-e2b-it',
  };
  return modelMap[model] || model;
}

geminiRouter.post('/stream', async (req, res) => {
  const { model, prompt, apiKey, settings, systemInstruction, history, gatewayUrls } = req.body;
  
  const isUserKey = (apiKey && apiKey.trim() !== '' && apiKey !== 'null' && apiKey !== 'undefined');
  const activeKey = isUserKey ? apiKey.trim() : SYSTEM_KEY;

  if (!model) {
    return res.status(400).json({ error: 'Model is required' });
  }

  if (!activeKey || activeKey === '') {
    return res.status(401).json({ error: 'AUTHENTICATION FAILED: Gemini API key is required. Please check your settings.' });
  }

  try {
    const realModel = resolveRealModel(model);
    console.log(`[Gemini Proxy] Mapping UI model "${model}" -> Real API model "${realModel}"`);

    // Check if using custom gateway URL or default to official Google endpoint
    const gatewayBase = (gatewayUrls?.gemini && gatewayUrls.gemini.trim() !== '')
      ? gatewayUrls.gemini.replace(/\/$/, '')
      : 'https://generativelanguage.googleapis.com/v1beta';
      
    const url = `${gatewayBase}/models/${realModel}:generateContent?key=${activeKey}`;
    
    // Build contents in Gemini format
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      contents.push(...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })));
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const requestBody: any = { contents };
    
    if (systemInstruction) {
      requestBody.systemInstruction = { role: 'system', parts: [{ text: systemInstruction }] };
    }
    
    if (settings?.temperature !== undefined || settings?.maxTokens !== undefined || settings?.topP !== undefined) {
      requestBody.generationConfig = {};
      if (settings.temperature !== undefined) requestBody.generationConfig.temperature = settings.temperature;
      if (settings.topP !== undefined) requestBody.generationConfig.topP = settings.topP;
      if (settings.maxTokens !== undefined) requestBody.generationConfig.maxOutputTokens = settings.maxTokens;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Google AI Studio Error ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return res.json({ text });
  } catch (e: any) {
    console.error('[Gemini Error]:', e.message);
    let msg = e.message;
    
    if (msg.includes('404')) msg = `Model "${model}" not found or not available. Try a different model.`;
    if (msg.includes('403')) msg = 'Permission denied. Check your API key has the required permissions.';
    if (msg.includes('401') || msg.includes('invalid')) msg = 'Invalid API key. Please check your Gemini API key in Settings.';
    if (msg.includes('quota') || msg.includes('limit')) msg = 'API quota exceeded. Check your Google Cloud quota.';
    
    return res.status(500).json({ error: msg });
  }
});
