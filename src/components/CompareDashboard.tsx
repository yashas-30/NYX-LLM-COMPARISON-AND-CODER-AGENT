import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelOutputCard } from './ModelOutputCard';
import { ComparisonColumn, AVAILABLE_MODELS, ComparisonHistoryItem, AnalysisJudgement, CodeAnalysisResult, OllamaModel } from '@/src/types';
import { judgeResponses, judgeCodeResponses, isCodePrompt, callAI } from '@/src/lib/gemini';
import { 
  Plus, Send, RefreshCw, Trash2, Layers, Cpu, Database, Activity, 
  Sparkles, Search, BarChart3, Microscope, History, Clock, X, Sliders,
  ChevronRight, ChevronLeft, CheckCircle2, Play, Key, Settings, 
  Filter, ShieldCheck, Fingerprint, LayoutGrid, Shield, Zap, DoorOpen, RotateCcw,
  Bot, HardDrive, AlertCircle, Loader2, Terminal, Code2, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { Tooltip } from './Tooltip';
import { ErrorBoundary } from './ErrorBoundary';

interface CompareDashboardProps {
  onExit?: () => void;
}

export const CompareDashboard: React.FC<CompareDashboardProps> = ({ onExit }) => {
  const [columns, setColumns] = useState<ComparisonColumn[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [activeMode, setActiveMode] = useState<'grid' | 'analysis' | 'history' | 'settings'>('grid');
  const [analysisOutput, setAnalysisOutput] = useState<AnalysisJudgement | null>(null);
  const [codeAnalysisOutput, setCodeAnalysisOutput] = useState<CodeAnalysisResult | null>(null);
  const [analysisTab, setAnalysisTab] = useState<'standard' | 'code'>('standard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCodeAnalyzing, setIsCodeAnalyzing] = useState(false);
  const [analysisModel, setAnalysisModel] = useState('gemini-3.1-pro-preview');
  const [isCodeSession, setIsCodeSession] = useState(false); // true only when prompt triggered code analysis
  const [showDifferencesModal, setShowDifferencesModal] = useState(false);
  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isRegistryCollapsed, setIsRegistryCollapsed] = useState(false);
  const [isForgeCollapsed, setIsForgeCollapsed] = useState(true);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [ollamaError, setOllamaError] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ gemini: true, terminal: false, ollama: false, openai: false, claude: false, deepseek: false, openrouter: false });

  // ── Generation Management ────────────────────────────────────────────────
  // Tracks AbortControllers for all active streams (Gemini, OpenAI, Ollama, etc.)
  const activeControllers = React.useRef<Record<string, AbortController>>({});

  const abortGeneration = (columnId: string) => {
    if (activeControllers.current[columnId]) {
      activeControllers.current[columnId].abort();
      delete activeControllers.current[columnId];
    }
  };

  const abortAllGenerations = () => {
    Object.keys(activeControllers.current).forEach(id => {
      activeControllers.current[id].abort();
    });
    activeControllers.current = {};
  };

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Persistence
  useEffect(() => {
    const savedHistory = localStorage.getItem('llm_ref_history');
    const savedKeys = localStorage.getItem('llm_ref_api_keys');
    const savedLegacyKey = localStorage.getItem('llm_ref_api_key');

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error("Failed to load API keys", e);
      }
    } else if (savedLegacyKey) {
      setApiKeys({ gemini: savedLegacyKey });
    }

    // Fetch Ollama models on mount
    fetchOllamaModels();
  }, []);

  useEffect(() => {
    localStorage.setItem('llm_ref_history', JSON.stringify(history));
  }, [history]);



  const fetchOllamaModels = async () => {
    setOllamaStatus('loading');
    setOllamaError('');
    try {
      const res = await fetch('/api/ollama/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { models?: OllamaModel[]; error?: string };
      if (data.error) throw new Error(data.error);
      setOllamaModels(data.models ?? []);
      setOllamaStatus('ok');
    } catch (e: any) {
      setOllamaError(e.message || 'Could not reach Ollama');
      setOllamaStatus('error');
    }
  };

  const saveApiKeys = () => {
    localStorage.setItem('llm_ref_api_keys', JSON.stringify(apiKeys));
    toast.success("API vault synchronized.");
  };

  const updateApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const [shakingColumnId, setShakingColumnId] = useState<string | null>(null);

  const [modelSettings, setModelSettings] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.95,
    topK: 40
  });

  // Add polling for terminal nodes
  useEffect(() => {
    const terminalNodes = columns.filter(c => c.modelId === 'terminal-bridge' && c.status === 'loading');
    if (terminalNodes.length === 0) return;

    const interval = setInterval(async () => {
      for (const node of terminalNodes) {
        try {
          const res = await fetch(`/api/terminal/poll?nodeId=${node.id}`);
          const data = await res.json();
          if (data.output) {
            setColumns(prev => prev.map(c => 
              c.id === node.id ? { ...c, output: data.output, status: 'success' } : c
            ));
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [columns]);

  useEffect(() => {
    if (shakingColumnId) {
      const timer = setTimeout(() => setShakingColumnId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [shakingColumnId]);

  const addColumn = (modelId?: string): boolean => {
    let success = true;
    setColumns(prev => {
      if (modelId && prev.some(c => c.modelId === modelId)) {
        const existingCol = prev.find(c => c.modelId === modelId);
        if (existingCol) setShakingColumnId(existingCol.id);
        success = false;
        return prev;
      }
      if (prev.length >= 4) {
        toast.error("Maximum 4 models allowed for comparison grid.");
        success = false;
        return prev;
      }

      const newId = (Math.max(0, ...prev.map(c => parseInt(c.id) || 0)) + 1).toString();
      return [...prev, { 
        id: newId, 
        modelId, 
        status: 'idle', 
        output: '' 
      }];
    });
    return success;
  };

  // Returns true if modelId belongs to a local Ollama model (not in the Gemini AVAILABLE_MODELS list)
  const isOllamaModel = (m?: string) => !!m && !AVAILABLE_MODELS.some(am => am.id === m);

  /** Fire-and-forget: tell the server to abort the stream and evict from GPU memory */
  const unloadOllamaIfNeeded = (modelId?: string, nodeId?: string) => {
    if (!isOllamaModel(modelId)) return;
    fetch('/api/ollama/unload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, nodeId }),
    }).catch(() => { /* non-fatal */ });
  };

  const toggleModel = (modelId: string) => {
    const existingIndex = columns.findIndex(c => c.modelId === modelId);
    if (existingIndex !== -1) {
      if (columns.length <= 1) {
        toast.error("At least one model must remain active.");
        return;
      }
      // Unload from GPU/CPU before removing the column
      const col = columns.find(c => c.modelId === modelId);
      if (col) {
        unloadOllamaIfNeeded(modelId, col.id);
        abortGeneration(col.id);
      }
      setColumns(columns.filter(c => c.modelId !== modelId));
    } else {
      addColumn(modelId);
    }
  };

  const removeColumn = (id: string) => {
    if (columns.length <= 1) {
      toast.error("At least one model must remain active.");
      return;
    }
    // Unload from GPU/CPU before removing the column
    const col = columns.find(c => c.id === id);
    if (col) {
      unloadOllamaIfNeeded(col.modelId, col.id);
      abortGeneration(id);
    }
    setColumns(columns.filter(c => c.id !== id));
  };


  const updateModel = (id: string, modelId: string) => {
    if (columns.some(c => c.modelId === modelId && c.id !== id)) {
      setShakingColumnId(id);
      return;
    }
    // If switching away from an Ollama model, evict it from GPU/CPU memory immediately
    const col = columns.find(c => c.id === id);
    const prevModelId = col?.modelId;
    if (prevModelId && prevModelId !== modelId) {
      unloadOllamaIfNeeded(prevModelId, id);
      abortGeneration(id);
    }
    setColumns(prev => prev.map(c => c.id === id ? { ...c, modelId, status: 'idle', output: '', error: undefined } : c));
  };

  const updateOutput = (id: string, updates: Partial<ComparisonColumn>) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const runComparison = async () => {
    if (isGlobalLoading) return;
    if (!prompt.trim() && columns.every(c => !c.localPrompt?.trim() && !c.output.trim())) {
      toast.warning("Please enter a prompt or paste content into nodes.");
      return;
    }

    // Capture prompt BEFORE clearing â€” closures in setColumns will see stale state otherwise
    const capturedPrompt = prompt;

    setIsGlobalLoading(true);
    setPrompt('');
    abortAllGenerations();

    // Reset ALL columns that have a model to loading â€” regardless of previous output
    setColumns(prev => prev.map(c =>
      c.modelId ? { ...c, status: 'loading', output: '', error: undefined } : { ...c, status: 'idle' }
    ));

    let lastUpdate = Date.now();
    const promises = columns.map(async (column) => {
      // If no model selected, skip execution for this node
      if (!column.modelId) {
        setColumns(prev => prev.map(c => c.id === column.id ? { ...c, status: 'idle' } : c));
        return;
      }

      // If output exists with a local prompt and no global prompt, skip re-running
      if (column.output.trim() && !column.localPrompt?.trim() && !prompt.trim() && !capturedPrompt.trim()) return;


      try {
        // Check if it's a dynamically-loaded Ollama model (not in AVAILABLE_MODELS)
        const isOllamaModel = ollamaModels.some(m => m.name === column.modelId);
        const model = sortedModels.find(m => m.id === column.modelId);
        const provider = isOllamaModel ? 'ollama' : (model?.provider || 'gemini');
        
        // Use the correct API key for this provider
        let finalKey = apiKeys[provider]?.trim();
        
        // Use local prompt if available, fallback to global prompt
        const activePrompt = column.localPrompt || capturedPrompt;
        
        if (provider === 'terminal') {
           // Signal the terminal script that a prompt is ready
           await fetch('/api/terminal/prompt', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ nodeId: column.id, prompt: activePrompt })
           });
           return;
        }

        if (!activePrompt.trim()) {
           // Skip if no prompt available for this specific node
           setColumns(prev => prev.map(c => c.id === column.id ? { ...c, status: 'idle' } : c));
           return;
        }

          const controller = new AbortController();
          activeControllers.current[column.id] = controller;

          const result = await callAI(
            column.modelId, 
            provider, 
            activePrompt, 
            finalKey, 
            undefined, 
            modelSettings, // Use global settings
            (partialText) => {
              const now = Date.now();
              if (now - lastUpdate > 30) { // Throttle updates to ~33fps for performance
                setColumns(prev => prev.map(c => 
                  c.id === column.id ? { ...c, output: partialText } : c
                ));
                lastUpdate = now;
              }
            },
            0,
            controller.signal,
            column.id
          );
          delete activeControllers.current[column.id];
          // Final update to ensure completion
          const roughTokenCount = Math.floor(result.text.length / 4);
          const tps = result.latency > 0 ? Number(((roughTokenCount / result.latency) * 1000).toFixed(1)) : 0;
          setColumns(prev => prev.map(c => c.id === column.id ? { 
            ...c, 
            status: 'success', 
            output: result.text, 
            metadata: { latency: result.latency, tokens: roughTokenCount, tokensPerSecond: tps } 
          } : c));
      } catch (err: any) {
        setColumns(prev => prev.map(c => c.id === column.id ? { 
          ...c, 
          status: 'error', 
          error: err.message || 'Unknown error occurred' 
        } : c));
      }
    });

    await Promise.all(promises);
    setIsGlobalLoading(false);
    
    // Use the latest columns state to perform side effects
    setColumns(prev => {
      const successfulCols = prev.filter(c => c.status === 'success');
      
      if (successfulCols.length > 0) {
        // Always save to history for every prompt run
        const historyItem: ComparisonHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          prompt: capturedPrompt || "Manual Analysis Session",
          timestamp: Date.now(),
          columns: prev.map(c => ({
            modelId: c.modelId,
            output: c.output,
            status: c.status as any
          }))
        };
        setHistory(hPrev => [historyItem, ...hPrev].slice(0, 50));

        // Always run analysis in the background (results visible in Summary tab)
        runAnalysis(prev, capturedPrompt);
      }
      return prev;
    });
  };


  const restoreHistory = (item: ComparisonHistoryItem) => {
    setPrompt(item.prompt);
    setColumns(item.columns.map((c, i) => ({
      id: (i + 1).toString(),
      modelId: c.modelId,
      status: c.status,
      output: c.output
    })));
    setActiveMode('grid');
    toast.info("Session restored from deep storage.");
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const runAnalysis = async (columnsToAnalyze?: ComparisonColumn[], promptOverride?: string) => {
    const activeCols = columnsToAnalyze || columns;
    const successCols = activeCols.filter(c => c.status === 'success');
    if (successCols.length < 1) return;

    const judgeProvider = AVAILABLE_MODELS.find(m => m.id === analysisModel)?.provider || 'gemini';
    const analysisKey = apiKeys[judgeProvider as keyof typeof apiKeys]?.trim();
    if (!analysisKey) {
      if (!columnsToAnalyze) toast.warning(`Add your ${judgeProvider.charAt(0).toUpperCase() + judgeProvider.slice(1)} API key in Settings to enable analysis.`);
      return;
    }

    const activePrompt = promptOverride || prompt;
    const responses = successCols.map(c => ({ modelId: c.modelId!, output: c.output, localPrompt: c.localPrompt }));

    // Detect whether this is a coding prompt (keyword match OR any response contains a code fence)
    const isCode = isCodePrompt(activePrompt) ||
      successCols.some(c => /```[\w]*\n/.test(c.output));

    setIsCodeSession(isCode);

    if (isCode) {
      // â”€â”€ CODE PATH: only run code analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setAnalysisTab('code');
      setAnalysisOutput(null);   // clear standard results
      setIsCodeAnalyzing(true);
      setCodeAnalysisOutput(null);
      try {
        const codeResult = await judgeCodeResponses(activePrompt, responses, analysisKey, analysisModel);
        const parsed = JSON.parse(codeResult) as CodeAnalysisResult;
        setCodeAnalysisOutput(parsed);
      } catch (err: any) {
        console.error("Code Analysis Error:", err);
        let msg = err.message || 'Unknown error';
        try { const inner = JSON.parse(msg); msg = inner.message || inner.error || msg; } catch {}
        msg = msg.replace(/\{[^}]{0,200}\}/g, '').trim() || 'Code analysis failed. Please try again.';
        // Show error inside code tab by setting a minimal result
        setCodeAnalysisOutput(null);
        toast.error(`Code Analysis: ${msg}`);
      } finally {
        setIsCodeAnalyzing(false);
      }
    } else {
      // â”€â”€ STANDARD PATH: only run standard analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setAnalysisTab('standard');
      setCodeAnalysisOutput(null);  // clear code results
      setIsAnalyzing(true);
      setAnalysisOutput(null);
      try {
        const result = await judgeResponses(activePrompt, responses, analysisKey, analysisModel);
        const parsedResult = JSON.parse(result) as AnalysisJudgement;
        if (parsedResult.consensus) {
          parsedResult.consensus = parsedResult.consensus.replace(/\{"error":[^}]+\}/g, '[API error]');
        }
        setAnalysisOutput(parsedResult);
      } catch (err: any) {
        console.error("Analysis Parse Error:", err);
        let msg = err.message || 'Unknown error';
        try { const inner = JSON.parse(msg); msg = inner.message || inner.error || msg; } catch {}
        msg = msg.replace(/\{[^}]{0,200}\}/g, '').trim() || 'Analysis failed. Please try again.';
        const displayMsg = msg.includes("quota") ? msg : `**Analysis failed:** ${msg}`;
        setAnalysisOutput({ consensus: displayMsg, differences: [], critique: {} });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };



  const clearAll = () => {
    setPrompt('');
    setAnalysisOutput(null);
    setColumns(columns.map(c => ({ ...c, status: 'idle', output: '', error: undefined })));
  };

  const sortedModels = [...AVAILABLE_MODELS].sort((a, b) => a.name.localeCompare(b.name));



  const filteredModels = sortedModels.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === 'all' || m.provider.toLowerCase() === providerFilter.toLowerCase();
    return matchesSearch && matchesProvider;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } }
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
  };

  const columnVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }
  };

  const navItems = [
    { mode: 'grid' as const,     icon: Cpu,      label: 'Chat',     tip: 'Comparison grid' },
    { mode: 'analysis' as const, icon: Activity, label: 'Analysis',  tip: columns.length === 0 ? 'Add a model first' : 'View analysis', disabled: columns.length === 0 },
    { mode: 'history' as const,  icon: History,  label: 'History',  tip: 'Past comparisons' },
    { mode: 'settings' as const, icon: Settings,  label: 'Settings', tip: 'Configure settings' },
  ];

  const providers = Array.from(new Set(sortedModels.map(m => m.provider)));

  return (
    <div className="flex h-screen max-h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans">
      {/* Ambient background */}
      <div className="fixed inset-0 gemini-mesh pointer-events-none z-0" />
      <div className="fixed inset-0 noise-overlay pointer-events-none z-0" />

      {/* â”€â”€ Left Nav Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative flex flex-col shrink-0 overflow-hidden z-50"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Subtle sidebar bg */}
        <div className="absolute inset-0 bg-[#0d0d10]/90 backdrop-blur-xl" />
        <div className="relative z-10 flex flex-col h-full">

          {/* Logo */}
          <motion.button
            onClick={onExit}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-3 px-4 py-6 outline-none group"
            style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <Layers size={18} className="text-white" />
            </div>
            <AnimatePresence>
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col text-left min-w-0"
                >
                  <span className="text-white font-bold tracking-tight text-sm leading-none">LLM <span className="text-indigo-400">Lab</span></span>
                  <span className="text-slate-600 text-[9px] font-semibold tracking-widest uppercase mt-0.5">v2.0</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <div className="h-px mx-4 bg-white/5 mb-3" />

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-4">
            {navItems.map(({ mode, icon: Icon, label, tip, disabled }) => {
              const isActive = activeMode === mode;
              return (
                <Tooltip key={mode} content={tip} side="right">
                  <button
                    disabled={disabled}
                    onClick={() => {
                      setActiveMode(mode);
                      if (mode === 'analysis') runAnalysis();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 outline-none group/nav relative overflow-hidden ${
                      disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
                  >
                    {/* Active bg */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover/nav:opacity-100 transition-opacity bg-white/[0.03]" />
                    )}
                    <Icon
                      size={17}
                      className={`relative z-10 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-slate-500 group-hover/nav:text-slate-300'
                      }`}
                    />
                    <AnimatePresence>
                      {!isSidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className={`relative z-10 text-xs font-semibold tracking-wide transition-colors ${
                            isActive ? 'text-white' : 'text-slate-500 group-hover/nav:text-slate-300'
                          }`}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </Tooltip>
              );
            })}
          </nav>

          <div className="h-px mx-4 bg-white/5 mb-3" />

          {/* Exit button â€” above collapse toggle */}
          <div className="px-3">
            <Tooltip content="Exit dashboard" side="right">
              <button
                onClick={onExit}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all group/exit-btn`}
                style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
              >
                <DoorOpen size={16} className="shrink-0 transition-transform duration-300 group-hover/exit-btn:scale-110 group-hover/exit-btn:-rotate-6" />
                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[10px] font-semibold tracking-wide uppercase"
                    >Exit</motion.span>
                  )}
                </AnimatePresence>
              </button>
            </Tooltip>
          </div>

          {/* Collapse toggle */}
          <div className="px-3 pb-5">
            <Tooltip content={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
              <button
                onClick={() => setIsSidebarCollapsed(p => !p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-slate-400 hover:bg-white/[0.03] transition-all"
                style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
              >
                {isSidebarCollapsed ? <ChevronRight size={16} className="group-hover:scale-110 group-hover:translate-x-0.5 transition-all duration-300" /> : <ChevronLeft size={16} className="group-hover:scale-110 group-hover:-translate-x-0.5 transition-all duration-300" />}
                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[10px] font-semibold tracking-wide uppercase"
                    >Collapse</motion.span>
                  )}
                </AnimatePresence>
              </button>
            </Tooltip>
          </div>
        </div>
      </motion.aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0c] relative z-10">
        {/* Header */}
        <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-8 shrink-0"
          style={{ background: 'rgba(10,10,12,0.8)', backdropFilter: 'blur(40px)' }}
        >
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.h2
                key={activeMode}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold text-white/80 tracking-tight"
              >
                {activeMode === 'grid' ? 'Compare' : activeMode === 'analysis' ? 'Analysis' : activeMode === 'history' ? 'History' : 'Settings'}
              </motion.h2>
            </AnimatePresence>
            {columns.length > 0 && (
              <span className="text-xs text-slate-600 font-medium">{columns.length} node{columns.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Status pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.12)', color: 'rgba(6,182,212,0.8)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dot-online" />
              Live
            </div>

            <Tooltip content="Clear all outputs">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearAll}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              </motion.button>
            </Tooltip>

          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Model Registry Panel */}
          <motion.aside
            initial={false}
            animate={{
              width: (isRegistryCollapsed || columns.length === 0 || activeMode !== 'grid') ? 0 : 300,
              opacity: (isRegistryCollapsed || columns.length === 0 || activeMode !== 'grid') ? 0 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative shrink-0 flex flex-col overflow-hidden group/registry"
            style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-0" style={{ background: 'rgba(12,12,16,0.95)', backdropFilter: 'blur(20px)' }} />

            {/* Collapse handle */}
            {columns.length > 0 && (
              <motion.button
                initial={false}
                animate={{ opacity: isRegistryCollapsed ? 1 : undefined }}
                onClick={() => setIsRegistryCollapsed(!isRegistryCollapsed)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-white transition-colors z-[60] opacity-0 group-hover/registry:opacity-100"
                style={{ background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              >
                {isRegistryCollapsed ? <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" /> : <ChevronLeft size={12} className="group-hover:-translate-x-0.5 transition-transform duration-300" />}
              </motion.button>
            )}

            <div className={`relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 w-[300px] transition-opacity duration-200 ${
              isRegistryCollapsed || columns.length === 0 || activeMode !== 'grid' ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>

              {activeMode === 'grid' && (
                <>
                  {/* Active Nodes */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Active Nodes</span>
                      <span className="text-[10px] font-mono text-indigo-400/70">{columns.length}/4</span>
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {columns.map((col) => (
                          <motion.div
                            key={col.id}
                            layout
                            initial={{ opacity: 0, y: -8 }}
                            animate={shakingColumnId === col.id ? {
                              x: [0, -8, 8, -6, 6, 0],
                              transition: { duration: 0.35 }
                            } : { opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="rounded-xl p-3.5 group/node relative"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  col.status === 'success' ? 'bg-emerald-400' :
                                  col.status === 'loading' ? 'bg-cyan-400 animate-pulse' :
                                  col.status === 'error'   ? 'bg-red-400' :
                                  'bg-slate-600'
                                }`} />
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Node {col.id}</span>
                              </div>
                              <button
                                onClick={() => removeColumn(col.id)}
                                className="opacity-0 group-hover/node:opacity-100 text-slate-700 hover:text-red-400 transition-all"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <Select value={col.modelId ?? ""} onValueChange={(val) => updateModel(col.id, val)}>
                              <SelectTrigger className="h-8 text-xs font-medium rounded-lg px-3 text-slate-300 overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '100%' }}
                              >
                                <div className="truncate w-full text-left">
                                  <SelectValue placeholder="Choose model..." />
                                </div>
                              </SelectTrigger>
                            <SelectContent className="bg-[#131318] border-white/10 text-slate-200 backdrop-blur-3xl rounded-2xl shadow-2xl p-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                              {providers.map(provider => (
                                <React.Fragment key={provider}>
                                  <p className="px-3 py-2 text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{provider}</p>
                                  {sortedModels.filter(m => m.provider === provider).map(m => (
                                    <SelectItem key={m.id} value={m.id} className="text-xs py-2 rounded-lg focus:bg-indigo-600/80 focus:text-white">
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                  <Separator className="my-1.5 bg-white/5" />
                                </React.Fragment>
                              ))}
                              {ollamaModels.length > 0 && (
                                <React.Fragment>
                                  <p className="px-3 py-2 text-[9px] font-semibold text-violet-500/60 uppercase tracking-widest flex items-center gap-1.5">
                                    <Bot size={9} />Ollama Local
                                  </p>
                                  {ollamaModels.map(m => (
                                    <SelectItem key={`ollama-${m.name}`} value={m.name} className="text-xs py-2 rounded-lg focus:bg-violet-600/80 focus:text-white">
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </React.Fragment>
                              )}
                            </SelectContent>
                          </Select>
                        </motion.div>
                        ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Add Node button */}
                    {columns.length < 4 && (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => addColumn()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-slate-600 hover:text-slate-400 transition-all text-xs font-semibold"
                        style={{ border: '1px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <Plus size={13} />
                        Add Node
                      </motion.button>
                    )}

                    <div className="h-px bg-white/[0.05]" />

                {/* Search */}
                <div className="relative mb-3">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    placeholder="Search models..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg text-xs placeholder:text-slate-700 outline-none font-medium text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* â”€â”€ Gemini Section â”€â”€ */}
                {(() => {
                  const geminiModels = filteredModels.filter(m => m.provider === 'gemini');
                  if (geminiModels.length === 0) return null;
                  const isOpen = expandedSections.gemini;
                  return (
                    <div>
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection('gemini')}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={11} className="text-indigo-400/70" />
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Gemini</span>
                          <span className="text-[9px] font-mono text-slate-700 tabular-nums">{geminiModels.length}</span>
                        </div>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={12} className="text-slate-700 rotate-90" />
                        </motion.div>
                      </button>

                      {/* Section body */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="gemini-list"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="space-y-0.5 pt-0.5 pb-1">
                              {geminiModels.map(model => {
                                const isActive = columns.some(c => c.modelId === model.id);
                                return (
                                  <motion.button
                                    key={model.id}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => isActive
                                      ? removeColumn(columns.find(c => c.modelId === model.id)!.id)
                                      : addColumn(model.id)
                                    }
                                    className={`w-full text-left pl-6 pr-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                                      isActive ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300 font-normal'
                                    }`}
                                    style={isActive ? {
                                      background: 'rgba(99,102,241,0.12)',
                                      border: '1px solid rgba(99,102,241,0.22)'
                                    } : {
                                      background: 'transparent',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <span className="truncate">{model.name}</span>
                                    {isActive
                                      ? <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 ml-2" />
                                      : <Plus size={10} className="opacity-0 group-hover:opacity-100 group-hover:text-indigo-400 group-hover:scale-125 shrink-0 ml-2 text-slate-600 transition-all duration-300" />
                                    }
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}

                {/* â”€â”€ Terminal Section â”€â”€ */}
                {(() => {
                  const termModels = filteredModels.filter(m => m.provider === 'terminal');
                  if (termModels.length === 0) return null;
                  const isOpen = expandedSections.terminal;
                  return (
                    <div>
                      <button
                        onClick={() => toggleSection('terminal')}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Terminal size={11} className="text-slate-600" />
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Terminal</span>
                          <span className="text-[9px] font-mono text-slate-700">{termModels.length}</span>
                        </div>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={12} className="text-slate-700 rotate-90" />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="terminal-list"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="space-y-0.5 pt-0.5 pb-1">
                              {termModels.map(model => {
                                const isActive = columns.some(c => c.modelId === model.id);
                                return (
                                  <motion.button
                                    key={model.id}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => isActive
                                      ? removeColumn(columns.find(c => c.modelId === model.id)!.id)
                                      : addColumn(model.id)
                                    }
                                    className={`w-full text-left pl-6 pr-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                                      isActive ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                    style={isActive ? {
                                      background: 'rgba(99,102,241,0.12)',
                                      border: '1px solid rgba(99,102,241,0.22)'
                                    } : {
                                      background: 'transparent',
                                      border: '1px solid transparent'
                                    }}
                                  >
                                    <span className="truncate">{model.name}</span>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 ml-2" />}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}

                {/* â”€â”€ Ollama Section â”€â”€ */}
                {(() => {
                  const isOpen = expandedSections.ollama;
                  const visibleOllama = ollamaModels.filter(m =>
                    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  return (
                    <div>
                      <div
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        onClick={() => toggleSection('ollama')}
                      >
                        <div className="flex items-center gap-2">
                          <Bot size={11} className="text-violet-400/70" />
                          <span className="text-[10px] font-semibold text-violet-500/60 uppercase tracking-widest">Ollama</span>
                          {ollamaStatus === 'loading'
                            ? <Loader2 size={9} className="animate-spin text-violet-400" />
                            : <span className="text-[9px] font-mono text-slate-700">{ollamaModels.length}</span>
                          }
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); fetchOllamaModels(); }}
                            disabled={ollamaStatus === 'loading'}
                            className="text-slate-700 hover:text-violet-400 transition-colors disabled:opacity-30 z-20"
                          >
                            <RefreshCw size={10} className={ollamaStatus === 'loading' ? 'animate-spin text-violet-400' : ''} />
                          </button>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronRight size={12} className="text-slate-700 rotate-90" />
                          </motion.div>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="ollama-list"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="pt-0.5 pb-1">
                              {ollamaStatus === 'error' && (
                                <div className="mx-1 mb-2 px-3 py-2 rounded-lg flex items-start gap-2"
                                  style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                                >
                                  <AlertCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[9px] font-semibold text-red-400">Ollama offline</p>
                                    <p className="text-[9px] text-slate-600 mt-0.5">Run <code className="text-violet-400 font-mono">ollama serve</code></p>
                                  </div>
                                </div>
                              )}
                              {ollamaStatus === 'ok' && visibleOllama.length === 0 && (
                                <p className="text-[9px] text-slate-700 pl-6 py-1">No models found. Run <code className="text-violet-400 font-mono text-[9px]">ollama pull &lt;model&gt;</code></p>
                              )}
                              <div className="space-y-0.5">
                                {visibleOllama.map(model => {
                                  const isActive = columns.some(c => c.modelId === model.name);
                                  const sizeGb = (model.size / 1e9).toFixed(1);
                                  return (
                                    <motion.button
                                      key={model.name}
                                      whileHover={{ x: 2 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => isActive
                                        ? removeColumn(columns.find(c => c.modelId === model.name)!.id)
                                        : addColumn(model.name)
                                      }
                                      className={`w-full text-left pl-6 pr-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                                        isActive ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300'
                                      }`}
                                      style={isActive ? {
                                        background: 'rgba(139,92,246,0.12)',
                                        border: '1px solid rgba(139,92,246,0.22)'
                                      } : {
                                        background: 'transparent',
                                        border: '1px solid transparent'
                                      }}
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate leading-none">{model.name}</p>
                                        <p className="text-[9px] text-slate-700 font-mono mt-0.5 flex items-center gap-1">
                                          <HardDrive size={8} />{sizeGb} GB
                                        </p>
                                      </div>
                                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0 ml-2" />}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}

                {/* â”€â”€ OpenAI / Claude / DeepSeek / OpenRouter Sections â”€â”€ */}
                {([
                  { key: 'openai',   label: 'OpenAI',   accent: 'text-green-400/70',  activeColor: 'rgba(34,197,94,0.12)',  activeBorder: 'rgba(34,197,94,0.22)',  dot: 'bg-green-400'  },
                  { key: 'claude',   label: 'Claude',   accent: 'text-orange-400/70', activeColor: 'rgba(251,146,60,0.12)', activeBorder: 'rgba(251,146,60,0.22)', dot: 'bg-slate-700' },
                  { key: 'deepseek', label: 'DeepSeek', accent: 'text-blue-400/70',   activeColor: 'rgba(96,165,250,0.12)', activeBorder: 'rgba(96,165,250,0.22)', dot: 'bg-blue-400'   },
                  { key: 'openrouter', label: 'OpenRouter', accent: 'text-purple-400/70', activeColor: 'rgba(168,85,247,0.12)', activeBorder: 'rgba(168,85,247,0.22)', dot: 'bg-purple-400' },
                ] as const).map(({ key, label, accent, activeColor, activeBorder, dot }) => {
                  const sectionModels = filteredModels.filter(m => m.provider === key);
                  if (sectionModels.length === 0) return null;
                  const isOpen = expandedSections[key];
                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggleSection(key)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Cpu size={11} className={accent} />
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
                          <span className="text-[9px] font-mono text-slate-700 tabular-nums">{sectionModels.length}</span>
                        </div>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={12} className="text-slate-700 rotate-90" />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key={`${key}-list`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="space-y-0.5 pt-0.5 pb-1">
                              {sectionModels.map(model => {
                                const isActive = columns.some(c => c.modelId === model.id);
                                return (
                                  <motion.button
                                    key={model.id}
                                    whileHover={{ x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => isActive
                                      ? removeColumn(columns.find(c => c.modelId === model.id)!.id)
                                      : addColumn(model.id)
                                    }
                                    className={`w-full text-left pl-6 pr-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all ${
                                      isActive ? 'text-white font-medium' : 'text-slate-500 hover:text-slate-300 font-normal'
                                    }`}
                                    style={isActive
                                      ? { background: activeColor, border: `1px solid ${activeBorder}` }
                                      : { background: 'transparent', border: '1px solid transparent' }
                                    }
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate leading-none">{model.name}</p>
                                      <p className="text-[9px] text-slate-700 font-mono mt-0.5 truncate">{model.description}</p>
                                    </div>
                                    {isActive
                                      ? <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0 ml-2`} />
                                      : <Plus size={10} className="opacity-0 group-hover:opacity-100 group-hover:text-indigo-400 group-hover:scale-125 shrink-0 ml-2 text-slate-600 transition-all duration-300" />
                                    }
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}


                </>
              )}
            </div>
          </motion.aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#121212] relative overflow-hidden">

          {/* Registry Toggle Handle */}
          {isRegistryCollapsed && (
            <button 
              onClick={() => setIsRegistryCollapsed(false)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 bg-[#171717] border border-white/10 border-l-0 rounded-r-2xl flex items-center justify-center text-cyan-400 hover:text-white transition-all z-50 shadow-2xl"
            >
              <ChevronRight size={14} />
            </button>
          )}

          <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
            <AnimatePresence mode="wait">
              {activeMode === 'settings' ? (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="flex-1 flex flex-col relative w-full min-h-0 overflow-hidden"
                >
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <header className="h-20 border-b border-white/5 px-10 flex items-center justify-between shrink-0">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">Settings</h2>
                        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mt-0.5">API Keys & Preferences</p>
                      </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-16 pb-32 min-h-0">
                      {/* API Keys Section */}
                      <section className="max-w-4xl">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <Key size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">API Keys</h3>
                            <p className="text-[10px] text-slate-500 mt-1">Configure your AI model credentials.</p>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          {([
                            { id: 'gemini',   label: 'Gemini',   hint: 'Google AI Studio key',      color: 'cyan',   icon: 'âœ¦' },
                            { id: 'openai',   label: 'OpenAI',   hint: 'OpenAI platform key',        color: 'green',  icon: 'â¬¡' },
                            { id: 'claude',   label: 'Claude',   hint: 'Anthropic Console key',      color: 'orange', icon: 'â—ˆ' },
                            { id: 'deepseek', label: 'DeepSeek', hint: 'DeepSeek platform key',      color: 'blue',   icon: 'â—Ž' },
                            { id: 'openrouter', label: 'OpenRouter', hint: 'OpenRouter AI key',      color: 'purple', icon: 'âœª' },
                          ] as const).map(({ id, label, hint, color, icon }) => (
                            <div key={id} className={`flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:border-${color}-500/20 transition-all`}>
                              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 group-hover:text-${color}-400 transition-colors text-lg font-bold`}>
                                {icon}
                              </div>
                              <div className="flex-1">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 block mb-1">
                                  {label} API KEY
                                </label>
                                <p className="text-[10px] text-slate-700 mb-2">{hint}</p>
                                <input
                                  type="password"
                                  placeholder={`Enter ${label} access token...`}
                                  className={`w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-${color}-400 focus:ring-1 focus:ring-${color}-500/20 outline-none placeholder:text-slate-800`}
                                  value={apiKeys[id] || ''}
                                  onChange={(e) => {
                                    const newKeys = { ...apiKeys, [id]: e.target.value };
                                    setApiKeys(newKeys);
                                    localStorage.setItem('llm_ref_api_keys', JSON.stringify(newKeys));
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>



                      {/* Model Parameters Section */}
                      <section className="max-w-4xl">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                            <Sliders size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">Generation Parameters</h3>
                            <p className="text-[10px] text-slate-500 mt-1">Fine-tune the entropy and output constraints of the battle nodes.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6 p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Temperature</label>
                              <span className="text-xs font-mono text-cyan-400">{modelSettings.temperature}</span>
                            </div>
                            <input 
                              type="range" min="0" max="2" step="0.1" 
                              className="w-full accent-cyan-500" 
                              value={modelSettings.temperature}
                              onChange={(e) => setModelSettings({...modelSettings, temperature: parseFloat(e.target.value)})}
                            />
                            <p className="text-[9px] text-slate-600">Controls randomness. Lower is more deterministic, higher is more creative.</p>
                          </div>

                          <div className="space-y-6 p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Max Tokens</label>
                              <span className="text-xs font-mono text-cyan-400">{modelSettings.maxTokens}</span>
                            </div>
                            <input 
                              type="number" 
                              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-white" 
                              value={modelSettings.maxTokens}
                              onChange={(e) => setModelSettings({...modelSettings, maxTokens: parseInt(e.target.value)})}
                            />
                            <p className="text-[9px] text-slate-600">Maximum length of the generated response in tokens.</p>
                          </div>

                          <div className="space-y-6 p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top P</label>
                              <span className="text-xs font-mono text-cyan-400">{modelSettings.topP}</span>
                            </div>
                            <input 
                              type="range" min="0" max="1" step="0.01" 
                              className="w-full accent-cyan-500" 
                              value={modelSettings.topP}
                              onChange={(e) => setModelSettings({...modelSettings, topP: parseFloat(e.target.value)})}
                            />
                            <p className="text-[9px] text-slate-600">Nucleus sampling: only considers tokens with cumulative probability P.</p>
                          </div>

                          <div className="space-y-6 p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top K</label>
                              <span className="text-xs font-mono text-cyan-400">{modelSettings.topK}</span>
                            </div>
                            <input 
                              type="number" 
                              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-white" 
                              value={modelSettings.topK}
                              onChange={(e) => setModelSettings({...modelSettings, topK: parseInt(e.target.value)})}
                            />
                            <p className="text-[9px] text-slate-600">Samples from the top K most likely tokens.</p>
                          </div>
                        </div>
                      </section>

                      {/* API Documentation Section */}
                      <section className="max-w-4xl">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <Code2 size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">Integration Guide</h3>
                            <p className="text-[10px] text-slate-500 mt-1">Example code for OpenRouter API (from documentation).</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {[
                            {
                              title: "OpenRouter SDK (@openrouter/sdk)",
                              lang: "typescript",
                              code: `import { OpenRouter } from "@openrouter/sdk";\n\nconst openrouter = new OpenRouter({\n  apiKey: "<OPENROUTER_API_KEY>"\n});\n\nconst completion = await openrouter.chat.send({\n  model: "openai/gpt-4o",\n  messages: [{ role: "user", content: "Hello" }],\n  session_id: "my-session-123"\n});`
                            },
                            {
                              title: "OpenAI-compatible SDK",
                              lang: "typescript",
                              code: `import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  baseURL: "https://openrouter.ai/api/v1",\n  apiKey: "<OPENROUTER_API_KEY>",\n  defaultHeaders: {\n    "HTTP-Referer": "<YOUR_SITE_URL>",\n    "X-Title": "<YOUR_SITE_NAME>",\n  }\n});\n\nconst completion = await openai.chat.completions.create({\n  model: "openai/gpt-4o",\n  messages: [{ role: "user", content: "Hello" }],\n  session_id: "my-session-123"\n});`
                            },
                            {
                              title: "Raw Fetch (Standard Web API)",
                              lang: "javascript",
                              code: `fetch("https://openrouter.ai/api/v1/chat/completions", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer <OPENROUTER_API_KEY>",\n    "HTTP-Referer": "<YOUR_SITE_URL>",\n    "X-Title": "<YOUR_SITE_NAME>",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    "model": "openai/gpt-4o",\n    "messages": [{ "role": "user", "content": "Hello" }],\n    "session_id": "my-session-123"\n  })\n});`
                            },
                            {
                              title: "cURL (Terminal)",
                              lang: "bash",
                              code: `curl https://openrouter.ai/api/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer <OPENROUTER_API_KEY>" \\\n  -d '{\n  "model": "openai/gpt-4o",\n  "messages": [{"role": "user", "content": "Hello"}],\n  "session_id": "my-session-123"\n}'`
                            }
                          ].map((snippet, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{snippet.title}</h4>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(snippet.code);
                                    toast.success("Code copied to clipboard!");
                                  }}
                                  className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                              <pre className="p-6 text-[11px] font-mono text-indigo-300 overflow-x-auto custom-scrollbar bg-black/20">
                                {snippet.code}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                  </div>
                </motion.div>
              ) : columns.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-700" />
                    <button 
                      onClick={() => addColumn()}
                      className="relative w-32 h-32 rounded-[3rem] bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-cyan-400 hover:text-white hover:border-cyan-500/50 transition-all duration-500 group/center-plus shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                      <Plus size={48} className="group-hover/center-plus:rotate-90 transition-transform duration-500" />
                    </button>
                  </div>
                  <div className="mt-10 space-y-4">
                    <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white">Get Started</h2>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                      Add a model to begin
                    </p>
                  </div>
                </motion.div>
              ) : activeMode === 'grid' ? (
                <motion.div 
                  key="grid"
                  variants={gridVariants}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  layout
                  className={`grid h-full overflow-hidden w-full min-h-0 divide-x divide-white/5 ${
                    columns.length === 1 ? 'grid-cols-1' :
                    columns.length === 2 ? 'grid-cols-2' :
                    columns.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
                  }`}
                >
                  <AnimatePresence mode="popLayout">
                  {columns.map((column) => (
                    <motion.div
                      key={column.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="min-h-0 h-full p-2"
                    >
                      <ErrorBoundary>
                        <ModelOutputCard 
                          column={column} 
                          onUpdate={(updated) => updateOutput(updated.id, { output: updated.output, localPrompt: updated.localPrompt, status: updated.status })}
                        />
                      </ErrorBoundary>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </motion.div>
              ) : activeMode === 'analysis' ? (
                <motion.div 
                  key="analysis"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="flex-1 flex flex-col relative w-full min-h-0 overflow-hidden"
                >
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <header className="h-20 border-b border-white/5 px-10 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Sparkles size={20} className="text-cyan-400 opacity-50" />
                        </div>
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-[0.1em] text-white">Analysis Report</h2>
                          <p className="text-[9px] font-medium text-slate-600 uppercase tracking-widest mt-0.5">Summary of model results</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Analysis model selector â€” custom dropdown, no native browser UI */}
                        <div className="flex items-center gap-1.5 relative">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-700">Judge</span>
                          <div className="relative">
                            <button
                              id="judge-dropdown-btn"
                              onClick={() => {
                                const panel = document.getElementById('judge-dropdown-panel');
                                if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                              }}
                              className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/8 text-slate-300 hover:border-white/20 hover:text-white transition-all cursor-pointer truncate max-w-[140px]"
                              style={{ background: 'rgba(255,255,255,0.04)' }}
                              title={AVAILABLE_MODELS.find(m => m.id === analysisModel)?.name ?? analysisModel}
                            >
                              {AVAILABLE_MODELS.find(m => m.id === analysisModel)?.name ?? analysisModel}
                            </button>
                            {/* Custom dropdown panel */}
                            <div
                              id="judge-dropdown-panel"
                              style={{ display: 'none', position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999, minWidth: '200px', maxHeight: '400px', overflowY: 'auto', background: '#0e0e12', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
                              className="custom-scrollbar"
                            >
                              {(['gemini', 'openai', 'claude', 'deepseek', 'openrouter'] as const).map((prov, pi) => {
                                const provModels = AVAILABLE_MODELS.filter(m => m.provider === prov);
                                if (provModels.length === 0) return null;
                                return (
                                  <div key={prov}>
                                    {pi > 0 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />}
                                    <p style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', padding: '2px 8px 4px' }}>{prov}</p>
                                    {provModels.map(m => (
                                      <button
                                        key={m.id}
                                        onClick={() => {
                                          setAnalysisModel(m.id);
                                          const panel = document.getElementById('judge-dropdown-panel');
                                          if (panel) panel.style.display = 'none';
                                        }}
                                        style={{
                                          display: 'block', width: '100%', textAlign: 'left',
                                          padding: '6px 10px', borderRadius: '8px', fontSize: '10px',
                                          fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                                          background: analysisModel === m.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                                          color: analysisModel === m.id ? 'rgba(165,180,252,1)' : 'rgba(148,163,184,1)',
                                          border: analysisModel === m.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                          cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (analysisModel !== m.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                        onMouseLeave={e => { if (analysisModel !== m.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                                      >
                                        {m.name}
                                      </button>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        {/* Re-run button */}
                        <button
                          onClick={() => runAnalysis()}
                          disabled={isAnalyzing || isCodeAnalyzing || columns.filter(c => c.status === 'success').length < 1}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/8 text-slate-600 hover:text-slate-300 hover:border-white/20 group disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          {isAnalyzing || isCodeAnalyzing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} className="group-hover:rotate-180 transition-transform duration-500" />}
                          Re-run
                        </button>
                        <div className="w-px h-4 bg-white/5" />
                        {/* Tab switcher â€” mutually exclusive based on prompt type */}
                        {(['standard', 'code'] as const).map(tab => {
                          const isCodeTab = tab === 'code';
                          // Standard is locked when this is a code session; Code is locked when it's not
                          const locked = isCodeTab ? !isCodeSession : isCodeSession;
                          const busy  = isCodeTab ? isCodeAnalyzing : isAnalyzing;
                          const disabled = locked || busy;
                          const tooltipMsg = locked
                            ? (isCodeTab ? 'Only available for coding prompts' : 'Not available for coding prompts â€” see Code Analysis tab')
                            : busy ? 'Analyzingâ€¦' : (isCodeTab ? 'Code comparison & synthesis' : 'General analysis');
                          return (
                            <Tooltip key={tab} content={tooltipMsg}>
                              <button
                                onClick={() => !disabled && setAnalysisTab(tab)}
                                disabled={disabled}
                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                  disabled
                                    ? 'text-slate-800 border border-white/[0.03] cursor-not-allowed opacity-40'
                                    : analysisTab === tab
                                      ? isCodeTab ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'text-slate-600 border border-white/5 hover:text-slate-400'
                                }`}
                              >
                                {isCodeTab ? (
                                  <span className="flex items-center gap-1.5">
                                    {busy && <Loader2 size={10} className="animate-spin" />}
                                    Code Analysis
                                    {isCodeSession && codeAnalysisOutput && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    {busy && <Loader2 size={10} className="animate-spin" />}
                                    Standard
                                  </span>
                                )}
                              </button>
                            </Tooltip>
                          );
                        })}
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-2">Nodes: {columns.length}</span>
                      </div>
                    </header>
                    <div className="flex-1 p-0 overflow-hidden flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-12 selection:bg-cyan-500/30 text-slate-300 min-h-0">

                        {analysisTab === 'code' ? (
                          <div className="max-w-5xl mx-auto space-y-10 pb-24">
                            {isCodeAnalyzing ? (
                              <div className="h-64 flex flex-col items-center justify-center gap-4">
                                <Loader2 size={32} className="animate-spin text-indigo-400" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Analyzing code qualityâ€¦</p>
                              </div>
                            ) : !codeAnalysisOutput ? (
                              <div className="h-64 flex flex-col items-center justify-center gap-3">
                                <p className="text-[12px] text-slate-500 text-center max-w-xs leading-relaxed">
                                  Code Analysis runs automatically when your prompt asks models to write code.
                                  <br /><span className="text-slate-700 text-[11px]">Run a code prompt first.</span>
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="p-6 rounded-[2rem] bg-indigo-500/[0.05] border border-indigo-500/20 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                      <Sparkles size={22} className="text-white" />
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">Best Code</p>
                                      <p className="text-sm font-black text-white">{codeAnalysisOutput.bestModelId}</p>
                                      <p className="text-[10px] text-indigo-300/60 mt-0.5">Language: {codeAnalysisOutput.language}</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl">Winner</Badge>
                                </div>

                                <div>
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Model Code Quality</p>
                                    <div className="h-px flex-1 bg-white/5" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(codeAnalysisOutput.modelCodeAnalysis).map(([modelId, data]) => (
                                      <div key={modelId} className={`p-6 rounded-[2rem] border ${codeAnalysisOutput.bestModelId === modelId ? 'bg-indigo-500/[0.04] border-indigo-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                          <p className={`text-[10px] font-black uppercase tracking-widest ${codeAnalysisOutput.bestModelId === modelId ? 'text-indigo-300' : 'text-slate-400'}`}>{modelId}</p>
                                          <span className="text-lg font-black text-white">{data.codeQualityScore}<span className="text-[10px] text-slate-600">%</span></span>
                                        </div>
                                        <div className="w-full h-1 rounded-full bg-white/5 mb-4">
                                          <div className="h-1 rounded-full bg-indigo-500 transition-all" style={{ width: `${data.codeQualityScore}%` }} />
                                        </div>
                                        <div className="space-y-2 text-[11px]">
                                          {data.strengths.map((s, i) => <p key={i} className="text-emerald-400/80 flex gap-1.5"><span>+</span>{s}</p>)}
                                          {data.weaknesses.map((w, i) => <p key={i} className="text-red-400/70 flex gap-1.5"><span>&#8722;</span>{w}</p>)}
                                        </div>
                                        {data.extractedCode && (
                                          <details className="mt-4">
                                            <summary className="text-[9px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:text-slate-400">View Code</summary>
                                            <pre className="mt-3 p-4 rounded-xl bg-black/40 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{data.extractedCode}</pre>
                                          </details>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {codeAnalysisOutput.codeDifferences?.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="h-px flex-1 bg-white/5" />
                                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-red-400/50">Implementation Differences</p>
                                      <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="space-y-3">
                                      {codeAnalysisOutput.codeDifferences.map((d, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                                          <div className="shrink-0 mt-0.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 block">{d.aspect}</span>
                                            <span className="text-[9px] text-cyan-400/60">Winner: {d.winner}</span>
                                          </div>
                                          <p className="text-[12px] text-slate-400 leading-relaxed">{d.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500/50">Synthesized Best-Of Implementation</p>
                                    <div className="h-px flex-1 bg-white/5" />
                                  </div>
                                  <p className="text-[12px] text-slate-400 leading-relaxed mb-4 italic">{codeAnalysisOutput.combinedExplanation}</p>
                                  <pre className="p-6 rounded-[2rem] bg-black/50 border border-white/5 text-[11px] text-slate-200 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">{codeAnalysisOutput.combinedCode}</pre>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="markdown-body max-w-5xl mx-auto opacity-90 leading-relaxed space-y-12 pb-24">
                            {isAnalyzing ? (
                              <div className="h-full flex flex-col items-center justify-center space-y-10">
                                <div className="relative">
                                  <motion.div
                                    animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-cyan-500 blur-3xl rounded-full"
                                  />
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="w-24 h-24 rounded-[2.5rem] border border-cyan-500/20 bg-white/[0.02] flex items-center justify-center relative backdrop-blur-3xl"
                                  >
                                    <Sparkles size={32} className="text-cyan-400 opacity-50" />
                                  </motion.div>
                                </div>
                                <div className="space-y-4 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <p className="text-[14px] font-black uppercase tracking-[0.4em] text-white">Analyzing</p>
                                    <div className="flex gap-1.5 translate-y-0.5">
                                      {[0, 1, 2].map(i => (
                                        <motion.div
                                          key={i}
                                          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
                                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                          className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Preparing comparison summary</p>
                                </div>
                              </div>
                            ) : columns.filter(c => c.status === 'success').length < 1 ? (
                              <div className="h-full flex flex-col items-center justify-center">
                                <p className="text-[12px] font-medium text-slate-500 max-w-xs text-center leading-relaxed">
                                  Run a comparison in the Comparison Grid first to see the analysis results here.
                                </p>
                              </div>
                            ) : (
                              <>
                                {analysisOutput?.bestResponseId && (
                                  <div className="mb-16 p-8 bg-cyan-500/[0.03] rounded-[3rem] border border-cyan-500/10 flex items-center justify-between shadow-2xl">
                                    <div className="flex items-center gap-8">
                                      <div className="w-16 h-16 rounded-[1.5rem] bg-cyan-500 flex items-center justify-center text-black shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                                        <Sparkles size={32} />
                                      </div>
                                      <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.1em] mb-1">Best Response</h3>
                                        <p className="text-[11px] font-medium text-cyan-400 uppercase tracking-[0.1em]">{analysisOutput.bestResponseId}</p>
                                      </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-4">
                                      <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Confidence Score</p>
                                        <p className="text-sm font-bold text-white tracking-widest uppercase">Elite</p>
                                      </div>
                                      <Badge className="bg-cyan-500 text-black font-black text-[9px] px-5 py-2.5 uppercase tracking-[0.2em] rounded-2xl">Selected</Badge>
                                    </div>
                                  </div>
                                )}

                                <section className="space-y-6">
                                  <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/50">Analysis Overview</h3>
                                    <div className="h-px flex-1 bg-white/5" />
                                  </div>
                                  <div className="text-slate-200 text-base font-sans prose prose-invert prose-p:leading-[1.9] prose-headings:tracking-tighter prose-headings:font-black max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {analysisOutput?.consensus || 'Analysis pending results.'}
                                    </ReactMarkdown>
                                  </div>
                                </section>

                                {analysisOutput?.differences && analysisOutput.differences.length > 0 && (
                                  <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                      <div className="h-px flex-1 bg-white/5" />
                                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/50">Comparison Points</h3>
                                      <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                      {analysisOutput.differences.map((diff, idx) => (
                                        <div key={idx} className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">{diff.category}</h4>
                                            <Badge variant="outline" className={`text-[8px] uppercase tracking-widest ${
                                              diff.impact === 'high' ? 'text-red-400 border-red-400/20' :
                                              diff.impact === 'medium' ? 'text-amber-400 border-amber-400/20' :
                                              'text-cyan-400 border-cyan-400/20'
                                            }`}>{diff.impact} Impact</Badge>
                                          </div>
                                          <p className="text-[13px] text-slate-400 leading-relaxed">{diff.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </section>
                                )}

                                {analysisOutput?.methodology && (
                                  <section className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">Analytical Methodology</h3>
                                    <div className="text-slate-500 font-mono text-[11px] leading-relaxed">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisOutput.methodology}</ReactMarkdown>
                                    </div>
                                  </section>
                                )}

                                {analysisOutput?.critique && Object.keys(analysisOutput.critique).length > 0 && (
                                  <div className="space-y-8">
                                    <div className="flex items-center gap-4">
                                      <div className="h-px flex-1 bg-white/5" />
                                      <h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-600">Protocol Node Audits</h3>
                                      <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {Object.entries(analysisOutput.critique).map(([modelId, critique]) => (
                                        <div key={modelId} className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${
                                          analysisOutput.bestResponseId === modelId
                                          ? 'bg-cyan-500/[0.02] border-cyan-500/20 shadow-xl'
                                          : 'bg-[#151515] border-white/5 hover:bg-[#181818]'
                                        }`}>
                                          <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                              <div className={`w-2 h-2 rounded-full ${analysisOutput.bestResponseId === modelId ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`} />
                                              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${analysisOutput.bestResponseId === modelId ? 'text-cyan-400' : 'text-slate-400'}`}>{modelId.split('-').slice(0, 2).join(' ')}</h4>
                                            </div>
                                            {analysisOutput.bestResponseId === modelId && <Sparkles size={14} className="text-cyan-500" />}
                                          </div>
                                          {typeof critique === 'object' && critique !== null ? (
                                            <div className="space-y-4">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Precision Score</span>
                                                <span className="text-sm font-black text-cyan-400">{critique.score}%</span>
                                              </div>
                                              <div className="space-y-2">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 block">Technical Audit</span>
                                                <p className="text-[11px] text-slate-300 leading-relaxed">{critique.analysis}</p>
                                              </div>
                                              <div className="space-y-2">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400/50 block">Actionable Vector</span>
                                                <p className="text-[11px] text-slate-400 leading-relaxed border-l border-indigo-400/10 pl-3">{critique.actionableFeedback}</p>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[12px] last:mb-0 text-slate-500 leading-relaxed font-medium">{(critique as any)}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                 <motion.div 
                  key="history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col relative w-full min-h-0 overflow-hidden"
                >
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <header className="h-20 border-b border-white/5 px-10 flex items-center justify-between shrink-0 bg-[#121212]/50 backdrop-blur-md">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">History</h2>
                        <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mt-0.5">Past Comparisons</p>
                      </div>
                    </header>
                    
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="flex-1 overflow-y-auto p-12 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32"
                    >
                      {history.length === 0 ? (
                        <div className="col-span-full h-full flex flex-col items-center justify-center opacity-20 space-y-6 py-40">
                          <Clock size={60} className="text-slate-500" />
                          <p className="text-xs uppercase font-bold tracking-[0.5em] text-center">Protocol history null</p>
                        </div>
                      ) : (
                        history.map((item) => (
                          <motion.button
                            key={item.id}
                            variants={itemVariants}
                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                            onClick={() => restoreHistory(item)}
                            className="w-full text-left p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] hover:bg-[#1a1a1a] hover:border-indigo-500/30 transition-all duration-500 group relative overflow-hidden flex flex-col h-[280px] shadow-lg shadow-black/20"
                          >
                            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400">
                                <ChevronRight size={18} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500/30" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">{new Date(item.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <h3 className="text-sm font-black text-white/80 mb-4 line-clamp-3 leading-[1.6] group-hover:text-white transition-colors flex-1 uppercase tracking-tight">
                              {item.prompt}
                            </h3>
                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                              <div className="flex gap-1.5">
                                {item.columns.map((c, i) => (
                                  <div key={i} className="w-2 h-2 rounded-md bg-slate-800 group-hover:bg-cyan-500/50 transition-colors" />
                                ))}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Nodes: {item.columns.length}</span>
                            </div>
                            <button 
                              className="absolute bottom-6 right-6 p-2 text-slate-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-40 hover:opacity-100 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistory(prev => prev.filter(h => h.id !== item.id));
                              }}
                            >
                              <X size={14} />
                            </button>
                          </motion.button>
                        ))
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Unified Footer Prompt Area */}
          {activeMode === 'grid' && columns.length > 0 && (
            <div 
              className="shrink-0 w-full bg-[#0a0a0c] border-t border-white/[0.04] px-10 py-6 z-40"
              style={{ background: 'linear-gradient(to top, rgba(10,10,12,1) 0%, rgba(10,10,12,0.8) 100%)' }}
            >
              <div className="max-w-7xl mx-auto flex items-center gap-6">
                <div className="flex-1 flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-3.5 focus-within:border-indigo-500/40 transition-all">
                  <input
                    className="flex-1 bg-transparent border-none text-slate-200 focus:ring-0 outline-none text-sm font-medium placeholder:text-slate-700"
                    placeholder="Type your prompt..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isGlobalLoading && (e.preventDefault(), runComparison())}
                  />
                  <div className="w-px h-4 bg-white/5 mx-2" />
                  <motion.button
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isGlobalLoading}
                    onClick={runComparison}
                    className="flex items-center gap-2.5 px-5 py-2 rounded-xl bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-400 disabled:opacity-30 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    {isGlobalLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-110 transition-transform duration-300" />
                        <span>Send</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Minimal Footer */}
          <footer className="h-14 border-t border-white/5 bg-[#121212] px-12 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-8 text-[10px] text-slate-700 font-black tracking-[0.3em]">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" /> NODE_OS: CONNECTED</span>
              <span className="opacity-50">UPTIME: 100%</span>
            </div>
            <div className="flex items-center gap-6 text-[10px] text-slate-800 font-mono font-bold tracking-widest">
               SECURE_ARCHIVE_ENABLED
            </div>
          </footer>
        </div>
      </div>
    </main>

      {/* Differences Modal */}
      <AnimatePresence>
        {showDifferencesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDifferencesModal(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl h-full max-h-[80vh] bg-[#0c0c0e] border border-white/10 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <header className="h-20 border-b border-white/5 px-10 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Microscope size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Detailed Differences</h2>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Step-by-step comparison</p>
                  </div>
                </div>
                <Tooltip content="Close divergence report">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowDifferencesModal(false)}
                    className="rounded-full hover:bg-white/5 text-slate-500"
                  >
                    <X size={18} />
                  </Button>
                </Tooltip>
              </header>
              
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="space-y-12 max-w-4xl mx-auto">
                  {analysisOutput?.differences?.map((diff, idx) => (
                    <div key={idx} className="relative pl-8 group">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${
                        diff.impact === 'high' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
                        diff.impact === 'medium' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 
                        'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                      }`} />
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-400">{diff.category}</h3>
                        <Badge className={`${
                          diff.impact === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          diff.impact === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        } text-[8px] font-mono tracking-widest`}>
                          IMPACT: {diff.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{diff.description}</p>
                    </div>
                  ))}

                  {/* Node Outputs side-by-side */}
                  <div className="pt-12 border-t border-white/5 space-y-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 text-center">Node Side-by-Side Reference</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/5">
                      {columns.filter(c => c.status === 'success').map((col) => (
                        <div key={col.id} className="bg-[#0c0c0e] p-8 flex flex-col space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest">{col.modelId}</h4>
                            <Badge variant="outline" className="text-[8px] opacity-40">Protocol 0{col.id}</Badge>
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar-mini">
                            {col.output}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <footer className="h-16 border-t border-white/5 px-10 flex items-center justify-between shrink-0 bg-white/[0.01]">
                <p className="text-[9px] font-mono text-slate-600 uppercase">End of Trace Matrix</p>
                <Button 
                  onClick={() => setShowDifferencesModal(false)}
                  className="bg-white text-black hover:bg-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest px-8"
                >
                  Close Archive
                </Button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

