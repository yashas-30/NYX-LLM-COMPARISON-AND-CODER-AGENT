import React, { useEffect, useRef, useCallback } from 'react';
import { ComparisonColumn, AVAILABLE_MODELS, ModelOption, OllamaModel } from '@/src/types';
import { Cpu, AlertCircle, Layers, Sparkles, Zap, Bot, Globe, ChevronRight, Search, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from './Tooltip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  column: ComparisonColumn;
  allModels: ModelOption[];
  ollamaModels: OllamaModel[];
  onUpdate?: (id: string, updates: Partial<ComparisonColumn>) => void;
  onModelChange?: (id: string, modelId: string) => void;
}

export const ModelOutputCard: React.FC<Props> = ({ column, allModels, ollamaModels, onUpdate, onModelChange }) => {
  const [showModelSelector, setShowModelSelector] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const selectorRef = useRef<HTMLDivElement>(null);

  const knownModel = allModels.find(m => m.id === column.modelId);
  const isOllama = !knownModel && !!column.modelId;
  const model = knownModel ?? (isOllama ? {
    id: column.modelId!,
    name: column.modelId!,
    provider: 'ollama' as const,
    description: 'Local Ollama model'
  } : undefined);

  const scrollRef    = useRef<HTMLDivElement | null>(null);
  const observerRef  = useRef<ResizeObserver | null>(null);
  const autoScroll   = useRef(true);

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
  }, []);

  // Re-enable auto-scroll every time a new generation starts
  useEffect(() => {
    if (column.status === 'loading') {
      autoScroll.current = true;
    }
  }, [column.status]);

  // Optimized scroll handler - use RAF instead of MutationObserver
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const scrollToBottom = () => {
      if (autoScroll.current && node) {
        requestAnimationFrame(() => {
          node.scrollTo({
            top: node.scrollHeight,
            behavior: 'auto'
          });
        });
      }
    };

    // Track changes with ResizeObserver (more efficient than MutationObserver)
    const resizeObserver = new ResizeObserver(scrollToBottom);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Pause if the user has scrolled up more than 60px from the bottom
    autoScroll.current = el.scrollHeight - el.clientHeight - el.scrollTop < 60;
  };

  const providerColor = model?.provider === 'ollama'
    ? { icon: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400', label: 'text-violet-500/50' }
    : model?.provider === 'openrouter'
    ? { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400', label: 'text-purple-500/50' }
    : model?.provider === 'openai'
    ? { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'text-emerald-500/50' }
    : model?.provider === 'claude'
    ? { icon: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400', label: 'text-orange-500/50' }
    : model?.provider === 'deepseek'
    ? { icon: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', badge: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', label: 'text-cyan-500/50' }
    : model?.provider === 'gemini'
    ? { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400', label: 'text-blue-500/50' }
    : { icon: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', label: 'text-slate-600' };

  return (
    // KEY FIX: min-h-0 + flex-col so the card can shrink AND the inner scroll works
    <div className="flex flex-col min-h-0 h-full relative rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: '#0d0d12' }}>

      {/* Streaming glow overlay */}
      <AnimatePresence>
        {column.status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ background: 'linear-gradient(160deg, rgba(99,102,241,0.07) 0%, transparent 50%)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Model identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${providerColor.bg} ${providerColor.border} border`}>
            {model?.provider === 'gemini' && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-blue-400"><path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" /></svg>}
            {model?.provider === 'openai' && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-emerald-400"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5153-4.9066 6.0462 6.0462 0 0 0-3.9998-3.0441 5.93 5.93 0 0 0-5.064.9056 5.9847 5.9847 0 0 0-4.9066-.5153 6.0462 6.0462 0 0 0-3.0441 3.9998 5.93 5.93 0 0 0 .9056 5.064 5.9847 5.9847 0 0 0 .5153 4.9066 6.0462 6.0462 0 0 0 3.9998 3.0441 5.93 5.93 0 0 0 5.064-.9056 5.9847 5.9847 0 0 0 4.9066.5153 6.0462 6.0462 0 0 0 3.0441-3.9998 5.93 5.93 0 0 0-.9056-5.064Zm-10.2819 1.5791l-2.079-1.2h0l-3.9622 2.2875a4.5946 4.5946 0 0 1-.6026-3.4154 4.63 4.63 0 0 1 2.3032-3.0623l4.2255-2.4393 2.115 1.2209v4.6086Zm-8.1064 4.6909a4.5946 4.5946 0 0 1-2.8128-2.0128 4.63 4.63 0 0 1-.7591-3.7591l3.9622 2.2875v4.8786L6.5 14.85l-2.6064 1.2411Zm1.4875 3.1973a4.5946 4.5946 0 0 1-3.4154-.6026 4.63 4.63 0 0 1-3.0623-2.3032l2.4393-4.2255 2.115 1.2209h4.6086L7.373 19.2893Zm4.6909 2.1064a4.5946 4.5946 0 0 1-2.0128-2.8128 4.63 4.63 0 0 1-3.7591-.7591l2.2875-3.9622h4.8786l1.2411 2.6064Zm3.1973-1.4875a4.5946 4.5946 0 0 1-.6026 3.4154 4.63 4.63 0 0 1-2.3032 3.0623l-2.4393-4.2255 1.2209-2.115h4.6086l-0.4844 4.1372Zm2.1064-4.6909a4.5946 4.5946 0 0 1-2.8128 2.0128 4.63 4.63 0 0 1-3.7591.7591l-2.2875-3.9622V9.1214l2.6064-1.2411l2.6064 1.2411Z" /></svg>}
            {model?.provider === 'claude' && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-orange-400"><path d="M11.6667 3.33333L10.6667 8L15.3333 7L14.3333 2.33333L11.6667 3.33333ZM15.3333 7L14.3333 11.6667L19 10.6667L18 6L15.3333 7ZM14.3333 11.6667L13.3333 16.3333L18 15.3333L17 10.6667L14.3333 11.6667ZM13.3333 16.3333L12.3333 21L17 20L16 15.3333L13.3333 16.3333ZM12.3333 21L7.66667 20L8.66667 15.3333L11.3333 16.3333L12.3333 21ZM7.66667 20L3 19L4 14.3333L8.66667 15.3333L7.66667 20ZM8.66667 15.3333L4 14.3333L5 9.66667L9.66667 10.6667L8.66667 15.3333ZM9.66667 10.6667L5 9.66667L6 5L10.6667 6L9.66667 10.6667ZM10.6667 6L6 5L7 0.333333L11.6667 1.33333L10.6667 6Z" /></svg>}
            {model?.provider === 'deepseek' && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-blue-400"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>}
            {model?.provider === 'openrouter' && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-purple-400"><path d="M12 2L4 7V17L12 22L20 17V7L12 2ZM12 4.6L18 8.35V15.65L12 19.4L6 15.65V8.35L12 4.6Z" /></svg>}
            {model?.provider === 'ollama' && <Bot size={15} className="text-violet-400" />}
            {model?.provider === 'terminal' && <Terminal size={15} className="text-slate-400" />}
            {!model?.provider && <Cpu size={15} className="text-indigo-400" />}
          </div>
          <div className="min-w-0 relative" ref={selectorRef}>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="group/btn flex flex-col text-left min-w-0"
            >
              <p className={`text-[8px] font-bold uppercase tracking-[0.2em] leading-none mb-1 transition-colors ${showModelSelector ? providerColor.icon : providerColor.label}`}>
                {model?.provider === 'ollama' ? 'Local' : model?.provider ?? 'Select Model'}
              </p>
              <h3 className="text-[11px] font-black text-white/90 truncate leading-none flex items-center gap-1.5 group-hover/btn:text-white transition-colors">
                {model?.name ?? 'Choose model...'}
                <ChevronRight size={10} className={`text-slate-700 transition-transform ${showModelSelector ? 'rotate-90' : ''}`} />
              </h3>
            </button>

            {/* Premium Model Selector Dropdown */}
            <AnimatePresence>
              {showModelSelector && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-3 w-64 max-h-96 bg-[#0e0e12]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] overflow-hidden flex flex-col backdrop-blur-3xl"
                >
                  {/* Search Header */}
                  <div className="px-3 py-3 border-b border-white/5">
                    <div className="relative">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search models..."
                        className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-[10px] font-semibold text-slate-200 focus:ring-1 ring-indigo-500/30 outline-none placeholder:text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
                    {(() => {
                      const lowerSearch = searchTerm.toLowerCase();
                      const providers = ['gemini', 'openai', 'claude', 'deepseek', 'openrouter'] as const;
                      
                      const filteredProviders = providers.map(provider => {
                        const provModels = allModels.filter(m => 
                          m.provider === provider && 
                          (m.name.toLowerCase().includes(lowerSearch) || m.id.toLowerCase().includes(lowerSearch))
                        );
                        return { provider, models: provModels };
                      }).filter(p => p.models.length > 0);

                      const filteredOllama = ollamaModels.filter(m => 
                        m.name.toLowerCase().includes(lowerSearch)
                      );

                      if (filteredProviders.length === 0 && filteredOllama.length === 0) {
                        return (
                          <div className="py-8 text-center">
                            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">No models found</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          {filteredProviders.map(({ provider, models }) => (
                            <div key={provider}>
                              <p className="px-3 py-1 text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] mb-1">{provider}</p>
                              <div className="space-y-0.5">
                                {models.map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => {
                                      onModelChange?.(column.id, m.id);
                                      setShowModelSelector(false);
                                      setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                                      column.modelId === m.id 
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' 
                                        : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 border border-transparent'
                                    }`}
                                  >
                                    {m.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}

                          {filteredOllama.length > 0 && (
                            <div>
                              <p className="px-3 py-1 text-[8px] font-black text-violet-500/50 uppercase tracking-[0.2em] mb-1">Local Ollama</p>
                              <div className="space-y-0.5">
                                {filteredOllama.map(m => (
                                  <button
                                    key={m.name}
                                    onClick={() => {
                                      onModelChange?.(column.id, m.name);
                                      setShowModelSelector(false);
                                      setSearchTerm('');
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                                      column.modelId === m.name
                                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20'
                                        : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 border border-transparent'
                                      }`}
                                  >
                                    {m.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: stats + status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Latency / tokens chip */}
          <div className="hidden sm:flex items-center gap-1 text-[9px] font-mono text-slate-700 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span>{column.metadata?.latency ? `${column.metadata.latency}ms` : '--'}</span>
            <span className="opacity-30">·</span>
            <span>{column.metadata?.tokens ?? Math.floor(column.output.length / 4)}t</span>
          </div>

          {/* Status badge */}
          <AnimatePresence mode="wait">
            {column.status === 'loading' ? (
              <motion.div key="streaming"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: 'rgb(6,182,212)' }}
              >
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                Live
              </motion.div>
            ) : column.status === 'success' ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', color: 'rgb(52,211,153)' }}
              >
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Done
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Content area (KEY: flex-1 min-h-0 overflow-y-auto) ────── */}
      <div className="flex-1 min-h-0 relative">

        {/* Idle */}
        {column.status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 gap-4">
            <div className="w-16 h-16 rounded-2xl border border-white/[0.04] flex items-center justify-center bg-white/[0.02]">
              <Layers size={28} className="text-white/[0.06] hover:scale-110 hover:rotate-12 transition-transform duration-300" />
            </div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/10">Waiting for prompt</p>
          </div>
        )}

        {/* Loading skeleton */}
        {column.status === 'loading' && !column.output && (
          <div className="absolute inset-0 flex flex-col justify-center px-6 gap-2.5">
            {[100, 82, 94, 68, 88, 75].map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="h-2.5 rounded-full shimmer-line"
                style={{ width: `${w}%`, background: 'rgba(255,255,255,0.04)' }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {column.status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`w-full max-w-xs rounded-2xl p-6 flex flex-col items-center text-center gap-4 border ${
                column.error?.includes('[QUOTA EXHAUSTED]')
                  ? 'bg-amber-500/[0.04] border-amber-500/20'
                  : 'bg-red-500/[0.04] border-red-500/20'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                column.error?.toLowerCase().includes('quota') ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
              }`}>
                {column.error?.toLowerCase().includes('quota') ? <Zap size={22} className="hover:scale-110 hover:rotate-12 transition-transform duration-300" /> : <AlertCircle size={22} className="hover:scale-110 hover:-rotate-12 transition-transform duration-300" />}
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-white">
                  {column.error?.toLowerCase().includes('quota') ? 'Quota reached' : 'Error'}
                </h4>
                <p className={`text-[10px] leading-relaxed line-clamp-5 ${
                  column.error?.toLowerCase().includes('quota') ? 'text-amber-400/60' : 'text-red-400/60'
                }`}>
                  {(() => {
                    if (!column.error) return null;
                    if (column.error.includes('503') || column.error.includes('[503]')) return 'Model is overloaded. Please try again.';
                    
                    try {
                      // Attempt to parse API error JSON
                      const parsed = JSON.parse(column.error);
                      return parsed.error?.message || parsed.message || column.error;
                    } catch {
                      return column.error;
                    }
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate?.(column.id, { status: 'idle', error: undefined })}
                  className="px-4 py-2 rounded-lg text-[10px] font-semibold text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Dismiss
                </button>
                {column.error?.includes('openrouter.ai/settings/privacy') && (
                  <a
                    href="https://openrouter.ai/settings/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg text-[10px] font-semibold text-white transition-all bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20"
                  >
                    Open Settings
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Output — KEY: overflow-y-auto directly on this div, with h-full */}
        {(column.status === 'success' || (column.status === 'loading' && column.output)) && (
          <div
            ref={setScrollRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-y-auto custom-scrollbar px-4 py-3"
          >
            <div className={`markdown-body ${column.status === 'loading' ? 'streaming-cursor' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {column.output}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Top / bottom fade masks */}
        <div className="absolute top-0 inset-x-0 h-4 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to bottom, #0a0a0e, transparent)' }} />
        <div className="absolute bottom-0 inset-x-0 h-4 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to top, #0a0a0e, transparent)' }} />
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-2 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="text-[9px] font-mono text-slate-800 uppercase tracking-widest truncate max-w-[150px]" title={column.modelId}>
          {column.modelId || `node/${column.id}`}
        </span>
        <button
          onClick={() => onUpdate?.(column.id, { output: '', status: 'idle' })}
          className="text-[9px] font-medium text-slate-800 hover:text-red-400 transition-colors uppercase tracking-widest"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
