import { Router } from 'express';
import { CacheServer } from '../lib/cache.ts';
import { LocalModelRunner } from '../lib/localModelRunner.ts';

export const metricsRouter = Router();

metricsRouter.get('/metrics', (req, res) => {
  const cacheStats = CacheServer.getStats();
  const total = cacheStats.hits + cacheStats.misses;

  res.json({
    cache: {
      hitRate: total > 0 ? cacheStats.hits / total : 0,
      ...cacheStats,
    },
    models: {
      state: LocalModelRunner.getState(),
      activeModel: LocalModelRunner.getActiveModel(),
      activeContextSize: LocalModelRunner.getActiveContextSize(),
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  });
});
