/**
 * @file src/core/utils/provider.ts
 * @description Shared utilities for detecting AI providers and model capabilities.
 */

import { Provider, ModelDefinition } from '../types';
import { AVAILABLE_MODELS } from '@shared/config/models';

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  terminal: 'Terminal',
  'nyx-native': 'NYX Native',
};

export const CLOUD_PROVIDERS: string[] = ['gemini'];

export const LOCAL_PROVIDERS: string[] = ['nyx-native'];

const LOCAL_MODEL_IDS = new Set([
  'nyx-gemma-4-e2b-it',
  'gemma-2-2b-it',
  'gemma-2-9b-it',
  'gemma-3-4b-it',
  'gemma-3-12b-it',
  'llama-3.2-1b-native',
  'llama-3.2-3b-native',
  'llama-3-8b-instruct',
  'llama-3.1-8b-native',
  'codellama-7b-instruct',
  'codellama-13b-instruct',
  'phi-3-mini-instruct',
  'phi-4-mini-instruct',
  'phi-4-instruct',
  'qwen2.5-1.5b-instruct',
  'qwen2.5-coder-1.5b-native',
  'qwen2.5-coder-3b-native',
  'qwen2.5-coder-7b-native',
  'qwen2.5-coder-14b-native',
  'qwen2.5-7b-native',
  'qwen3-8b-native',
  'deepseek-r1-distill-qwen-1.5b',
  'deepseek-r1-distill-qwen-7b',
  'deepseek-r1-distill-qwen-14b',
  'deepseek-r1-distill-llama-8b',
  'mistral-7b-v0.3',
  'openchat-3.5-7b',
  'nemotron-mini-4b',
  'airllm-llama-3.3-70b',
  'airllm-qwen-2.5-coder-32b',
  'airllm-deepseek-r1-8b',
  'airllm-local-llama'
]);

/**
 * Structured provider detection that checks in priority order.
 */
export const detectProvider = (
  modelId: string
): Provider => {
  if (!modelId) return 'gemini';

  // 1. Check in local GGUF/AirLLM model presets first
  if (LOCAL_MODEL_IDS.has(modelId) || modelId.startsWith('airllm-')) {
    return 'nyx-native';
  }

  // 2. Check in static AVAILABLE_MODELS presets
  const availableModel = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (availableModel) return availableModel.provider;

  // 3. Check GGUF and custom patterns for imported models
  const lowerId = modelId.toLowerCase();
  if (lowerId.endsWith('.gguf') || 
      lowerId.includes('.gguf') || 
      lowerId.startsWith('custom-')) {
    return 'nyx-native';
  }

  return 'gemini';
};

/**
 * Gets provider from model ID with proper fallback to AVAILABLE_MODELS.
 */
export const getProviderForModel = (modelId: string): Provider => {
  // 1. Check in local GGUF/AirLLM model presets first
  if (LOCAL_MODEL_IDS.has(modelId) || modelId.startsWith('airllm-')) {
    return 'nyx-native';
  }

  // 2. Check in static AVAILABLE_MODELS presets
  const availableModel = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (availableModel) return availableModel.provider;

  // 3. Check GGUF and custom patterns for imported models
  const lowerId = modelId.toLowerCase();
  if (lowerId.endsWith('.gguf') || 
      lowerId.includes('.gguf') || 
      lowerId.startsWith('custom-')) {
    return 'nyx-native';
  }

  return 'gemini';
};

/**
 * Checks if a model ID refers to a local instance.
 */
export const isLocalModel = (modelId: string): boolean => {
  const provider = getProviderForModel(modelId);
  return LOCAL_PROVIDERS.includes(provider);
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
