// ─── server.ts (entry point) ──────────────────────────────────────────────────
// Thin assembler — wires routes together and starts Vite + Express.
// To add a new provider: create server/routes/myprovider.ts, then add 2 lines here.

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'node:http';
import dns from 'node:dns';

import './server/lib/apiAgent.js'; // 🚀 Init global connection pooling

import { geminiRouter }     from './server/routes/gemini.js';
import { openrouterRouter } from './server/routes/openrouter.js';
import { nvidiaRouter }     from './server/routes/nvidia.js';
import { terminalRouter }   from './server/routes/terminal.js';
import { agentsRouter }     from './server/routes/agents.js';
import { opencodeRouter }   from './server/routes/opencode.js';
import { CacheServer }      from './server/lib/cache.js';
import compression from 'compression';
import { warmupDNS, startFastifyServer } from './server/lib/fastifyApi.js';


// ── DNS: prefer Cloudflare for fastest lookups on Windows ─────────────────────
try { dns.setServers(['1.1.1.1', '8.8.8.8']); } catch { }

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const PORT       = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  // Start Fastify server for high-performance streaming API proxying
  try {
    await warmupDNS();
    await startFastifyServer(3001);
  } catch (err: any) {
    console.error('Failed to start Fastify server:', err.message);
  }

  const app = express();
  
  // ── Optimization: Compress non-streaming responses ──────────────────────────
  app.use(compression({
    filter: (req, res) => {
      // Don't compress SSE streams as it blocks flushing
      if (req.headers.accept === 'text/event-stream' || req.path.includes('/stream')) return false;
      return compression.filter(req, res);
    }
  }));

  // ── Security & performance headers ───────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(express.json({ limit: '4mb' }));

  // ── Health check ─────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // ── Provider routes ───────────────────────────────────────────────────────────
  // To add a new provider: import its router above and mount it here
  app.use('/api/gemini',     geminiRouter);
  app.use('/api/openrouter', openrouterRouter);
  app.use('/api/nvidia',     nvidiaRouter);
  app.use('/api/terminal',   terminalRouter);
  app.use('/api/agents',     agentsRouter);
  app.use('/api/opencode',   opencodeRouter);

  // ── Model list proxy (Settings page live model discovery) ────────────────────
  app.post('/api/models/list', async (req, res) => {
    const { provider, apiKey } = req.body;
    try {
      let url = '';
      const headers: Record<string, string> = {};
      if (provider === 'gemini')     url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      if (provider === 'openrouter') { url = 'https://openrouter.ai/api/v1/models'; headers['Authorization'] = `Bearer ${apiKey}`; }
      if (provider === 'nvidia')     { url = 'https://integrate.api.nvidia.com/v1/models'; headers['Authorization'] = `Bearer ${apiKey}`; }

      const r = await fetch(url, { headers });
      const data = await r.json();

      let models: string[] = [];
      if (provider === 'gemini')     models = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
      if (provider === 'openrouter') models = data.data?.map((m: any) => m.id) || [];
      if (provider === 'nvidia')     models = data.data?.map((m: any) => m.id) || [];

      res.json({ models });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Quota/Credits Proxy ──────────────────────────────────────────────────────
  app.post('/api/models/quota', async (req, res) => {
    const { provider, apiKey } = req.body;
    try {
      if (provider === 'openrouter') {
        const r = await fetch('https://openrouter.ai/api/v1/credits', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const data = await r.json();
        return res.json(data);
      }
      if (provider === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (r.ok) return res.json({ status: 'ok' });
      }
      res.json({});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Cache Server API routes ───────────────────────────────────────────────
  app.post('/api/cache/get', (req, res) => {
    try {
      const key = CacheServer.generateKey(req.body);
      const text = CacheServer.get(key);
      if (text !== null) {
        return res.json({ hit: true, text, key });
      }
      return res.json({ hit: false, key });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/cache/set', (req, res) => {
    const { key, data, provider, model } = req.body;
    try {
      CacheServer.set(key, data, provider, model);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/cache/stats', (_req, res) => {
    try {
      const stats = CacheServer.getStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/cache/clear', (_req, res) => {
    try {
      const result = CacheServer.clear();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Fastify routes (all AI providers) ───────────────────────────────────────
  // Proxy requests to Fastify server on port 3001 to maintain streaming performance
  app.all('/api/fastify/*', async (req, res) => {
    const targetUrl = `http://127.0.0.1:3001${req.url.replace('/api/fastify', '')}`;
    try {
      const headers: Record<string, string> = {};
      Object.entries(req.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== 'content-length' && lowerKey !== 'host' && lowerKey !== 'connection') {
          headers[key] = Array.isArray(value) ? value.join(', ') : (value || '');
        }
      });

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
      });
      
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value);
        }
      });
      res.status(response.status);
      res.flushHeaders();
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (e: any) {
      console.error('[Fastify Proxy Error]:', e.message);
      res.status(500).send({ error: `Fastify Proxy Error: ${e.message}` });
    }
  });

  // ── Vite dev middleware ───────────────────────────────────────────────────────
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);

  // ── HTTP server with keep-alive ───────────────────────────────────────────────
  // Keep-alive ensures the browser reuses the same TCP connection for every
  // streaming request, eliminating ~50-150ms of handshake overhead per call.
  const server = http.createServer(app);
  server.keepAliveTimeout = 75_000;  // 75s (stay open)
  server.headersTimeout   = 76_000;
  server.maxConnections   = 512;
  server.on('connection', (socket) => {
    socket.setNoDelay(true); // Disable Nagle's algorithm for instant small packet delivery
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NYX READY: http://localhost:${PORT}`);
  });
}

startServer();
process.on('unhandledRejection', (e) => console.error('[UnhandledRejection]', e));
process.on('uncaughtException',  (e) => console.error('[UncaughtException]', e));
