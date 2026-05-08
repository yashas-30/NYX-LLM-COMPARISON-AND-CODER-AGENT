export type ModelProvider = 'gemini' | 'terminal' | 'ollama' | 'openai' | 'claude' | 'deepseek' | 'openrouter';

export interface OllamaModel {
  name: string;
  size: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // ── Terminal Bridge ────────────────────────────────────────
  {
    id: 'terminal-bridge',
    name: 'Terminal Bridge',
    provider: 'terminal',
    description: 'Pipe outputs from any local model via CLI or curl.'
  },

  // ── Gemini 3 Series ────────────────────────────────────────
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'gemini',
    description: 'Flagship reasoning and agentic model (Preview).'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    description: 'Stable high-speed model for massive scale.'
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'gemini',
    description: 'High-volume production performance (Preview).'
  },

  // ── OpenAI ─────────────────────────────────────────────────
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    description: "OpenAI's most capable model for complex tasks."
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Fast multimodal GPT-4 class model.'
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    provider: 'openai',
    description: 'Fast and efficient reasoning model.'
  },

  // ── Anthropic Claude ───────────────────────────────────────
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'claude',
    description: "Anthropic's most intelligent model."
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'claude',
    description: 'Balanced speed and intelligence from Anthropic.'
  },
  {
    id: 'claude-haiku-3-5',
    name: 'Claude Haiku 3.5',
    provider: 'claude',
    description: 'Fast and compact Claude model.'
  },

  // ── DeepSeek ───────────────────────────────────────────────
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    description: 'DeepSeek V3 chat model — strong coding & reasoning.'
  },
  { 
    id: 'deepseek-reasoner', 
    name: 'DeepSeek R1', 
    provider: 'deepseek', 
    description: 'DeepSeek R1 reasoning model with chain-of-thought.' 
  },

  // ── OpenRouter (VERIFIED FREE MODELS) ──────────────────────
  { id: 'openrouter/auto', name: 'OpenRouter Auto (Free)', provider: 'openrouter', description: 'Intelligent auto-routing to the healthiest free model' },
  { id: 'openai/gpt-oss-120b:free', name: 'gpt-oss-120b (free)', provider: 'openrouter', description: 'OpenAI OSS variant' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM-4.5-Air (free)', provider: 'openrouter', description: 'Z-ai GLM flagship' },
  { id: 'tencent/hy3-preview:free', name: 'Hy3 preview (free)', provider: 'openrouter', description: 'Tencent Hy3 (Free Tier)' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super (free)', provider: 'openrouter', description: 'NVIDIA 120B reasoning' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'LFM-2.5 Thinking (free)', provider: 'openrouter', description: 'Liquid Thinking model' },
  { id: 'baidu/cobuddy:free', name: 'CoBuddy (free)', provider: 'openrouter', description: 'Baidu CoBuddy assistant' },
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', provider: 'openrouter', description: 'Latest Google SOTA small model' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (free)', provider: 'openrouter', description: 'Next-gen Google MoE' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (free)', provider: 'openrouter', description: 'Meta high-perf instruct' },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (free)', provider: 'openrouter', description: 'Alibaba code specialist' },

  // ── OpenRouter (CURATED PREMIUM MODELS) ────────────────────
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'openrouter', description: 'Latest flagship with native thinking' },
  { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)', provider: 'openrouter', description: 'Claude 3.7 with extended chain-of-thought' },
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'openrouter', description: 'Next-gen reasoning and intelligence' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openrouter', description: 'Premium multi-modal flagship' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'openrouter', description: 'High-performance coding specialist' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'openrouter', description: 'Advanced programming assistant' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', description: 'SOTA open-source performance' },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'openrouter', description: 'Massive context and complex logic' },
  { id: 'google/gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'openrouter', description: 'Ultra-low latency responses' },
  { id: 'openai/o3-mini', name: 'OpenAI o3-mini', provider: 'openrouter', description: 'Next-gen reasoning model' },
];


export interface AnalysisJudgement {
  bestResponseId?: string;
  consensus?: string;
  methodology?: string;
  differences?: {
    category: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }[];
  critique: Record<string, {
    analysis: string;
    actionableFeedback: string;
    score: number | string;
  }>;
}

export interface CodeAnalysisResult {
  isCodeResponse: boolean;           // false if outputs don't contain code
  language: string;                  // detected language e.g. "Python", "TypeScript"
  bestModelId: string;               // model with the overall best code
  combinedCode: string;              // synthesized best-of implementation
  combinedExplanation: string;       // explanation of what was taken from each model
  modelCodeAnalysis: Record<string, {
    codeQualityScore: number;        // 0-100
    strengths: string[];             // specific good things about this model's code
    weaknesses: string[];            // specific issues
    extractedCode: string;           // the code block extracted from response
  }>;
  codeDifferences: {
    aspect: string;                  // e.g. "Error Handling", "Algorithm Choice"
    description: string;
    winner: string;                  // modelId that did this better
  }[];
}


export interface ComparisonHistoryItem {
  id: string;
  prompt: string;
  timestamp: number;
  columns: {
    modelId: string;
    output: string;
    status: 'success' | 'error' | 'idle' | 'loading';
  }[];
}

export interface ComparisonColumn {
  id: string;
  modelId?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  output: string;
  localPrompt?: string;
  error?: string;
  metadata?: {
    latency?: number;
    tokens?: number;
    provider?: string;
    tokensPerSecond?: number;
  };
  judgement?: string; // Point-specific judgement
}
