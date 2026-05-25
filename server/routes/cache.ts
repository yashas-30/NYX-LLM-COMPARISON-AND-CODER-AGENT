import { Router } from 'express';
import { CacheServer } from '../lib/cache.ts';
import { validate } from '../middleware/validate.ts';
import { cacheSetSchema } from '../schemas/index.ts';

export const cacheRouter = Router();

cacheRouter.post('/get', (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid payload: request body must be an object' });
    }
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

cacheRouter.post('/set', validate(cacheSetSchema), (req, res) => {
  const { key, data, provider, model } = req.body;
  try {
    CacheServer.set(key, data, provider, model);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

cacheRouter.get('/stats', (_req, res) => {
  try {
    const stats = CacheServer.getStats();
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

cacheRouter.post('/clear', (_req, res) => {
  try {
    const result = CacheServer.clear();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
