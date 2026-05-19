import { useState, useEffect, useCallback } from 'react';
import { AIService } from '../../core/services/ai.service';
import { Provider } from '../../core/types';

export type Status = 'online' | 'offline' | 'no-key';

export const useProviderStatus = (apiKeys: Record<string, string>, lmStudioBaseUrl: string, ollamaBaseUrl: string) => {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  const checkAllStatuses = useCallback(async () => {
    const providers: string[] = ['gemini', 'openrouter', 'nvidia', 'ollama', 'lmstudio', 'opencode', 'openai', 'anthropic', 'deepseek', 'groq', 'mistral', 'together'];
    const newStatuses: Record<string, Status> = {};

    await Promise.all(providers.map(async (p) => {
      const key = apiKeys[p];
      newStatuses[p] = await AIService.checkStatus(p, key, { lmStudioBaseUrl, ollamaBaseUrl });
    }));

    setStatuses(newStatuses);
  }, [apiKeys, lmStudioBaseUrl, ollamaBaseUrl]);

  useEffect(() => {
    checkAllStatuses();
    const interval = setInterval(checkAllStatuses, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkAllStatuses]);

  return { statuses, refreshStatuses: checkAllStatuses };
};
