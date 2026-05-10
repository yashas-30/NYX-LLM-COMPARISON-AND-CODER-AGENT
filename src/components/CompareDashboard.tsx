import React, { useState, useEffect, useRef } from 'react';
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
import { motion, AnimatePresence, Variants } from 'motion/react';
import { Tooltip } from './Tooltip';
import { ErrorBoundary } from './ErrorBoundary';

interface CompareDashboardProps {
  onExit?: () => void;
}

export const CompareDashboard: React.FC<CompareDashboardProps> = ({ onExit }) => {
  const [columns, setColumns] = useState<ComparisonColumn[]>([]);
  const [globalPrompt, setGlobalPrompt] = useState('');
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
  const [isCodeSession, setIsCodeSession] = useState(false); 
  const [showDifferencesModal, setShowDifferencesModal] = useState(false);
  const [history, setHistory] = useState<ComparisonHistoryItem[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [showJudgeSelector, setShowJudgeSelector] = useState(false);
  const judgeSelectorRef = useRef<HTMLDivElement>(null);
  const [isRegistryCollapsed, setIsRegistryCollapsed] = useState(false);
  const [isForgeCollapsed, setIsForgeCollapsed] = useState(true);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [ollamaError, setOllamaError] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ gemini: true, terminal: false, ollama: false, openai: false, claude: false, deepseek: false, openrouter: false });

  const [securityPin, setSecurityPin] = useState<string | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [pinModal, setPinModal] = useState<{ open: boolean; targetKey: string | null; mode: 'verify' | 'set'; value: string }>({
    open: false, targetKey: null, mode: 'verify', value: ''
  });

  const activeControllers = useRef<Record<string, AbortController>>({});

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

  useEffect(() => {
    const savedHistory = localStorage.getItem('llm_ref_history');
    const savedKeys = localStorage.getItem('llm_ref_api_keys');
    const savedLegacyKey = localStorage.getItem('llm_ref_api_key');

    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error("Failed to load history", e); }
    }
    if (savedKeys) {
      try { setApiKeys(JSON.parse(savedKeys)); } catch (e) { console.error("Failed to load API keys", e); }
    } else if (savedLegacyKey) {
      setApiKeys({ gemini: savedLegacyKey });
    }

    const savedPin = localStorage.getItem('llm_ref_security_pin');
    if (savedPin) setSecurityPin(savedPin);

    fetchOllamaModels();
  }, []);

  const handlePinInput = (digit: string) => {
    setPinModal(prev => {
      const newValue = (prev.value + digit).slice(0, 6);
      if (newValue.length === 6) {
        if (prev.mode === 'set') {
          setSecurityPin(newValue);
          localStorage.setItem('llm_ref_security_pin', newValue);
          if (prev.targetKey) setUnlockedKeys(new Set([...unlockedKeys, prev.targetKey]));
          toast.success("Security PIN established");
          return { ...prev, open: false, value: '' };
        } else {
          if (newValue === securityPin) {
            if (prev.targetKey) setUnlockedKeys(new Set([...unlockedKeys, prev.targetKey]));
            toast.success("Field unlocked");
            return { ...prev, open: false, value: '' };
          } else {
            toast.error("Incorrect PIN");
            return { ...prev, value: '' };
          }
        }
      }
      return { ...prev, value: newValue };
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (judgeSelectorRef.current && !judgeSelectorRef.current.contains(event.target as Node)) {
        setShowJudgeSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('llm_ref_history', JSON.stringify(history));
  }, [history]);

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
    }, 500);

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

  const isOllamaModel = (m?: string) => !!m && !AVAILABLE_MODELS.some(am => am.id === m);

  const unloadOllamaIfNeeded = (modelId?: string, nodeId?: string) => {
    if (!isOllamaModel(modelId)) return;
    fetch('/api/ollama/unload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, nodeId }),
    }).catch(() => { });
  };

  const toggleModel = (modelId: string) => {
    const existingIndex = columns.findIndex(c => c.modelId === modelId);
    if (existingIndex !== -1) {
      if (columns.length <= 1) {
        toast.error("At least one model must remain active.");
        return;
      }
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
    if (!globalPrompt.trim() && columns.every(c => !c.localPrompt?.trim() && !c.output.trim())) {
      toast.warning("Please enter a prompt or paste content into nodes.");
      return;
    }

    const capturedPrompt = globalPrompt;
    setIsGlobalLoading(true);
    setGlobalPrompt('');
    abortAllGenerations();

    setColumns(prev => prev.map(c =>
      c.modelId ? { ...c, status: 'loading', output: '', error: undefined } : { ...c, status: 'idle' }
    ));

    let lastUpdate = Date.now();
    const promises = columns.map(async (column) => {
      if (!column.modelId) {
        setColumns(prev => prev.map(c => c.id === column.id ? { ...c, status: 'idle' } : c));
        return;
      }

      if (column.output.trim() && !column.localPrompt?.trim() && !globalPrompt.trim() && !capturedPrompt.trim()) return;

      try {
        const isOllama = ollamaModels.some(m => m.name === column.modelId);
        const model = AVAILABLE_MODELS.find(m => m.id === column.modelId);
        const provider = isOllama ? 'ollama' : (model?.provider || 'gemini');
        let finalKey = apiKeys[provider]?.trim();
        const activePrompt = column.localPrompt || capturedPrompt;
        
        if (provider === 'terminal') {
           await fetch('/api/terminal/prompt', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ nodeId: column.id, prompt: activePrompt })
           });
           return;
        }

        if (!activePrompt.trim()) {
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
          modelSettings,
          (partialText) => {
            const now = Date.now();
            if (now - lastUpdate > 30) {
              setColumns(prev => prev.map(c => c.id === column.id ? { ...c, output: partialText } : c));
              lastUpdate = now;
            }
          },
          0,
          controller.signal,
          column.id
        );
        delete activeControllers.current[column.id];
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
    
    setColumns(prev => {
      const successfulCols = prev.filter(c => c.status === 'success');
      if (successfulCols.length > 0) {
        const historyItem: ComparisonHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          globalPrompt: capturedPrompt || "Manual Analysis Session",
          timestamp: Date.now(),
          columns: prev.map(c => ({
            modelId: c.modelId,
            output: c.output,
            status: c.status as any
          }))
        };
        setHistory(hPrev => [historyItem, ...hPrev].slice(0, 50));
        runAnalysis(prev, capturedPrompt);
      }
      return prev;
    });
  };

  const restoreHistory = (item: ComparisonHistoryItem) => {
    setGlobalPrompt(item.globalPrompt);
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

  const runAnalysis = async (columnsToAnalyze?: ComparisonColumn[], globalPromptOverride?: string) => {
    const activeCols = columnsToAnalyze || columns;
    const successCols = activeCols.filter(c => c.status === 'success');
    if (successCols.length < 1) return;

    const judgeProvider = AVAILABLE_MODELS.find(m => m.id === analysisModel)?.provider || 'gemini';
    const analysisKey = apiKeys[judgeProvider as keyof typeof apiKeys]?.trim();
    if (!analysisKey) {
      if (!columnsToAnalyze) toast.warning(`Add your ${judgeProvider.charAt(0).toUpperCase() + judgeProvider.slice(1)} API key in Settings to enable analysis.`);
      return;
    }

    const activePrompt = globalPromptOverride || globalPrompt;
    const responses = successCols.map(c => ({ modelId: c.modelId!, output: c.output, localPrompt: c.localPrompt }));
    const isCode = isCodePrompt(activePrompt) || successCols.some(c => /```[\w]*\n/.test(c.output));

    setIsCodeSession(isCode);

    if (isCode) {
      setAnalysisTab('code');
      setAnalysisOutput(null);
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
        setCodeAnalysisOutput(null);
        toast.error(`Code Analysis: ${msg}`);
      } finally {
        setIsCodeAnalyzing(false);
      }
    } else {
      setAnalysisTab('standard');
      setCodeAnalysisOutput(null);
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
    setGlobalPrompt('');
    setAnalysisOutput(null);
    setColumns(columns.map(c => ({ ...c, status: 'idle', output: '', error: undefined })));
  };

  const sortedModels = [...AVAILABLE_MODELS].sort((a, b) => a.name.localeCompare(b.name));

  const filteredModels = sortedModels.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === 'all' || m.provider.toLowerCase() === providerFilter.toLowerCase();
    return matchesSearch && matchesProvider;
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.01 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } }
  };

  const hasOutput = columns.some(c => c.status === 'success' || (c.status === 'loading' && c.output));
  const hasHistory = history.length > 0;

  const navItems = [
    { mode: 'grid' as const,     icon: Cpu,      label: 'Chat',     tip: 'Comparison grid' },
    { mode: 'analysis' as const, icon: Activity, label: 'Analysis', tip: !hasOutput ? 'Generate output first' : 'View analysis', disabled: !hasOutput },
    { mode: 'history' as const,  icon: History,  label: 'History',  tip: !hasHistory ? 'No past sessions' : 'Past comparisons', disabled: !hasHistory },
    { mode: 'settings' as const, icon: Settings, label: 'Settings', tip: 'Configure settings' },
  ];

  return (
    <main className="flex h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      <div className="flex w-full h-full relative">
        <nav className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-10 bg-[#0c0c0e] z-50">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Layers size={24} className="text-white" />
          </div>
          <div className="flex flex-col gap-6 flex-1">
            {navItems.map((item) => (
              <Tooltip key={item.mode} content={item.tip}>
                <button
                  onClick={() => !item.disabled && setActiveMode(item.mode)}
                  disabled={item.disabled}
                  className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    activeMode === item.mode ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-600 hover:text-slate-300'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="text-[7px] font-black uppercase mt-1.5">{item.label}</span>
                </button>
              </Tooltip>
            ))}
          </div>
          <Tooltip content="Exit">
            <button onClick={onExit} className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-slate-600 hover:text-red-400">
              <DoorOpen size={20} />
              <span className="text-[7px] font-black uppercase mt-1.5">Exit</span>
            </button>
          </Tooltip>
        </nav>

        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0c] relative">
          <div className="flex-1 overflow-hidden relative flex flex-col p-8">
            <AnimatePresence mode="wait">
              {activeMode === 'grid' ? (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full flex flex-col">
                  {columns.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_20px_50px_rgba(99,102,241,0.1)]">
                          <Plus size={40} className="text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white/90">Add Node</h2>
                        <p className="text-slate-600 text-xs font-mono uppercase tracking-widest mt-2">Initialize your first model node to begin</p>
                        
                        <button 
                          onClick={() => addColumn()}
                          className="mt-10 px-8 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-indigo-400 hover:text-white transition-all shadow-xl"
                        >
                          Create Model Node
                        </button>
                      </motion.div>
                    </div>
                  ) : (
                    <div className={`grid h-full w-full gap-6 ${
                      columns.length === 1 ? 'grid-cols-1' : 
                      columns.length === 2 ? 'grid-cols-2' : 
                      columns.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
                    }`}>
                      {columns.map(col => (
                        <ModelOutputCard key={col.id} column={col} allModels={AVAILABLE_MODELS} ollamaModels={ollamaModels} onUpdate={updateOutput} onModelChange={updateModel} />
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : activeMode === 'analysis' ? (
                // ... (analysis content remains same)
                <motion.div key="analysis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full w-full max-w-5xl mx-auto overflow-y-auto custom-scrollbar">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-12">Synthesis Analysis</h2>
                  {isAnalyzing ? (
                    <div className="py-40 flex flex-col items-center gap-6">
                      <Loader2 size={48} className="animate-spin text-indigo-500" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Processing Node Cross-Talk...</p>
                    </div>
                  ) : analysisOutput ? (
                    <div className="space-y-12">
                      <div className="p-10 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/20">
                      <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisOutput.consensus}</ReactMarkdown>
                      </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-40 text-center opacity-20">
                      <Activity size={48} className="mx-auto mb-6" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No synthesis data cached</p>
                    </div>
                  )}
                </motion.div>
              ) : activeMode === 'history' ? (
                // ... (history remains same)
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full p-8">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-12">Temporal Archive</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {history.map(item => (
                      <button key={item.id} onClick={() => restoreHistory(item)} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 text-left hover:bg-white/[0.04] transition-all">
                        <p className="text-[8px] font-black text-slate-700 uppercase mb-4">{new Date(item.timestamp).toLocaleString()}</p>
                        <h3 className="text-xs font-black text-slate-300 line-clamp-3 uppercase leading-relaxed">{item.globalPrompt}</h3>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full max-w-4xl mx-auto">
                   <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-12">System Core</h2>
                   <div className="space-y-6">
                     {['gemini', 'openai', 'claude', 'deepseek', 'openrouter'].map(p => (
                       <div key={p} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center gap-8">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black uppercase">{p[0]}</div>
                         <div className="flex-1">
                           <p className="text-[9px] font-black uppercase text-slate-600 mb-2">{p} Access Key</p>
                           <input type="password" value={apiKeys[p] || ''} onChange={e => updateApiKey(p, e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-indigo-400" />
                         </div>
                       </div>
                     ))}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {activeMode === 'grid' && columns.length > 0 && (
            <footer className="p-8 border-t border-white/5 bg-[#0c0c0e]/50 backdrop-blur-xl shrink-0">

              <div className="max-w-4xl mx-auto flex items-center gap-4">
                {/* Redesigned Add Node Button Near Prompt */}
                <Tooltip content="Add Model Node">
                  <button 
                    onClick={() => addColumn()}
                    disabled={columns.length >= 4}
                    className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0 shadow-lg"
                  >
                    <Plus size={24} />
                  </button>
                </Tooltip>

                <div className="flex-1 flex gap-3 bg-white/[0.02] border border-white/5 rounded-[2rem] p-1.5 pr-1.5 pl-8 focus-within:border-indigo-500/30 transition-all backdrop-blur-3xl">
                  <input 
                    className="flex-1 bg-transparent border-none text-slate-200 outline-none text-sm placeholder:text-slate-700 font-medium" 
                    placeholder="Start Conversation" 
                    value={globalPrompt} 
                    onChange={e => setGlobalPrompt(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && runComparison()} 
                  />
                  <Tooltip content="Send Message">
                    <button 
                      onClick={runComparison} 
                      disabled={isGlobalLoading || (columns.length === 0 && !globalPrompt.trim())} 
                      className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-[1.5rem] w-14 h-14 flex items-center justify-center transition-all disabled:opacity-20 disabled:grayscale shadow-lg shadow-indigo-500/20"
                    >
                      {isGlobalLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </Tooltip>
                </div>
              </div>
            </footer>
          )}


        </div>
      </div>

      <AnimatePresence>
        {pinModal.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#0e0e12] border border-white/10 rounded-[3rem] p-12 flex flex-col items-center max-w-sm">
              <Shield size={48} className="text-indigo-500 mb-8" />
              <div className="flex gap-4 mb-12">
                {[0,1,2,3,4,5].map(i => <div key={i} className={`w-3 h-3 rounded-full ${pinModal.value.length > i ? 'bg-indigo-500' : 'bg-white/5 border border-white/10'}`} />)}
              </div>
              <div className="grid grid-cols-3 gap-4 w-full">
                {[1,2,3,4,5,6,7,8,9,'Clear',0,'Exit'].map(n => (
                  <button key={n} onClick={() => { if(n==='Clear')setPinModal({...pinModal,value:''});else if(n==='Exit')setPinModal({...pinModal,open:false});else handlePinInput(n.toString()) }} className="h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-white font-bold hover:bg-white/[0.08] active:scale-95 transition-all">{n}</button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

