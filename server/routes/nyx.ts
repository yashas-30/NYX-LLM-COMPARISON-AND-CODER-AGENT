import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { RulesDb } from '../lib/rulesDb.ts';

export const nyxRouter = Router();

// GET /api/nyx/rules - Fetch all learned instructions
nyxRouter.get('/rules', (_req, res) => {
  try {
    const rules = RulesDb.getRules();
    res.json({ success: true, rules });
  } catch (e: any) {
    console.error('[Nyx Router] Failed to fetch rules:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/nyx/reset - Reset rules database
nyxRouter.post('/reset', (_req, res) => {
  try {
    RulesDb.resetRules();
    res.json({ success: true });
  } catch (e: any) {
    console.error('[Nyx Router] Failed to reset rules:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/nyx/critic - Asynchronous background evaluation loop
nyxRouter.post('/critic', (req, res) => {
  const { prompt, response, apiKey } = req.body;
  
  if (!prompt || !response) {
    return res.status(400).json({ error: 'Missing prompt or response for critic.' });
  }

  // Secure server-side API key loaded from environment variables to prevent git leakage
  const activeKey = process.env.CRITIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!activeKey) {
    console.log('[Nyx Router] Critic loop skipped: No Gemini API key found.');
    return res.json({ success: true, message: 'Skipped: No API key available' });
  }

  // Respond immediately so user doesn't experience latency
  res.json({ success: true, processing: true });

  // Fire off Critic asynchronously
  setImmediate(async () => {
    try {
      await runBackgroundCritic(prompt, response, activeKey);
    } catch (criticError) {
      console.error('[Nyx Critic Layer Error]:', criticError);
    }
  });
});

/**
 * Executes the Critic model to analyze the interaction and formulate a micro-rule
 */
async function runBackgroundCritic(userPrompt: string, nyxResponse: string, apiKey: string) {
  console.log('[Background Critic] Starting meta-cognitive analysis...');

  const ai = new GoogleGenAI({ apiKey });

  const criticSystemPrompt = `
You are the Core Meta-Cognitive Optimizer for an AI coding agent named Nyx. Your task is to analyze the provided chat interaction between a user and Nyx, identify structural or conceptual gaps, and generate a micro-instruction to improve Nyx's next output.

Analyze the interaction based on these criteria:
1. Did Nyx misunderstand the architecture, framework, or logic requested?
2. Did Nyx introduce bugs, missing imports, or incomplete boilerplate code?
3. What unstated assumptions did the user have to correct?

If Nyx's response has bugs, missing imports, bad practices, or lacks critical files, formulate a rule to prevent this.
If the response is correct, clear, and perfectly fulfills the prompt, you MUST set the "rule" field to "No improvement needed" or "None".

Output your response strictly as a single, compact JSON object matching the requested schema.
  `.trim();

  const conversationPayload = `
[USER PROMPT]:
${userPrompt}

[NYX RESPONSE]:
${nyxResponse}
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b',
      contents: conversationPayload,
      config: {
        systemInstruction: criticSystemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            metric: { type: 'STRING', description: 'Specific language/framework or pattern (e.g., React Hooks, Async Error Handling, State Management)' },
            critique: { type: 'STRING', description: 'A brief, 1-sentence explanation of what Nyx missed or did poorly.' },
            rule: { type: 'STRING', description: 'A highly precise, imperative instruction telling Nyx exactly how to handle this scenario next time.' }
          },
          required: ['metric', 'critique', 'rule']
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      console.log('[Background Critic] Empty response received.');
      return;
    }

    const analysis = JSON.parse(outputText);
    const hasImprovement = analysis.rule && 
      !analysis.rule.toLowerCase().includes('no improvement needed') && 
      !analysis.rule.toLowerCase().includes('none');

    if (hasImprovement) {
      RulesDb.addRule(analysis.metric, analysis.critique, analysis.rule);
      console.log(`[Background Critic] Evolution successful! Learned new rule for ${analysis.metric}.`);
    } else {
      console.log('[Background Critic] Interaction evaluated as fully correct. No new adjustments necessary.');
    }
  } catch (error) {
    console.error('[Background Critic] Error during evaluation or parsing:', error);
  }
}
