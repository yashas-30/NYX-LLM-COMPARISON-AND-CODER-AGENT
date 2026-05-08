// All Gemini calls route through the local Express server proxy (/api/gemini/stream)
// so the server can reuse a persistent HTTP/2 connection to Google's API.

export interface AISettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export async function callAI(
  modelId: string,
  provider: string,
  prompt: string,
  apiKey?: string,
  systemInstruction?: string,
  settings?: AISettings,
  onStream?: (text: string) => void,
  retryCount = 0,
  signal?: AbortSignal,
  nodeId?: string
): Promise<{ text: string; latency: number; ttft?: number }> {
  const startTime = Date.now();

  try {
    let resultText = "";
    let ttft: number | undefined;

    if (provider === 'gemini') {
      // ── Route through local server proxy for persistent HTTP/2 connection ──
      // The server caches GoogleGenAI instances per key, eliminating the
      // TLS handshake overhead on every request (~200-800ms savings).
      if (!apiKey) throw new Error("Gemini API key is required. Add it in Settings.");

      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, prompt, apiKey, settings, systemInstruction }),
        signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `Request failed: ${response.status}`);
      }
      if (!response.body) throw new Error("No response body from Gemini proxy");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.chunk && onStream) {
              resultText = parsed.fullText;
              ttft = parsed.ttft ?? ttft;
              onStream(resultText);
            }
            if (parsed.done) {
              resultText = parsed.fullText || resultText;
              ttft = parsed.ttft ?? ttft;
            }
          } catch (parseErr: any) {
            if (!parseErr.message?.includes("JSON")) throw parseErr;
          }
        }
      }

      if (!resultText) resultText = "[PROTOCOL HALT: NO_DATA_RETURNED]";

    } else if (provider === 'ollama') {

      // ── Ollama (via server-side proxy to avoid CORS) ──────────────────────
      const response = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          prompt,
          options: {
            temperature: settings?.temperature,
            top_p: settings?.topP,
            top_k: settings?.topK,
            num_predict: settings?.maxTokens,
          },
          nodeId,
        }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.response) {
              resultText += parsed.response;
              if (onStream) onStream(resultText);
            }
            if (parsed.done) break;
          } catch (parseErr: any) {
            // Ignore partial JSON if it looks like one, otherwise throw
            if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          }
        }
      }

      if (!resultText) resultText = '[OLLAMA: No response received]';

    } else if (provider === 'openai' || provider === 'claude' || provider === 'deepseek' || provider === 'openrouter') {

      // ── OpenAI / Claude / DeepSeek (all via server-side SSE proxy) ─────────
      if (!apiKey) throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is required. Add it in Settings.`);

      const endpoint = `/api/${provider}/stream`;
      console.log(`[Frontend] Calling AI endpoint: ${endpoint} (provider: ${provider})`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, prompt, apiKey, settings, systemInstruction }),
        signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error((err as any).error || `Request failed: ${response.status}`);
      }
      if (!response.body) throw new Error(`No response body from ${provider} proxy`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.fullText !== undefined && onStream) {
              resultText = parsed.fullText;
              ttft = parsed.ttft ?? ttft;
              onStream(resultText);
            }
            if (parsed.done) {
              resultText = parsed.fullText || resultText;
              ttft = parsed.ttft ?? ttft;
            }
          } catch (parseErr: any) {
            if (!parseErr.message?.includes("JSON")) throw parseErr;
          }
        }
      }

      if (!resultText) resultText = `[${provider.toUpperCase()}: No response received]`;

    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const endTime = Date.now();
    return {
      text: resultText,
      latency: endTime - startTime,
    };
  } catch (error: any) {
    const message = error.message || String(error);

    // Handle transient errors (rate limit, quota, overloaded) — retry up to 2x
    const isTransient =
      message.includes("429") ||
      message.includes("503") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("UNAVAILABLE") ||
      message.includes("rate_limit") ||
      message.includes("quota") ||
      message.includes("overloaded") ||
      message.includes("high demand");

    if (isTransient && retryCount < 2) {
      const waitTime = (retryCount + 1) * 4000;
      console.warn(`[Retry] ${modelId} is busy. Waiting ${waitTime / 1000}s (attempt ${retryCount + 1}/2)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callAI(modelId, provider, prompt, apiKey, systemInstruction, settings, onStream, retryCount + 1, signal, nodeId);
    }

    console.error(`Error calling ${provider} model ${modelId}:`, error);

    if (message.includes("RESOURCE_EXHAUSTED") || message.includes("429") || message.includes("quota")) {
      throw new Error("your daily quota has reached maximum");
    }

    if (message.includes("503") || message.includes("UNAVAILABLE") || message.includes("high demand") || message.includes("overloaded")) {
      throw new Error("[503] Model is currently overloaded. Please try again in a moment.");
    }

    throw new Error(message);
  }
}


export async function judgeResponses(
  globalPrompt: string,
  responses: { modelId: string; output: string; localPrompt?: string }[],
  apiKeyOverride?: string,
  preferredModel?: string
) {
  const model = preferredModel || "gemini-3.1-pro-preview";
  const provider = model.includes('/') ? 'openrouter'
                 : model.startsWith('gpt') || model.startsWith('o4') ? 'openai'
                 : model.startsWith('claude') ? 'claude'
                 : model.startsWith('deepseek') ? 'deepseek'
                 : 'gemini';

  const rawApiKey = apiKeyOverride?.trim();
  if (!rawApiKey) {
    throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is required for analysis. Please add your key in Settings.`);
  }

  const formattedResponses = responses
    .map(
      (r) => `
MODEL [${r.modelId}]:
SOURCE PROMPT: ${r.localPrompt || globalPrompt}
OUTPUT:
${r.output}
---`
    )
    .join("\n\n");

  const judgePrompt = `
You are an expert AI evaluator comparing responses from different language models.

USER PROMPT: "${globalPrompt}"

Your task is to evaluate each model's response and provide a detailed comparison.

IMPORTANT RULES:
1. Reference each model by its exact ID shown in brackets.
2. Be specific about what each model did well or poorly.
3. "differences" must highlight concrete, meaningful divergences between the models.
4. Every model in the input MUST have an entry in "critique".
5. "consensus" should be a synthesized best-answer combining the strongest parts of all responses.

OUTPUT SCHEMA (strict JSON only, no markdown fences):
{
  "bestResponseId": "exact modelId string of the best overall response",
  "consensus": "Synthesized best answer in markdown, combining the strongest elements from all models.",
  "methodology": "Brief explanation of the evaluation criteria used.",
  "differences": [
    {
      "category": "e.g., Accuracy, Depth, Tone, Completeness, Hallucination",
      "description": "Specific description of how the models differed on this dimension.",
      "impact": "high" | "medium" | "low"
    }
  ],
  "critique": {
    "<modelId>": {
      "analysis": "What this model got right and wrong, with specific examples from the output.",
      "actionableFeedback": "Concrete suggestions to improve this model's response.",
      "score": <number between 0 and 100>
    }
  }
}

MODEL RESPONSES TO EVALUATE:
${formattedResponses}
  `;

  const result = await callAI(
    model,
    provider,
    judgePrompt,
    rawApiKey,
    "You are a research analyst comparing LLM outputs. Output ONLY valid JSON matching the schema exactly. Do not wrap in markdown code fences.",
    { maxTokens: 8192 }
  );

  const text = result.text || "{}";
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) throw new Error("Model failed to generate valid JSON structure.");
  return text.substring(startIdx, endIdx + 1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the prompt is asking for code to be written. */
export function isCodePrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  const codeKeywords = [
    'write', 'code', 'implement', 'function', 'class', 'algorithm', 'script',
    'program', 'method', 'api', 'component', 'module', 'build', 'create a',
    'develop', 'generate code', 'write a', 'make a', 'snippet', 'solution',
    'solve', 'fix the bug', 'debug', 'refactor', 'optimize the code',
  ];
  return codeKeywords.some(kw => p.includes(kw));
}



/**
 * Code-specific analysis: extracts code from each model's output, compares
 * implementations across technical dimensions, picks the winner, and
 * synthesizes a combined best-of version.
 */
export async function judgeCodeResponses(
  userPrompt: string,
  responses: { modelId: string; output: string; localPrompt?: string }[],
  apiKeyOverride?: string,
  preferredModel?: string
): Promise<string> {
  const model = preferredModel || "gemini-3.1-pro-preview";
  const provider = model.includes('/') ? 'openrouter'
                 : model.startsWith('gpt') || model.startsWith('o4') ? 'openai'
                 : model.startsWith('claude') ? 'claude'
                 : model.startsWith('deepseek') ? 'deepseek'
                 : 'gemini';

  const rawApiKey = apiKeyOverride?.trim();
  if (!rawApiKey) {
    throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is required for code analysis. Please add your key in Settings.`);
  }

  const formattedResponses = responses
    .map(r => `MODEL [${r.modelId}]:\n${r.output}\n---`)
    .join("\n\n");

  const judgePrompt = `
You are an expert code reviewer and software architect comparing code written by different AI models.

USER'S CODING TASK: "${userPrompt}"

Your job:
1. Extract the code from each model's response (look for code blocks)
2. Compare the implementations across technical dimensions
3. Pick the best overall implementation
4. Synthesize a COMBINED implementation taking the best parts from EACH model

CRITICAL OUTPUT RULES:
- Output ONLY valid JSON (no markdown fences, no explanation outside the JSON)
- Every model in the input MUST have an entry in modelCodeAnalysis
- combinedCode must be a complete, runnable implementation
- If a model's response contains no code, set extractedCode to "" and codeQualityScore to 0

OUTPUT SCHEMA:
{
  "isCodeResponse": true,
  "language": "<detected language, e.g. Python, TypeScript, JavaScript>",
  "bestModelId": "<exact modelId of the model with the best code>",
  "combinedCode": "<complete synthesized best-of implementation — include full code, no truncation>",
  "combinedExplanation": "<explain what was taken from each model and why, in 2-4 sentences>",
  "modelCodeAnalysis": {
    "<modelId>": {
      "codeQualityScore": <0-100>,
      "strengths": ["<specific strength 1>", "<specific strength 2>"],
      "weaknesses": ["<specific weakness 1>"],
      "extractedCode": "<the actual code this model produced, verbatim>"
    }
  },
  "codeDifferences": [
    {
      "aspect": "<e.g. Error Handling, Algorithm Efficiency, Code Style, Edge Cases, Documentation>",
      "description": "<concrete description of how the models differed on this>",
      "winner": "<modelId that handled this best>"
    }
  ]
}

MODEL RESPONSES:
${formattedResponses}
`;

  const result = await callAI(
    model,
    provider,
    judgePrompt,
    rawApiKey,
    "You are an expert code reviewer. Output ONLY valid JSON matching the schema exactly. Do not wrap in markdown code fences.",
    { maxTokens: 16384 }
  );

  const text = result.text || "{}";
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) throw new Error("No JSON in response");
  return text.substring(startIdx, endIdx + 1);
}
