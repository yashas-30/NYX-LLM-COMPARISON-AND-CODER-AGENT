/**
 * @file src/features/coder/hooks/useAgentPipeline.ts
 * @description Core AI execution pipeline for NYX agent.
 * Dispatches requests to ChatAgent or CoderAgent based on semantic routing.
 */

import { useState, useCallback, useRef } from 'react';
import { ChatMessage, TelemetryMetrics, AISettings, AgentPersona, SubagentTask } from '@src/infrastructure/types';
import { detectProvider, getEffectiveApiKey } from '@src/infrastructure/utils/provider';
import { isMissingDebugDetails, MISSING_DEBUG_DETAILS_RESPONSE } from '@/shared/promptAnalyzer';
import { toast } from '@src/shared/components/ui/sonner';
import { triggerCritic } from '../api/coderApi';
import { analyzePrompt, routeToAgent } from '@src/core/services/promptClassifier';
import { ChatAgent } from '@src/features/chat-agent/ChatAgent';
import { CoderAgent } from '@src/features/coder-agent/CoderAgent';

interface PipelineProps {
  models: Record<'nyx', string>;
  apiKeys: Record<string, string>;
  agentPersonas: Record<'nyx', AgentPersona>;
  modelSettings: AISettings;
  trackUsage: (provider: string, tokens: number) => void;
  history: ChatMessage[];
  updateHistory: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  updateMetrics: (metrics: TelemetryMetrics) => void;
  getSuggestions: (history: ChatMessage[]) => void;
  setSuggestedPrompts: (prompts: string[]) => void;
  webSearchEnabled: boolean;
  codebaseKnowledgeEnabled: boolean;
  mode: 'chat' | 'code';
}

export const useAgentPipeline = ({
  models,
  apiKeys,
  modelSettings,
  trackUsage,
  history,
  updateHistory,
  updateMetrics,
  getSuggestions,
  setSuggestedPrompts,
  webSearchEnabled,
  codebaseKnowledgeEnabled,
  mode,
}: PipelineProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [subagentTasks, setSubagentTasks] = useState<SubagentTask[]>([]);
  const [agentMode, setAgentMode] = useState<'chat' | 'coder' | null>(null);
  const [agentReasoning, setAgentReasoning] = useState<string>('');

  const controllerRef = useRef<AbortController | null>(null);
  const historyRef = useRef(history);
  historyRef.current = history;

  const triggerBackgroundCritic = useCallback(async (prompt: string, responseText: string) => {
    const nyxModel = models['nyx'];
    if (!nyxModel) return;
    const activeProvider = detectProvider(nyxModel);
    const apiKey = getEffectiveApiKey(activeProvider, apiKeys) || '';

    try {
      await triggerCritic({
        prompt,
        response: responseText,
        apiKey,
        provider: activeProvider,
        modelId: nyxModel
      });
    } catch (err) {
      console.error('[useAgentPipeline] Background critic failed:', err);
    }
  }, [models, apiKeys]);

  /**
   * Main execution handler that routes the prompt dynamically.
   */
  const runCoder = useCallback(async (prompt: string) => {
    const nyxModel = models['nyx'];
    if (!prompt.trim() || !nyxModel) return;
    const nyxProvider = detectProvider(nyxModel);
    const nyxApiKey = getEffectiveApiKey(nyxProvider, apiKeys) || '';

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Append user message
    const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: Date.now() };
    updateHistory(prev => [...prev, userMsg]);

    setIsLoading(true);
    setSuggestedPrompts([]);
    updateMetrics({ latency: 0, tokens: 0, tps: 0 });
    setSubagentTasks([]);
    setAgentMode(null);
    setAgentReasoning('');

    try {
      // Step 1: Analyze prompt
      const analysis = analyzePrompt(prompt);
      const route = routeToAgent(analysis);

      // Force route agent based on active tab selection to decouple Chat/Coder modes completely
      if (mode === 'chat') {
        route.agent = 'chat';
        route.reasoning = 'Engaging Chat Agent.';
        route.shouldUseSubagents = false;
      } else if (mode === 'code') {
        route.agent = 'coder';
        route.reasoning = 'Engaging Coder Agent.';
      }

      // Step 2: Show routing decision to user
      setAgentMode(route.agent);
      setAgentReasoning(route.reasoning);

      // Step 3: Route to appropriate agent
      if (route.agent === 'chat') {
        updateHistory(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now(), status: 'loading' }]);

        const agent = new ChatAgent({
          modelId: nyxModel,
          provider: nyxProvider,
          apiKey: nyxApiKey,
          settings: modelSettings,
          history: historyRef.current,
        });

        let finalMetrics: any = null;
        let lastStreamText = '';

        for await (const chunk of agent.streamResponse(prompt, analysis, controller.signal)) {
          if (chunk.type === 'thinking') {
            continue;
          }
          if (chunk.type === 'text') {
            lastStreamText = chunk.content;
            if (chunk.metadata) finalMetrics = chunk.metadata;

            // Stream update
            updateHistory(prev => {
              const h = [...prev];
              const last = h[h.length - 1];
              if (last?.role === 'assistant') {
                last.content = chunk.content;
                if (chunk.metadata) last.metrics = chunk.metadata;
              }
              return h;
            });
            if (chunk.metadata) updateMetrics(chunk.metadata);
          }
        }

        trackUsage(nyxProvider, finalMetrics?.tokens || Math.floor(lastStreamText.length / 4));

        updateHistory(prev => {
          const h = [...prev];
          const last = h[h.length - 1];
          if (last?.role === 'assistant') {
            last.status = 'success';
            if (finalMetrics) last.metrics = finalMetrics;
          }
          getSuggestions(h);
          return h;
        });

        triggerBackgroundCritic(prompt, lastStreamText);

      } else {
        // Coder agent pipeline
        if (analysis.intent === 'code_debug' && isMissingDebugDetails(prompt, 'debug')) {
          updateHistory(prev => [
            ...prev,
            { role: 'assistant', content: MISSING_DEBUG_DETAILS_RESPONSE, timestamp: Date.now(), status: 'success' }
          ]);
          toast.error('Please provide your code or error logs');
          setIsLoading(false);
          controllerRef.current = null;
          return;
        }

        const agent = new CoderAgent({
          modelId: nyxModel,
          provider: nyxProvider,
          apiKey: nyxApiKey,
          settings: modelSettings,
          history: historyRef.current,
          apiKeys,
          webSearchEnabled,
          codebaseKnowledgeEnabled,
          trackUsage,
          updateHistory,
          updateMetrics,
          getSuggestions,
          setSuggestedPrompts,
          originalPrompt: prompt,
          triggerBackgroundCritic,
          onSubagentTaskUpdate: (tasks) => {
            setSubagentTasks(tasks);
          }
        });

        let finalMetrics: any = null;
        let lastStreamText = '';

        updateHistory(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now(), status: 'loading' }]);

        for await (const chunk of agent.streamResponse(prompt, analysis, route, controller.signal)) {
          switch (chunk.type) {
            case 'thinking':
              updateHistory(prev => {
                const h = [...prev];
                const last = h[h.length - 1];
                if (last?.role === 'assistant') {
                  last.content = `_${chunk.content}_`;
                }
                return h;
              });
              break;
            case 'file_write':
              try {
                await fetch('/api/nyx/write-file', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: chunk.content, content: chunk.metadata.content }),
                });
                toast.success(`Wrote file: ${chunk.content}`);
              } catch (writeErr) {
                console.error('Failed to write file:', writeErr);
                toast.error(`Failed to write file: ${chunk.content}`);
              }
              break;
            case 'text':
              lastStreamText = chunk.content;
              if (chunk.metadata) finalMetrics = chunk.metadata;

              updateHistory(prev => {
                const h = [...prev];
                const last = h[h.length - 1];
                if (last?.role === 'assistant') {
                  last.content = chunk.content;
                  if (chunk.metadata) last.metrics = chunk.metadata;
                }
                return h;
              });
              if (chunk.metadata) updateMetrics(chunk.metadata);
              break;
            case 'tool_result':
              break;
          }
        }

        updateHistory(prev => {
          const h = [...prev];
          const last = h[h.length - 1];
          if (last?.role === 'assistant') {
            last.status = 'success';
            if (finalMetrics) last.metrics = finalMetrics;
          }
          getSuggestions(h);
          return h;
        });

        if (lastStreamText) {
          triggerBackgroundCritic(prompt, lastStreamText);
        }
      }
    } catch (error: any) {
      const isAborted = error?.name === 'AbortError' || controller.signal.aborted;
      
      if (error.message && error.message.startsWith('SAFETY_GATE_BLOCKED:')) {
        try {
          const payload = JSON.parse(error.message.substring(20));
          updateHistory(prev => {
            const h = prev.filter(m => !(m.role === 'assistant' && m.content === ''));
            return [
              ...h,
              { 
                role: 'assistant', 
                content: `⚠️ **NYX Safety Gate Blocked**\n\n${payload.message}\n\n${payload.details && payload.details.length > 0 ? `**Details:**\n${payload.details.map((d: any) => `- ${d}`).join('\n')}` : ''}`, 
                timestamp: Date.now(), 
                status: 'success' 
              }
            ];
          });
          toast.warning('Request blocked by Safety Gate');
          setIsLoading(false);
          controllerRef.current = null;
          return;
        } catch {}
      }

      updateHistory(prev => {
        const h = [...prev];
        const last = h[h.length - 1];
        if (last && last.role === 'assistant') {
          last.status = isAborted ? 'stopped' : 'error';
          last.content = error.message || 'Error: Generation failed. Please check your model settings or connection.';
        }
        return h;
      });
    } finally {
      controllerRef.current = null;
      setIsLoading(false);
    }
  }, [
    models,
    apiKeys,
    modelSettings,
    trackUsage,
    updateHistory,
    updateMetrics,
    setSuggestedPrompts,
    webSearchEnabled,
    codebaseKnowledgeEnabled,
    getSuggestions,
    triggerBackgroundCritic,
    mode
  ]);

  const stopCoder = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return { isLoading, runCoder, stopCoder, subagentTasks, agentMode, agentReasoning };
};
