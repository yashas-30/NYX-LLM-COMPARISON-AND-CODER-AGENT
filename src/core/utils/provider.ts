/**
 * @file src/core/utils/provider.ts
 * @description Shared utilities for detecting AI providers and model capabilities.
 */

import { Provider, ModelDefinition } from '../types';
import { AVAILABLE_MODELS } from '@/src/config/models';

const NVIDIA_MODEL_IDS = new Set(AVAILABLE_MODELS.filter(m => m.provider === 'nvidia').map(m => m.id));

const PROVIDER_PRIORITY = [
  { check: (id: string) => NVIDIA_MODEL_IDS.has(id), provider: 'nvidia' as Provider },
  { check: (id: string) => id.startsWith('opencode/') || id.startsWith('opencode-'), provider: 'opencode' as Provider },
  { check: (id: string) => id.includes('/') && !NVIDIA_MODEL_IDS.has(id), provider: 'openrouter' as Provider },
];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  nvidia: 'NVIDIA NIM',
  openrouter: 'OpenRouter',
  terminal: 'Terminal',
  opencode: 'Open Code',
};

export const CLOUD_PROVIDERS: Provider[] = ['gemini', 'nvidia', 'openrouter', 'opencode'];

export const LOCAL_PROVIDERS: Provider[] = [];

/**
 * Structured provider detection that checks in priority order.
 */
export const detectProvider = (
  modelId: string,
  ollamaModels: ModelDefinition[] = [],
  lmStudioModels: ModelDefinition[] = []
): Provider => {
  for (const { check, provider } of PROVIDER_PRIORITY) {
    if (check(modelId)) return provider;
  }

  return 'gemini';
};

/**
 * Gets provider from model ID with proper fallback to AVAILABLE_MODELS.
 */
export const getProviderForModel = (modelId: string): Provider => {
  if (NVIDIA_MODEL_IDS.has(modelId)) return 'nvidia';

  const availableModel = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (availableModel) return availableModel.provider;

  for (const { check, provider } of PROVIDER_PRIORITY) {
    if (check(modelId)) return provider;
  }

  return 'gemini';
};

/**
 * Checks if a model ID refers to a local instance.
 */
export const isLocalModel = (modelId: string): boolean => {
  return false;
};

/**
 * Checks if a provider requires an API key.
 */
export const requiresApiKey = (provider: Provider): boolean => {
  return CLOUD_PROVIDERS.includes(provider);
};

/**
 * Resolves the effective API key for a given provider, handling fallbacks (e.g., opencode -> openrouter).
 */
export const getEffectiveApiKey = (provider: string, apiKeys: Record<string, string>): string | undefined => {
  const key = apiKeys[provider]?.trim();
  if (key && key !== '') return key;

  return undefined;
};

export const getApiKeyName = (provider: Provider): string => {
  return provider.toUpperCase();
};
