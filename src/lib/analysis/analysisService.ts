/**
 * Analysis Service - Structured service for running model analysis
 * Handles model selection, API key resolution, and response parsing
 */

import { callAI, isCodePrompt, AISettings } from '@/src/lib/api/inferenceClient';
import { AVAILABLE_MODELS } from '@/src/config/models';
import { Provider, ModelDefinition } from '@/src/core/types';
import { OllamaModel } from '@/src/types';
import { BugCollector } from './bugCollector';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnalysisModelConfig {
  modelId: string;
  provider: Provider;
  apiKey: string;
  label: string;
  baseUrl?: string;
}

export interface AnalysisResponse {
  bestResponseId: string;
  consensus: string;
  methodology?: string;
  differences: Array<{
    category: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  critique: Record<string, {
    analysis: string;
    actionableFeedback: string;
    score: number | string;
  }>;
}

export interface AnalysisResult {
  success: boolean;
  data?: AnalysisResponse;
  error?: string;
  debugInfo?: {
    modelUsed: string;
    provider: string;
    responseLength: number;
    parseTime: number;
  };
}

// ============================================================================
// Model Resolution - Structured way to find correct model and API key
// ============================================================================

const MODEL_PROVIDER_MAP: Record<string, { provider: Provider; label: string }> = {
  // Gemini 2 Series
  'gemini-2.5-pro': { provider: 'gemini', label: 'Gemini 2.5 Pro' },
  'gemini-2.5-flash': { provider: 'gemini', label: 'Gemini 2.5 Flash' },

  // Gemma 4 Series
  'gemma-4-31b-it': { provider: 'gemini', label: 'Gemma 4 31B' },
  'google/gemma-4-27b-it': { provider: 'openrouter', label: 'Gemma 4 27B' },
  'gemma-4-26b-a4b-it': { provider: 'gemini', label: 'Gemma 4 26B MoE' },
  'gemma-4-e4b-it': { provider: 'gemini', label: 'Gemma 4 E4B (Edge)' },
  'gemma-4-e2b-it': { provider: 'gemini', label: 'Gemma 4 E2B (Edge)' },
  
  // OpenRouter models - Free
  'openrouter/free': { provider: 'openrouter', label: 'OpenRouter Auto (Free)' },
  'google/gemma-4-31b-it:free': { provider: 'openrouter', label: 'Gemma 4 31B (Free)' },
  'deepseek/deepseek-v4-flash:free': { provider: 'openrouter', label: 'DeepSeek V4 Flash (Free)' },
  'meta-llama/llama-3.3-70b-instruct:free': { provider: 'openrouter', label: 'Llama 3.3 70B (Free)' },
  'nvidia/nemotron-3-super-120b-a12b:free': { provider: 'openrouter', label: 'Nemotron 3 Super (Free)' },
  'qwen/qwen3-next-80b-a3b-instruct:free': { provider: 'openrouter', label: 'Qwen3 Next 80B (Free)' },
  'minimax/minimax-m2.5:free': { provider: 'openrouter', label: 'MiniMax M2.5 (Free)' },
  
  // OpenRouter Paid models
  'google/gemma-3-27b-it': { provider: 'openrouter', label: 'Gemma 3 27B' },
  'meta-llama/llama-3.3-70b-instruct': { provider: 'openrouter', label: 'Llama 3.3 70B' },
  'mistralai/mistral-small-3.1-24b': { provider: 'openrouter', label: 'Mistral Small 3.1' },
  'anthropic/claude-sonnet-4-20250514': { provider: 'openrouter', label: 'Claude Sonnet 4' },
  'deepseek/deepseek-chat': { provider: 'openrouter', label: 'DeepSeek Chat' },
};

// ============================================================================
// Model Provider Detection
// ============================================================================

function detectProviderForAnalysis(
  modelId: string,
  ollamaModels: ModelDefinition[] | OllamaModel[] = [],
  lmStudioModels: any[] = []
): Provider {
  const availableModel = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (availableModel) return availableModel.provider as Provider;
  if (modelId.includes('/')) return 'openrouter';
  return 'gemini';
}

// ============================================================================
// Model Resolution
// ============================================================================

export function resolveModelConfig(
  modelId: string,
  apiKeys: Record<string, string>,
  ollamaModels: ModelDefinition[] | OllamaModel[] = [],
  lmStudioModels: any[] = [],
  lmStudioBaseUrl?: string,
  ollamaBaseUrl?: string
): AnalysisModelConfig | null {
  BugCollector.logEntry('AnalysisService', 'resolveModelConfig', { modelId, availableKeys: Object.keys(apiKeys) });
  
  if (!modelId || modelId.trim() === '') {
    BugCollector.logExit('AnalysisService', 'resolveModelConfig', 'no model selected');
    return null;
  }

  const provider = detectProviderForAnalysis(modelId, ollamaModels, lmStudioModels);
  
  let config = MODEL_PROVIDER_MAP[modelId];
  
  if (!config) {
    const availableModel = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (availableModel) {
      config = { provider: availableModel.provider as Provider, label: availableModel.name };
    } else {
      config = { provider, label: modelId };
    }
  }
  
  config = { ...config, provider };
  const apiKey = apiKeys[provider];
  
  if (!apiKey || apiKey.trim().length === 0) {
    BugCollector.report('AnalysisService', `Missing API key for provider: ${config.provider}`, { modelId, provider: config.provider, availableKeys: Object.keys(apiKeys) }, 'high');
    BugCollector.logExit('AnalysisService', 'resolveModelConfig', null);
    return null;
  }
  
  const result = { modelId, provider: config.provider, apiKey: apiKey.trim(), label: config.label };
  BugCollector.logExit('AnalysisService', 'resolveModelConfig', result);
  return result;
}

export function getAvailableAnalysisModels(apiKeys: Record<string, string>): AnalysisModelConfig[] {
  BugCollector.logEntry('AnalysisService', 'getAvailableAnalysisModels', { apiKeys: Object.keys(apiKeys) });
  
  const available: AnalysisModelConfig[] = [];
  const priorityModels = [
    'gemini-2.5-flash', 'gemini-2.5-pro',
    'gemma-4-31b-it', 'gemma-4-26b-a4b-it', 'gemma-4-e4b-it', 'gemma-4-e2b-it',
    'google/gemma-4-27b-it',
    'openrouter/free', 'google/gemma-4-31b-it:free', 'deepseek/deepseek-v4-flash:free',
    'meta-llama/llama-3.3-70b-instruct:free', 'nvidia/nemotron-3-super-120b-a12b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free', 'minimax/minimax-m2.5:free',
    'google/gemma-3-27b-it', 'anthropic/claude-sonnet-4-20250514',
    'meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-small-3.1-24b',
    'moonshotai/kimi-k2.6', 'deepseekai/deepseek-v4-flash',
  ];
  
  for (const modelId of priorityModels) {
    const config = resolveModelConfig(modelId, apiKeys);
    if (config) available.push(config);
  }
  
  BugCollector.logExit('AnalysisService', 'getAvailableAnalysisModels', { count: available.length });
  return available;
}

// ============================================================================
// JSON Extraction
// ============================================================================

function extractAnalysisJSON(text: string): AnalysisResponse {
  BugCollector.logEntry('AnalysisService', 'extractAnalysisJSON', { textLength: text?.length });
  
  if (!text || text.trim().length === 0) {
    BugCollector.report('AnalysisService', 'Empty response from model', { text }, 'critical');
    throw new Error('Model returned empty response.');
  }
  
  let content = text;
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) content = markdownMatch[1];
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) content = jsonMatch[0];
  
  try {
    const parsed = JSON.parse(content);
    BugCollector.logExit('AnalysisService', 'extractAnalysisJSON', 'success');
    return parsed as AnalysisResponse;
  } catch (parseError: any) {
    const startIdx = content.indexOf('{');
    const endIdx = content.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const candidate = content.substring(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(candidate);
        BugCollector.logExit('AnalysisService', 'extractAnalysisJSON', 'success (fallback)');
        return parsed as AnalysisResponse;
      } catch {}
    }
    
    BugCollector.report('AnalysisService', 'Failed to parse JSON', { error: parseError.message, textPreview: text.substring(0, 300) }, 'high');
    throw new Error(`Invalid JSON response. Preview: ${text.substring(0, 200)}...`);
  }
}

// ============================================================================
// Shared Prompt Builder — Token-Efficient Unified Analysis
// ============================================================================

/** Max chars per model output sent to the judge — truncation saves input tokens */
const MAX_OUTPUT_CHARS = 1500;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '\n…[truncated]';
}

/**
 * Build a compact judge prompt shared by both standard and code analysis.
 * Same 5-pillar rubric for every mode. Code mode adds a `code` field.
 */
function buildJudgePrompt(
  globalPrompt: string,
  responses: Array<{ modelId: string; output: string }>,
  mode: 'standard' | 'code'
): string {
  const models = responses
    .map(r => `[${r.modelId}]\n${truncate(r.output, MAX_OUTPUT_CHARS)}`)
    .join('\n---\n');

  const codeExtra = mode === 'code'
    ? `,"code":{"lang":"string","best":"modelId","impl":"merged best-of code","explain":"1-2 sentence summary"}`
    : '';

  return `Compare AI model outputs. Evaluate on Memory, Formatting, Nuance, Logic, Efficiency (each 0-20, total 0-100).

TASK: "${truncate(globalPrompt, 500)}"

RULES: Raw JSON only. No markdown fences. No commentary. Keep strings short.

SCHEMA:
{"best":"modelId","consensus":"short synthesized answer","diff":[{"cat":"Memory|Formatting|Nuance|Logic|Efficiency","desc":"short","impact":"high|med|low"}],"scores":{"<modelId>":{"s":<0-100>,"a":"short analysis","f":"short feedback"}}${codeExtra}}

RESPONSES:
${models}`;
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

export async function runStandardAnalysis(
  globalPrompt: string,
  responses: Array<{ modelId: string; output: string; localPrompt?: string }>,
  analysisModelConfig: AnalysisModelConfig
): Promise<AnalysisResult> {
  const startTime = Date.now();
  BugCollector.logEntry('AnalysisService', 'runStandardAnalysis', {
    promptLength: globalPrompt.length,
    responseCount: responses.length,
    model: analysisModelConfig.modelId,
    provider: analysisModelConfig.provider
  });

  const judgePrompt = buildJudgePrompt(globalPrompt, responses, 'standard');

  try {
    const result = await callAI(
      analysisModelConfig.modelId,
      analysisModelConfig.provider,
      judgePrompt,
      analysisModelConfig.apiKey,
      'JSON evaluator. Output raw JSON only.',
      { maxTokens: 1024 },
      undefined, undefined, undefined, undefined, {}
    );

    const parseTime = Date.now() - startTime;
    const raw = extractAnalysisJSON(result.text);

    // Normalise compact schema → existing AnalysisResponse shape
    const analysisData: AnalysisResponse = {
      bestResponseId: (raw as any).best ?? (raw as any).bestResponseId ?? '',
      consensus: (raw as any).consensus ?? '',
      methodology: 'Daily-Driver Optimization Audit',
      differences: ((raw as any).diff ?? (raw as any).differences ?? []).map((d: any) => ({
        category: d.cat ?? d.category ?? '',
        description: d.desc ?? d.description ?? '',
        impact: d.impact ?? 'medium'
      })),
      critique: Object.fromEntries(
        Object.entries((raw as any).scores ?? (raw as any).critique ?? {}).map(([k, v]: [string, any]) => [
          k,
          {
            score: v.s ?? v.score ?? 0,
            analysis: v.a ?? v.analysis ?? '',
            actionableFeedback: v.f ?? v.actionableFeedback ?? ''
          }
        ])
      )
    };

    BugCollector.logExit('AnalysisService', 'runStandardAnalysis', 'success');
    return {
      success: true,
      data: analysisData,
      debugInfo: { modelUsed: analysisModelConfig.modelId, provider: analysisModelConfig.provider, responseLength: result.text?.length || 0, parseTime }
    };
  } catch (error: any) {
    BugCollector.logError('AnalysisService', 'runStandardAnalysis', error);
    const msg = error.message || String(error);
    let userMessage = msg;
    if (/quota|429|RESOURCE_EXHAUSTED/.test(msg)) userMessage = `Quota exceeded for ${analysisModelConfig.label}.`;
    else if (/API key|unauthorized|401/.test(msg)) userMessage = `Invalid API key for ${analysisModelConfig.label}.`;
    else if (/No response|empty/.test(msg)) userMessage = `No response from ${analysisModelConfig.label}.`;
    else if (/JSON|invalid/.test(msg)) userMessage = 'Invalid response. Try a different analysis model.';
    return { success: false, error: userMessage, debugInfo: { modelUsed: analysisModelConfig.modelId, provider: analysisModelConfig.provider, responseLength: 0, parseTime: Date.now() - startTime } };
  }
}

export async function runCodeAnalysis(
  userPrompt: string,
  responses: Array<{ modelId: string; output: string; localPrompt?: string }>,
  analysisModelConfig: AnalysisModelConfig
): Promise<AnalysisResult> {
  const startTime = Date.now();
  BugCollector.logEntry('AnalysisService', 'runCodeAnalysis', {
    promptLength: userPrompt.length,
    responseCount: responses.length,
    model: analysisModelConfig.modelId
  });

  const judgePrompt = buildJudgePrompt(userPrompt, responses, 'code');

  try {
    const result = await callAI(
      analysisModelConfig.modelId,
      analysisModelConfig.provider,
      judgePrompt,
      analysisModelConfig.apiKey,
      'JSON evaluator. Output raw JSON only.',
      { maxTokens: 1536 },
      undefined, undefined, undefined, undefined, {}
    );

    const parseTime = Date.now() - startTime;
    const raw = extractAnalysisJSON(result.text) as any;

    // Normalise compact code schema → existing CodeAnalysisResult shape
    const codeBlock = raw.code ?? {};
    const analysisData = {
      isCodeResponse: true,
      language: codeBlock.lang ?? raw.language ?? 'unknown',
      bestModelId: codeBlock.best ?? raw.bestModelId ?? raw.best ?? '',
      combinedCode: codeBlock.impl ?? raw.combinedCode ?? '',
      combinedExplanation: codeBlock.explain ?? raw.combinedExplanation ?? '',
      modelCodeAnalysis: Object.fromEntries(
        Object.entries(raw.scores ?? raw.modelCodeAnalysis ?? {}).map(([k, v]: [string, any]) => [
          k,
          {
            codeQualityScore: v.s ?? v.codeQualityScore ?? 0,
            executionScore: v.executionScore ?? Math.round(((v.s ?? 0) * 40) / 100),
            explanationScore: v.explanationScore ?? Math.round(((v.s ?? 0) * 30) / 100),
            efficiencyScore: v.efficiencyScore ?? Math.round(((v.s ?? 0) * 30) / 100),
            strengths: v.strengths ?? [],
            weaknesses: v.weaknesses ?? [],
            extractedCode: v.extractedCode ?? ''
          }
        ])
      ),
      codeDifferences: ((raw.diff ?? raw.codeDifferences ?? []) as any[]).map((d: any) => ({
        aspect: d.cat ?? d.aspect ?? '',
        description: d.desc ?? d.description ?? '',
        winner: d.winner ?? ''
      }))
    };

    BugCollector.logExit('AnalysisService', 'runCodeAnalysis', 'success');
    return {
      success: true,
      data: analysisData as any,
      debugInfo: { modelUsed: analysisModelConfig.modelId, provider: analysisModelConfig.provider, responseLength: result.text?.length || 0, parseTime }
    };
  } catch (error: any) {
    BugCollector.logError('AnalysisService', 'runCodeAnalysis', error);
    return {
      success: false,
      error: error.message || String(error),
      debugInfo: { modelUsed: analysisModelConfig.modelId, provider: analysisModelConfig.provider, responseLength: 0, parseTime: Date.now() - startTime }
    };
  }
}