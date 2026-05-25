import { Router } from 'express';
import { ConversationStore } from '../lib/conversationStore.ts';

export const conversationsRouter = Router();

conversationsRouter.get('/', (_req, res) => {
  try {
    res.json(ConversationStore.list());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

conversationsRouter.get('/:id', (req, res) => {
  try {
    const c = ConversationStore.get(req.params.id);
    if (c) {
      res.json(c);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

conversationsRouter.post('/', (req, res) => {
  try {
    ConversationStore.upsert(req.body);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

conversationsRouter.delete('/:id', (req, res) => {
  try {
    ConversationStore.delete(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

conversationsRouter.delete('/', (_req, res) => {
  try {
    ConversationStore.clear();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
