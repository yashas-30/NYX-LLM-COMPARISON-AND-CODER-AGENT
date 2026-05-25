import { z } from 'zod';

export const workspaceSchema = z.object({
  path: z.string().min(1).max(1024)
});

export const vaultStoreSchema = z.object({
  keys: z.record(z.string(), z.string()).refine((val) => Object.keys(val).length <= 100, {
    message: "Keys object can contain at most 100 keys"
  })
});

export const cacheSetSchema = z.object({
  key: z.string().min(1).max(2048),
  data: z.any(),
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128)
});

export const modelQuerySchema = z.object({
  provider: z.string().min(1).max(64),
  apiKey: z.string().optional()
});

export const writeFileSchema = z.object({
  filePath: z.string().min(1).max(1024),
  content: z.string(),
  overwrite: z.boolean().optional()
});
