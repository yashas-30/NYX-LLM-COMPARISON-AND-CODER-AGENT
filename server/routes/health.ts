import { Router } from 'express';
import { exec } from 'child_process';
import checkDiskSpace from 'check-disk-space';
import { APP_STATE_DIR } from '../lib/paths.ts';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    timestamp: Date.now(),
    dependencies: {} as Record<string, 'ok' | 'degraded' | 'down'>,
  };

  // 1. Check llama-server health
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const r = await fetch('http://127.0.0.1:12345/health', { signal: controller.signal });
    clearTimeout(timeout);
    checks.dependencies.llamaServer = r.ok ? 'ok' : 'degraded';
  } catch (err: any) {
    checks.dependencies.llamaServer = 'down';
  }

  // 2. Check docker health
  try {
    await new Promise<void>((resolve, reject) => {
      exec('docker ps', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    checks.dependencies.docker = 'ok';
  } catch (err: any) {
    checks.dependencies.docker = 'down';
  }

  // 3. Check disk space health
  try {
    const disk = await checkDiskSpace(APP_STATE_DIR);
    // Degraded if less than 1GB free
    checks.dependencies.disk = disk.free > 1 * 1024 * 1024 * 1024 ? 'ok' : 'degraded';
  } catch (err: any) {
    checks.dependencies.disk = 'down';
  }

  const overall = Object.values(checks.dependencies).every(s => s === 'ok') ? 'ok'
    : Object.values(checks.dependencies).some(s => s === 'down') ? 'degraded' : 'ok';

  res.status(overall === 'ok' ? 200 : 503).json(checks);
});
