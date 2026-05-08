import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { setGlobalDispatcher, Agent } from 'undici';
import dns from 'node:dns';
dns.setServers(['1.1.1.1', '1.0.0.1', '2606:4700:4700::1111', '2606:4700:4700::1001']);

// ── Speed Optimization: Global Connection Pooling ──────────────────────────
// Reusing connections eliminates the 300-800ms TLS handshake delay on every call.
setGlobalDispatcher(new Agent({
  connect: {
    timeout: 60000,
    keepAlive: true,
    keepAliveInitialDelay: 1000,
  },
  pipelining: 10,
  maxRedirections: 5,
  connections: 128, // High concurrency for many nodes
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
const MAX_RETRIES = 3;

/**
 * Tracks which Ollama model is currently loaded in GPU/CPU memory.
 * Used to evict the previous model before loading a new one, preventing
 * multiple models from running simultaneously.
 */
let currentOllamaModel: string | null = null;

/**
 * A promise for any in-progress unload operation.
 * Shared so concurrent callers (UI dropdown + chat request) don't
 * each fire their own unload — they all await the same one.
 */
let pendingUnload: Promise<void> | null = null;

/**
 * Tracks AbortControllers for every active Ollama generation stream.
 * When unload is requested, we abort the stream immediately so Ollama
 * stops generating and frees GPU memory as fast as possible.
 */
const activeOllamaStreams = new Map<string, AbortController>();

/** Evict a model from Ollama memory using keep_alive=0. */
async function unloadOllamaModel(model: string): Promise<void> {
  try {
    await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, keep_alive: 0, stream: false }),
    });
    console.log(`[Ollama] Unloaded: ${model}`);
  } catch {
    // Non-fatal — Ollama may not be running or model already evicted
  }
}

/**
 * Ensure the previously-loaded model is unloaded before we load another.
 * Returns a shared promise so concurrent callers don't double-unload.
 */
function ensureModelEvicted(targetModel: string): Promise<void> {
  if (!currentOllamaModel || currentOllamaModel === targetModel) {
    return Promise.resolve();
  }
  if (!pendingUnload) {
    const modelToEvict = currentOllamaModel;
    console.log(`[Ollama] Evicting "${modelToEvict}" → loading "${targetModel}"...`);
    pendingUnload = unloadOllamaModel(modelToEvict).finally(() => {
      pendingUnload = null;
    });
  }
  return pendingUnload;
}

// ── Gemini persistent connection cache ─────────────────────────────────────
/**
 * Cache GoogleGenAI instances per API key so the underlying HTTP/2 connection
 * to generativelanguage.googleapis.com is reused across requests.
 * Without this, every call does a full TLS+TCP handshake (~200-800ms overhead).
 */
const geminiInstanceCache = new Map<string, GoogleGenAI>();

function getGeminiInstance(apiKey: string): GoogleGenAI {
  if (!geminiInstanceCache.has(apiKey)) {
    geminiInstanceCache.set(apiKey, new GoogleGenAI(apiKey));
    console.log('[Gemini] Created new persistent connection for key ...', apiKey.slice(-6));
  }
  return geminiInstanceCache.get(apiKey)!;
}

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // Health check
    app.get("/api/health", (req, res) => res.json({ status: "ok", dns: "cloudflare" }));

    // ── Gemini Proxy (persistent connection, server-side) ─────────────────────
    /**
     * Streams a Gemini response via SSE.
     * Running server-side means:
     *  - GoogleGenAI instance is cached → HTTP/2 connection to Google is reused
     *  - No browser TLS handshake overhead per request
     *  - TTFT is measured accurately
     */
    app.post("/api/gemini/stream", async (req, res) => {
      const { model, prompt, apiKey, settings, systemInstruction } = req.body as {
        model: string;
        prompt: string;
        apiKey: string;
        settings?: { temperature?: number; maxTokens?: number; topP?: number; topK?: number };
        systemInstruction?: string;
      };

      if (!model || !prompt || !apiKey) {
        res.status(400).json({ error: "model, prompt, and apiKey are required" });
        return;
      }

      const controller = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) {
          console.log(`[Gemini] Client disconnected — aborting stream for: ${model}`);
          controller.abort();
        }
      });

      try {
        const ai = getGeminiInstance(apiKey);

        // Open SSE only after we have the instance (instant — it's cached)
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const startTime = Date.now();
        let ttft: number | null = null;
        let fullText = "";

        const streamResponse = await ai.models.generateContentStream({
          model,
          contents: prompt,
          config: {
            temperature: settings?.temperature,
            topP: settings?.topP,
            topK: settings?.topK,
            maxOutputTokens: settings?.maxTokens,
            systemInstruction: systemInstruction || undefined,
          },
        });

        for await (const chunk of streamResponse) {
          try {
            const chunkText = chunk.text;
            if (chunkText) {
              if (ttft === null) ttft = Date.now() - startTime;
              fullText += chunkText;
              res.write(`data: ${JSON.stringify({ chunk: chunkText, fullText, ttft })}\n\n`);
            }
          } catch (err: any) {
            console.warn("[Gemini] Chunk error (likely safety filter):", err.message);
            res.write(`data: ${JSON.stringify({ error: "Response blocked by safety filters or API error." })}\n\n`);
          }
        }

        const totalLatency = Date.now() - startTime;
        res.write(`data: ${JSON.stringify({ done: true, fullText, ttft, totalLatency })}\n\n`);
        res.end();
      } catch (e: any) {
        if (!res.headersSent) {
          res.status(500).json({ error: e.message });
        } else {
          res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
          res.end();
        }
      }
    });

    // ── Ollama Proxy ─────────────────────────────────────────────────────────
    /** List all locally installed Ollama models */
    app.get("/api/ollama/models", async (_req, res) => {
      try {
        const r = await fetch(`${OLLAMA_BASE}/api/tags`);
        if (!r.ok) { res.status(r.status).json({ error: "Ollama unreachable" }); return; }
        const data = await r.json() as { models: { name: string; size: number }[] };
        res.json({ models: data.models ?? [] });
      } catch (e: any) {
        res.status(503).json({ error: e.message || "Ollama not running" });
      }
    });

    /**
     * Unload a specific Ollama model from memory.
     * 1. Immediately aborts any active generation stream for the model.
     * 2. Sends keep_alive=0 to Ollama to evict it from GPU/CPU memory.
     * Works regardless of what currentOllamaModel tracks.
     */
    app.post("/api/ollama/unload", async (req, res) => {
      const { model, nodeId } = req.body as { model: string; nodeId?: string };
      if (!model) { res.status(400).json({ error: "model is required" }); return; }

      // Use nodeId as part of the key to allow multiple nodes to use the same model
      const streamKey = nodeId ? `${model}:${nodeId}` : model;
      const streamCtrl = activeOllamaStreams.get(streamKey);

      if (streamCtrl) {
        console.log(`[Ollama] Manually aborting stream for: ${streamKey}`);
        streamCtrl.abort();
        activeOllamaStreams.delete(streamKey);
      }

      await unloadOllamaModel(model);
      if (currentOllamaModel === model) currentOllamaModel = null;
      res.json({ success: true, unloaded: model });
    });

    /** Stream a chat completion from Ollama – returns Server-Sent Events */
    app.post("/api/ollama/chat", async (req, res) => {
      const { model, prompt, options, nodeId } = req.body as {
        model: string;
        prompt: string;
        options?: Record<string, unknown>;
        nodeId?: string;
      };
      if (!model || !prompt) {
        res.status(400).json({ error: "model and prompt are required" });
        return;
      }

      // AbortController for this specific generation — can be triggered by:
      // (a) /api/ollama/unload request  (b) client disconnecting (node closed)
      const controller = new AbortController();

      try {
        await ensureModelEvicted(model);
        currentOllamaModel = model;

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // Register so /api/ollama/unload can abort us
        // Use nodeId as part of the key to allow multiple nodes to use the same model
        const streamKey = nodeId ? `${model}:${nodeId}` : model;
        activeOllamaStreams.set(streamKey, controller);

        // Also abort if the browser closes the connection (e.g. node removed while streaming)
        req.on('close', () => {
          if (!controller.signal.aborted) {
            controller.abort();
            console.log(`[Ollama] Client disconnected — aborting stream for: ${streamKey}`);
          }
          activeOllamaStreams.delete(streamKey);
        });

        const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt, stream: true, options }),
          signal: controller.signal,
        });

        if (!ollamaRes.ok || !ollamaRes.body) {
          // Read Ollama's actual error body so we can surface it to the user
          let ollamaError = `Ollama request failed (HTTP ${ollamaRes.status})`;
          try {
            const errBody = await ollamaRes.json() as { error?: string };
            if (errBody.error) ollamaError = `Ollama: ${errBody.error}`;
          } catch { /* body may not be JSON */ }
          console.error(`[Ollama] ${ollamaError} — model: ${model}`);
          res.write(`data: ${JSON.stringify({ error: ollamaError })}\n\n`);
          res.end();
          return;
        }

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                // Forward Ollama error lines immediately
                if (parsed.error) {
                  console.error(`[Ollama] In-stream error for ${model}:`, parsed.error);
                  if (!res.writableEnded) res.write(`data: ${JSON.stringify({ error: `Ollama: ${parsed.error}` })}\n\n`);
                  res.end();
                  return;
                }
                if (!res.writableEnded) res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                if (parsed.done) { res.end(); return; }
              } catch { /* ignore partial JSON */ }
            }
          }
        } catch (readErr: any) {
          if (readErr.name === 'AbortError') {
            console.log(`[Ollama] Stream aborted for: ${model}`);
          } else {
            throw readErr;
          }
        } finally {
          const streamKey = nodeId ? `${model}:${nodeId}` : model;
          activeOllamaStreams.delete(streamKey);
          reader.cancel().catch(() => { });
        }

        // Flush anything remaining in the buffer
        if (buffer.trim() && !res.writableEnded) {
          try {
            const parsed = JSON.parse(buffer);
            res.write(`data: ${JSON.stringify(parsed)}\n\n`);
          } catch { }
        }
        if (!res.writableEnded) res.end();
      } catch (e: any) {
        const streamKey = nodeId ? `${model}:${nodeId}` : model;
        activeOllamaStreams.delete(streamKey);
        if (e.name === 'AbortError') {
          if (!res.writableEnded) res.end();
          return;
        }
        if (!res.headersSent) {
          res.status(500).json({ error: e.message });
        } else if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
          res.end();
        }
      }
    });

    // ── OpenAI Proxy ─────────────────────────────────────────────────────────
    app.post("/api/openai/stream", async (req, res) => {
      const { model, prompt, apiKey, settings, systemInstruction } = req.body as {
        model: string; prompt: string; apiKey: string;
        settings?: { temperature?: number; maxTokens?: number; topP?: number };
        systemInstruction?: string;
      };
      if (!model || !prompt || !apiKey) {
        res.status(400).json({ error: "model, prompt, and apiKey are required" }); return;
      }
      try {
        const messages: { role: string; content: string }[] = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        messages.push({ role: "user", content: prompt });

        const controller = new AbortController();
        res.on('close', () => {
          if (!res.writableEnded) controller.abort();
        });

        const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature: settings?.temperature,
            max_completion_tokens: settings?.maxTokens,
            top_p: settings?.topP,
          }),
        });

        if (!upstream.ok) {
          const err = await upstream.json().catch(() => ({ error: { message: `HTTP ${upstream.status}` } })) as any;
          res.status(upstream.status).json({ error: err?.error?.message || `OpenAI error ${upstream.status}` }); return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        const startTime = Date.now();
        let ttft: number | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") { res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`); res.end(); return; }
            try {
              const parsed = JSON.parse(raw);
              const chunk = parsed.choices?.[0]?.delta?.content || "";
              if (chunk) {
                if (ttft === null) ttft = Date.now() - startTime;
                fullText += chunk;
                res.write(`data: ${JSON.stringify({ chunk, fullText, ttft })}\n\n`);
              }
            } catch { }
          }
        }
        res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`);
        res.end();
      } catch (e: any) {
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); res.end(); }
      }
    });

    // ── OpenRouter Proxy ─────────────────────────────────────────────────────
    app.post("/api/openrouter/stream", async (req, res) => {
      console.log(`[Proxy] OpenRouter Request: ${req.body?.model}`);
      const { model, prompt, apiKey, settings, systemInstruction } = req.body as {
        model: string; prompt: string; apiKey: string;
        settings?: { temperature?: number; maxTokens?: number; topP?: number };
        systemInstruction?: string;
      };
      if (!model || !prompt || !apiKey) {
        res.status(400).json({ error: "model, prompt, and apiKey are required" }); return;
      }
      const messages: { role: string; content: string }[] = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: prompt });

      const controller = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) {
          console.log(`[Proxy] Client closed connection for ${model}. Aborting upstream...`);
          controller.abort();
        }
      });

      let retryCount = 0;
      const attemptFetch = async (): Promise<any> => {
        try {
          const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Gemini Performance Dashboard"
            },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              messages,
              stream: true,
              temperature: settings?.temperature,
              max_tokens: settings?.maxTokens,
              top_p: settings?.topP,
            }),
          });

          if (!upstream.ok) {
            const err = await upstream.json().catch(() => ({ error: `HTTP ${upstream.status}` })) as any;
            console.error(`[Proxy] OpenRouter Upstream Error (${upstream.status}) [Attempt ${retryCount + 1}]:`, err);

            const errMsg = typeof err.error === 'object'
              ? (err.error.message || JSON.stringify(err.error))
              : (err.error || err.message || `OpenRouter error ${upstream.status}`);

            if (retryCount < MAX_RETRIES && (upstream.status === 408 || upstream.status >= 500 || errMsg.toLowerCase().includes('provider'))) {
              retryCount++;
              console.log(`[Proxy] Retrying OpenRouter request... (${retryCount}/${MAX_RETRIES})`);
              return attemptFetch();
            }

            res.status(upstream.status).json({ error: errMsg });
            return;
          }

          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.flushHeaders();

          const reader = upstream.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullText = "";
          const startTime = Date.now();
          let ttft: number | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") { res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`); res.end(); return; }
              try {
                const parsed = JSON.parse(raw);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  if (ttft === null) ttft = Date.now() - startTime;
                  fullText += content;
                  res.write(`data: ${JSON.stringify({ chunk: content, fullText, ttft })}\n\n`);
                }
              } catch (e) { /* ignore parse errors */ }
            }
          }
          res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`);
          res.end();
        } catch (e: any) {
          if (e.name === 'AbortError') {
            console.log(`[Proxy] OpenRouter request aborted by client. No retry.`);
            throw e;
          }
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`[Proxy] OpenRouter Fetch Exception. Retrying... (${retryCount}/${MAX_RETRIES})`, e.message);
            return attemptFetch();
          }
          throw e;
        }
      };

      try {
        await attemptFetch();
      } catch (e: any) {
        console.error(`[Proxy] OpenRouter Error:`, e);
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); res.end(); }
      }
    });

    // ── Anthropic Claude Proxy ────────────────────────────────────────────────
    app.post("/api/claude/stream", async (req, res) => {
      const { model, prompt, apiKey, settings, systemInstruction } = req.body as {
        model: string; prompt: string; apiKey: string;
        settings?: { temperature?: number; maxTokens?: number; topP?: number };
        systemInstruction?: string;
      };
      if (!model || !prompt || !apiKey) {
        res.status(400).json({ error: "model, prompt, and apiKey are required" }); return;
      }
      try {
        const body: Record<string, any> = {
          model,
          max_tokens: settings?.maxTokens ?? 8192,
          messages: [{ role: "user", content: prompt }],
          stream: true,
          temperature: settings?.temperature,
          top_p: settings?.topP,
        };
        if (systemInstruction) body.system = systemInstruction;

        const controller = new AbortController();
        res.on('close', () => {
          if (!res.writableEnded) controller.abort();
        });

        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: controller.signal,
          body: JSON.stringify(body),
        });

        if (!upstream.ok) {
          const err = await upstream.json().catch(() => ({ error: { message: `HTTP ${upstream.status}` } })) as any;
          res.status(upstream.status).json({ error: err?.error?.message || `Claude error ${upstream.status}` }); return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        const startTime = Date.now();
        let ttft: number | null = null;

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
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                if (ttft === null) ttft = Date.now() - startTime;
                fullText += parsed.delta.text;
                res.write(`data: ${JSON.stringify({ chunk: parsed.delta.text, fullText, ttft })}\n\n`);
              }
              if (parsed.type === "message_stop") {
                res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`);
                res.end(); return;
              }
            } catch { }
          }
        }
        res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`);
        res.end();
      } catch (e: any) {
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); res.end(); }
      }
    });

    // ── DeepSeek Proxy (OpenAI-compatible API) ────────────────────────────────
    app.post("/api/deepseek/stream", async (req, res) => {
      const { model, prompt, apiKey, settings, systemInstruction } = req.body as {
        model: string; prompt: string; apiKey: string;
        settings?: { temperature?: number; maxTokens?: number; topP?: number };
        systemInstruction?: string;
      };
      if (!model || !prompt || !apiKey) {
        res.status(400).json({ error: "model, prompt, and apiKey are required" }); return;
      }
      try {
        const messages: { role: string; content: string }[] = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        messages.push({ role: "user", content: prompt });

        const controller = new AbortController();
        res.on('close', () => {
          if (!res.writableEnded) controller.abort();
        });

        const upstream = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature: settings?.temperature,
            max_tokens: settings?.maxTokens,
            top_p: settings?.topP,
          }),
        });

        if (!upstream.ok) {
          const err = await upstream.json().catch(() => ({ error: { message: `HTTP ${upstream.status}` } })) as any;
          res.status(upstream.status).json({ error: err?.error?.message || `DeepSeek error ${upstream.status}` }); return;
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        const startTime = Date.now();
        let ttft: number | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") { res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`); res.end(); return; }
            try {
              const parsed = JSON.parse(raw);
              const chunk = parsed.choices?.[0]?.delta?.content || "";
              if (chunk) {
                if (ttft === null) ttft = Date.now() - startTime;
                fullText += chunk;
                res.write(`data: ${JSON.stringify({ chunk, fullText, ttft })}\n\n`);
              }
            } catch { }
          }
        }
        res.write(`data: ${JSON.stringify({ done: true, fullText, ttft })}\n\n`);
        res.end();
      } catch (e: any) {
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); res.end(); }
      }
    });

    const terminalData = new Map();
    const promptQueue = new Map();

    app.post("/api/terminal/push", (req, res) => {
      const { nodeId, output } = req.body;
      if (!nodeId) { res.status(400).send("nodeId is required"); return; }
      terminalData.set(nodeId, output);
      res.json({ success: true });
    });

    app.get("/api/terminal/poll", (req, res) => {
      const { nodeId } = req.query;
      if (!nodeId) { res.status(400).send("nodeId is required"); return; }
      const data = terminalData.get(nodeId);
      if (data) {
        terminalData.delete(nodeId);
        res.json({ output: data });
      } else {
        res.json({ output: null });
      }
    });

    // New endpoints for "Active" mode
    app.post("/api/terminal/prompt", (req, res) => {
      const { nodeId, prompt } = req.body;
      if (!nodeId || !prompt) { res.status(400).send("nodeId and prompt required"); return; }
      promptQueue.set(nodeId, prompt);
      res.json({ success: true });
    });

    app.get("/api/terminal/poll-prompt", (req, res) => {
      const { nodeId } = req.query;
      if (!nodeId) { res.status(400).send("nodeId is required"); return; }
      const prompt = promptQueue.get(nodeId);
      if (prompt) {
        promptQueue.delete(nodeId);
        res.json({ prompt });
      } else {
        res.json({ prompt: null });
      }
    });

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log('──────────────────────────────────────────────────');
      console.log(`🚀 PROTOCOL UPGRADED: HTTPS TUNNEL READY`);
      console.log(`🌐 DNS ROUTE: CLOUDFLARE (1.1.1.1)`);
      console.log(`📡 LOCAL SERVER: http://localhost:${PORT}`);
      console.log('──────────────────────────────────────────────────');
    });
  } catch (err) {
    console.error("CRITICAL: Server failed to start:", err);
    process.exit(1);
  }
}

startServer();

// Global crash protection
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
