import fs from 'fs';
import path from 'path';
import { APP_STATE_DIR } from './paths.ts';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

type Store = Record<string, Conversation>;

const STORE_PATH = path.join(APP_STATE_DIR, 'conversations.json');

function load(): Store {
  try {
    return fs.existsSync(STORE_PATH) ? JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) : {};
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err: any) {
    console.error('[ConversationStore] Save failed:', err.message);
  }
}

export const ConversationStore = {
  list(): Conversation[] {
    return Object.values(load()).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Conversation | null {
    return load()[id] ?? null;
  },
  upsert(conv: Conversation): void {
    const s = load();
    s[conv.id] = conv;
    save(s);
  },
  delete(id: string): void {
    const s = load();
    delete s[id];
    save(s);
  },
  clear(): void {
    save({});
  },
};
