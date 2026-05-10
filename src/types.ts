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

  // ── Gemini 3 Series (Agentic & Reasoning) ──────────────────
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    provider: 'gemini',
    description: 'Flagship reasoning and agentic model (Next-gen).'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    description: 'Stable high-speed model for massive scale.'
  },

  // ── Gemini 2.5 & 2.0 Series ────────────────────────────────
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'High-intelligence reasoning with massive context.'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini-2.5-flash',
    provider: 'gemini',
    description: 'The standard for high-speed AI responses in 2026.'
  },
  {
    id: 'gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro (Exp)',
    provider: 'gemini',
    description: 'Advanced reasoning and complex logic.'
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Exp)',
    provider: 'gemini',
    description: 'Next-gen performance and ultra-low latency.'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Stable flagship with 2M context window.'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Standard high-speed production model.'
  },

  // ── OpenAI ─────────────────────────────────────────────────
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    description: "OpenAI's 2026 flagship multimodal reasoning model."
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    description: 'Fast and efficient reasoning model.'
  },
  {
    id: 'o3',
    name: 'OpenAI o3',
    provider: 'openai',
    description: 'Next-gen reasoning specialist with verified logic.'
  },

  // ── Anthropic Claude ───────────────────────────────────────
  {
    id: 'claude-3-7-sonnet-latest',
    name: 'Claude 3.7 Sonnet',
    provider: 'claude',
    description: "Anthropic's most intelligent model with native thinking."
  },
  {
    id: 'claude-3-7-haiku-latest',
    name: 'Claude 3.7 Haiku',
    provider: 'claude',
    description: 'Fast and compact 2026 Claude model.'
  },
  {
    id: 'claude-opus-latest',
    name: 'Claude Opus (Latest)',
    provider: 'claude',
    description: 'Ultimate reasoning for the most complex tasks.'
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

  // ── OpenRouter (FREE TIER 2026) ──────────────────────────
  { id: 'openrouter/auto', name: 'OpenRouter Auto (Free)', provider: 'openrouter', description: 'Intelligent auto-routing to the healthiest free model' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (free)', provider: 'openrouter', description: 'Google DeepMind 30.7B dense instruction model.' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B (free)', provider: 'openrouter', description: 'Instruction-tuned MoE model from Google.' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (free)', provider: 'openrouter', description: 'Meta multilingual 70B instruction model.' },
  { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B (free)', provider: 'openrouter', description: 'Open-weight 117B MoE variant from OpenAI.' },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (free)', provider: 'openrouter', description: 'Alibaba 480B MoE code generation specialist.' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super (free)', provider: 'openrouter', description: 'NVIDIA 120B high-performance open model.' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'LFM 2.5 Thinking (free)', provider: 'openrouter', description: 'LiquidAI lightweight reasoning-focused model.' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air (free)', provider: 'openrouter', description: 'Z.ai high-efficiency lightweight flagship.' },
  { id: 'inclusionai/ring-2.6-1t:free', name: 'Ring 2.6 1T (free)', provider: 'openrouter', description: '1T-parameter scale thinking model.' },
  { id: 'poolside/laguna-m.1:free', name: 'Laguna M.1 (free)', provider: 'openrouter', description: 'Poolside flagship coding agent model.' },
  { id: 'tencent/hy3-preview:free', name: 'Hunyuan 3 Preview (free)', provider: 'openrouter', description: 'Tencent high-efficiency MoE model.' },
  { id: 'baidu/cobuddy:free', name: 'CoBuddy (free)', provider: 'openrouter', description: 'Baidu Qianfan code generation specialist.' },
  { id: 'minimax/minimax-m2.5:free', name: 'MiniMax M2.5 (free)', provider: 'openrouter', description: 'SOTA large model designed for high-quality chat.' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 405B (free)', provider: 'openrouter', description: 'NousResearch generalist model on 405B base.' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Dolphin 24B (free)', provider: 'openrouter', description: 'Uncensored Venice edition of Dolphin Mistral.' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (free)', provider: 'openrouter', description: 'Compact Meta multilingual instruction model.' },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', name: 'LFM 2.5 Instruct (free)', provider: 'openrouter', description: 'Compact high-performance LiquidAI model.' },

  // ── OpenRouter (HIGH PERFORMANCE MODELS 2026) ──────────────
  { id: 'openai/gpt-5.5-pro', name: 'GPT-5.5 Pro', provider: 'openrouter', description: 'OpenAI 2026 flagship via OpenRouter' },
  { id: 'openai/gpt-5.4-nano', name: 'GPT-5.4 Nano', provider: 'openrouter', description: 'Ultra-fast compact OpenAI model' },
  { id: 'anthropic/claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'openrouter', description: 'Anthropic next-gen reasoning flagship' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'openrouter', description: 'Lightning fast Claude haiku series' },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'openrouter', description: 'Meta next-gen 1T+ parameter model' },
  { id: 'meta-llama/llama-3.2-1b-instruct', name: 'Llama 3.2 1B', provider: 'openrouter', description: 'Compact Meta instruction model' },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', provider: 'openrouter', description: 'Google next-gen agentic flagship' },
  { id: 'google/gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'openrouter', description: 'High-speed Google Flash 3.1' },
  { id: 'qwen/qwen-3.6-max-preview', name: 'Qwen 3.6 Max', provider: 'openrouter', description: 'Alibaba flagship reasoning model' },
  { id: 'qwen/qwen-3.6-flash', name: 'Qwen 3.6 Flash', provider: 'openrouter', description: 'High-speed Qwen variant' },
  { id: 'mistralai/mistral-large-3-2512', name: 'Mistral Large 3', provider: 'openrouter', description: 'Mistral flagship dense model' },
  { id: 'mistralai/ministral-3-3b-2512', name: 'Ministral 3 3B', provider: 'openrouter', description: 'Edge-optimized Mistral model' },
  { id: 'deepseek/deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'openrouter', description: 'DeepSeek next-gen MoE flagship' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'openrouter', description: 'High-speed DeepSeek V4' },
  { id: 'x-ai/grok-4.3', name: 'Grok 4.3', provider: 'openrouter', description: 'xAI flagship real-time reasoning' },
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'openrouter', description: 'High-speed Grok variant' },
  { id: 'zhipu/glm-5.1', name: 'GLM 5.1', provider: 'openrouter', description: 'Zhipu next-gen high-reasoning flagship' },
  { id: 'zhipu/glm-4.7-flash', name: 'GLM 4.7 Flash', provider: 'openrouter', description: 'High-speed GLM variant' },
  { id: 'minimax/minimax-m2.7', name: 'MiniMax M2.7', provider: 'openrouter', description: 'MiniMax flagship reasoning model' },
  { id: 'minimax/minimax-m1', name: 'MiniMax M1', provider: 'openrouter', description: 'Standard MiniMax model' },
  { id: 'cohere/command-r-plus-08-2024', name: 'Command R+', provider: 'openrouter', description: 'Cohere flagship for RAG & Agents' },
  { id: 'cohere/command-r-7b-12-2024', name: 'Command R 7B', provider: 'openrouter', description: 'Compact high-performance Cohere model' },
  { id: 'nvidia/nemotron-3-super', name: 'Nemotron 3 Super', provider: 'openrouter', description: 'NVIDIA flagship high-performance model' },
  { id: 'nvidia/nemotron-nano-9b-v2', name: 'Nemotron Nano 9B', provider: 'openrouter', description: 'Edge-optimized NVIDIA model' },
  { id: 'amazon/nova-premier-1.0', name: 'Nova Premier', provider: 'openrouter', description: 'Amazon flagship reasoning model' },
  { id: 'amazon/nova-micro-1.0', name: 'Nova Micro', provider: 'openrouter', description: 'Fastest Amazon Nova model' },
  { id: 'moonshotai/kimi-k2.6', name: 'Kimi K2.6', provider: 'openrouter', description: 'Moonshot flagship long-context model' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'openrouter', description: 'Standard Kimi model' },
  { id: 'baidu/ernie-4.5-300b-a47b', name: 'ERNIE 4.5 300B', provider: 'openrouter', description: 'Baidu massive scale flagship' },
  { id: 'baidu/ernie-4.5-21b-a3b', name: 'ERNIE 4.5 21B', provider: 'openrouter', description: 'Efficient Baidu ERNIE model' },
  { id: 'nousresearch/hermes-4-405b', name: 'Hermes 4 405B', provider: 'openrouter', description: 'NousResearch flagship on 405B base' },
  { id: 'nousresearch/hermes-2-pro-llama-3-8b', name: 'Hermes 2 Pro 8B', provider: 'openrouter', description: 'High-performance compact Hermes' },
  { id: 'liquid/lfm-2-24b-a2b', name: 'LFM-2 24B', provider: 'openrouter', description: 'Liquid AI flagship 24B model' },
  { id: 'liquid/lfm-2.5-1.2b-instruct', name: 'LFM 2.5 1.2B', provider: 'openrouter', description: 'Fastest Liquid AI instruct model' },

  // ── OpenRouter (FREE TIER 2026) ──────────────────────────
  { id: 'openrouter/auto', name: 'OpenRouter Auto (Free)', provider: 'openrouter', description: 'Intelligent auto-routing to the healthiest free model' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (free)', provider: 'openrouter', description: 'Google DeepMind 30.7B dense instruction model.' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B (free)', provider: 'openrouter', description: 'Instruction-tuned MoE model from Google.' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (free)', provider: 'openrouter', description: 'Meta multilingual 70B instruction model.' },
  { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B (free)', provider: 'openrouter', description: 'Open-weight 117B MoE variant from OpenAI.' },
  { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (free)', provider: 'openrouter', description: 'Alibaba 480B MoE code generation specialist.' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super (free)', provider: 'openrouter', description: 'NVIDIA 120B high-performance open model.' },
  { id: 'liquid/lfm-2.5-1.2b-thinking:free', name: 'LFM 2.5 Thinking (free)', provider: 'openrouter', description: 'LiquidAI lightweight reasoning-focused model.' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air (free)', provider: 'openrouter', description: 'Z.ai high-efficiency lightweight flagship.' },
  { id: 'inclusionai/ring-2.6-1t:free', name: 'Ring 2.6 1T (free)', provider: 'openrouter', description: '1T-parameter scale thinking model.' },
  { id: 'poolside/laguna-m.1:free', name: 'Laguna M.1 (free)', provider: 'openrouter', description: 'Poolside flagship coding agent model.' },
  { id: 'tencent/hy3-preview:free', name: 'Hunyuan 3 Preview (free)', provider: 'openrouter', description: 'Tencent high-efficiency MoE model.' },
  { id: 'baidu/cobuddy:free', name: 'CoBuddy (free)', provider: 'openrouter', description: 'Baidu Qianfan code generation specialist.' },
  { id: 'minimax/minimax-m2.5:free', name: 'MiniMax M2.5 (free)', provider: 'openrouter', description: 'SOTA large model designed for high-quality chat.' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 405B (free)', provider: 'openrouter', description: 'NousResearch generalist model on 405B base.' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Dolphin 24B (free)', provider: 'openrouter', description: 'Uncensored Venice edition of Dolphin Mistral.' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (free)', provider: 'openrouter', description: 'Compact Meta multilingual instruction model.' },
  { id: 'liquid/lfm-2.5-1.2b-instruct:free', name: 'LFM 2.5 Instruct (free)', provider: 'openrouter', description: 'Compact high-performance LiquidAI model.' },
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
  globalPrompt: string;
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
