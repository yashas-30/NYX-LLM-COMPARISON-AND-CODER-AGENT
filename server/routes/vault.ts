import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loadKeys, saveKeys, createSessionToken, getVaultStatus, backupVault, exportVault, importVault } from '../lib/keyVault.ts';
import { validate } from '../middleware/validate.ts';
import { vaultStoreSchema } from '../schemas/index.ts';

export const vaultRouter = Router();

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token requests, please try again later.' }
});

const vaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many vault operations, please try again later.' }
});

vaultRouter.post('/store', validate(vaultStoreSchema), vaultLimiter, (req, res) => {
  const { keys } = req.body;
  try {
    const currentKeys = loadKeys();
    const updatedKeys = { ...currentKeys, ...keys };
    saveKeys(updatedKeys);
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleGetToken = (req: any, res: any) => {
  const isStream = req.query.stream === 'true';
  const token = createSessionToken(isStream);
  res.json({ token, expiresAt: Date.now() + 5 * 60 * 1000 });
};

vaultRouter.get('/token', tokenLimiter, handleGetToken);
vaultRouter.get('/status', (req, res) => {
  res.json(getVaultStatus());
});

vaultRouter.post('/backup', vaultLimiter, (req, res) => {
  try {
    const backupPath = backupVault();
    res.json({ status: 'ok', path: backupPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

vaultRouter.post('/export', vaultLimiter, (req, res) => {
  try {
    const data = exportVault();
    res.json({ status: 'ok', data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

vaultRouter.post('/import', vaultLimiter, (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid encrypted vault data in body' });
  }
  try {
    importVault(data);
    res.json({ status: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
