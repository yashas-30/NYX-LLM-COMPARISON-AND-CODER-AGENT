import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@src/infrastructure/types';
import { useNyxStore } from '@src/shared/store/useNyxStore';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'nyx-chat-sessions';
const MAX_SESSIONS = 50;

function generateId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function deriveTitleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const words = firstUser.content.trim().split(/\s+/).slice(0, 6).join(' ');
  return words.length > 0 ? words : 'New Chat';
}

export function useChatSessions() {
  const privacyMode = useNyxStore(state => state.privacyMode);
  
  const [privacySessions, setPrivacySessions] = useState<ChatSession[]>([]);
  const [regularSessions, setRegularSessions] = useState<ChatSession[]>([]);
  const [activeSid, setActiveSid] = useState<string | null>(null);

  // Computed sessions list
  const sessions = privacyMode ? privacySessions : regularSessions;

  // Load sessions from API or fallback to localStorage on mount
  useEffect(() => {
    let activeToken = true;

    async function loadSessions() {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const serverSessions = await res.json();
          if (Array.isArray(serverSessions) && activeToken) {
            setRegularSessions(serverSessions);
            if (serverSessions.length > 0 && !privacyMode) {
              setActiveSid(serverSessions[0].id);
            }
            return;
          }
        }
      } catch (e) {
        console.warn('[useChatSessions] Backend fetch failed, falling back to localStorage:', e);
      }

      // Fallback
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && activeToken) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setRegularSessions(parsed);
            if (parsed.length > 0 && !privacyMode) {
              setActiveSid(parsed[0].id);
            }
          }
        }
      } catch (e) {
        console.warn('[useChatSessions] Fallback load failed:', e);
      }
    }

    loadSessions();

    return () => {
      activeToken = false;
    };
  }, [privacyMode]);

  // Persist sessions on every change (regular sessions only!)
  useEffect(() => {
    if (regularSessions.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(regularSessions.slice(0, MAX_SESSIONS)));
    } catch (e) {
      console.warn('[useChatSessions] Failed to save sessions:', e);
    }
  }, [regularSessions]);

  // Manage initial session creation when switching modes
  useEffect(() => {
    if (privacyMode) {
      if (privacySessions.length > 0) {
        setActiveSid(privacySessions[0].id);
      } else {
        const id = generateId();
        const now = Date.now();
        const session: ChatSession = {
          id,
          title: 'Private Chat',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        setPrivacySessions([session]);
        setActiveSid(id);
      }
    } else {
      if (regularSessions.length > 0) {
        setActiveSid(regularSessions[0].id);
      } else {
        setActiveSid(null);
      }
    }
  }, [privacyMode]);

  // Listen for inactivity self-destruct trigger
  useEffect(() => {
    const handleWipe = () => {
      setPrivacySessions([]);
      setActiveSid(null);
    };
    window.addEventListener('nyx:privacy-inactivity-wipe', handleWipe);
    return () => {
      window.removeEventListener('nyx:privacy-inactivity-wipe', handleWipe);
    };
  }, []);

  const createSession = useCallback((initialMessages: ChatMessage[] = []): string => {
    const id = generateId();
    const now = Date.now();
    const session: ChatSession = {
      id,
      title: privacyMode ? 'Private Chat' : deriveTitleFromMessages(initialMessages),
      messages: initialMessages,
      createdAt: now,
      updatedAt: now,
    };

    if (privacyMode) {
      setPrivacySessions(prev => [session, ...prev]);
      setActiveSid(id);
      return id;
    }

    setRegularSessions(prev => [session, ...prev]);
    setActiveSid(id);

    // Sync to backend
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    }).catch(err => console.warn('[useChatSessions] Failed to sync session creation:', err));

    return id;
  }, [privacyMode]);

  const updateSession = useCallback((sid: string, messages: ChatMessage[]) => {
    const now = Date.now();

    if (privacyMode) {
      setPrivacySessions(prev =>
        prev.map(s => {
          if (s.id === sid) {
            return {
              ...s,
              messages,
              title: 'Private Chat',
              updatedAt: now,
            };
          }
          return s;
        })
      );
      return;
    }

    setRegularSessions(prev =>
      prev.map(s => {
        if (s.id === sid) {
          const updated = {
            ...s,
            messages,
            title: deriveTitleFromMessages(messages),
            updatedAt: now,
          };
          // Sync to backend
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).catch(err => console.warn('[useChatSessions] Failed to sync session update:', err));
          return updated;
        }
        return s;
      })
    );
  }, [privacyMode]);

  const deleteSession = useCallback((sid: string) => {
    if (privacyMode) {
      setPrivacySessions(prev => prev.filter(s => s.id !== sid));
      setActiveSid(prev => (prev === sid ? null : prev));
      return;
    }

    setRegularSessions(prev => prev.filter(s => s.id !== sid));
    setActiveSid(prev => (prev === sid ? null : prev));

    // Sync to backend
    fetch(`/api/conversations/${sid}`, {
      method: 'DELETE'
    }).catch(err => console.warn('[useChatSessions] Failed to sync session deletion:', err));
  }, [privacyMode]);

  const switchSession = useCallback((sid: string | null) => {
    setActiveSid(sid);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSid) ?? null;

  return {
    sessions,
    activeSid,
    activeSession,
    createSession,
    updateSession,
    deleteSession,
    switchSession,
  };
}
