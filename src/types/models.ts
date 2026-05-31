// ─── Model & Provider Types ───────────────────────────────────────────────────
// Add new providers here → they will automatically appear in the UI selector

export type ModelProvider =
  | 'gemini'
  | 'terminal'
  | 'nyx-native';

export interface ModelSpecs {
  contextWindow: string;
  trainingData: string;
  maxOutput: string;
  modality: string;
  parameters?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  isLocal?: boolean;
  specs?: ModelSpecs;
}

export type Provider = ModelProvider;

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  tier: 'fast' | 'balanced' | 'powerful';
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  description: string;
}

