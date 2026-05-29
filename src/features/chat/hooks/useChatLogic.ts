import { useState, useCallback, useRef } from 'react';
import { AIService } from '@src/core/services/ai.service';
import { useNyxStore } from '@src/shared/store/useNyxStore';
import type { ChatMessage } from '@src/infrastructure/types';

export function useChatLogic() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { models, apiKeys, modelSettings } = useNyxStore();
  const activeModel = models['nyx'];

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeModel || isLoading) return;

      const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);

      abortRef.current = new AbortController();

      try {
        const provider = activeModel.split('/')[0];
        const modelId = activeModel.split('/').slice(1).join('/');
        const apiKey = apiKeys[provider];

        const response = await AIService.execute(
          modelId,
          provider,
          content,
          apiKey,
          undefined,
          modelSettings,
          (chunk) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === 'assistant') lastMsg.content = chunk;
              return updated;
            });
          },
          abortRef.current.signal,
          { history: messages.slice(0, -1) }
        );

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = response.text;
          updated[updated.length - 1].metrics = response.metrics;
          return updated;
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'system',
              content: `Error: ${error.message}`,
              timestamp: Date.now(),
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeModel, apiKeys, modelSettings, messages, isLoading]
  );

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const clearChat = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, stopGeneration, clearChat };
}
