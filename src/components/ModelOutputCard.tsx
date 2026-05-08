import React, { useEffect, useRef, useCallback } from 'react';
import { ComparisonColumn, AVAILABLE_MODELS } from '@/src/types';
import { Cpu, AlertCircle, Layers, Sparkles, Zap, Bot, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip } from './Tooltip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  column: ComparisonColumn;
  onUpdate?: (column: ComparisonColumn) => void;
}

export const ModelOutputCard: React.FC<Props> = ({ column, onUpdate }) => {
  const knownModel = AVAILABLE_MODELS.find(m => m.id === column.modelId);
  const isOllama = !knownModel && !!column.modelId;
  const model = knownModel ?? (isOllama ? {
    id: column.modelId!,
    name: column.modelId!,
    provider: 'ollama' as const,
    description: 'Local Ollama model'
  } : undefined);

  const scrollRef    = useRef<HTMLDivElement | null>(null);
  const observerRef  = useRef<MutationObserver | null>(null);
  const autoScroll   = useRef(true);

  // Re-enable auto-scroll every time a new generation starts
  useEffect(() => {
    if (column.status === 'loading') {
      autoScroll.current = true;
    }
  }, [column.status]);

  // Callback ref — fires the instant the scroll div mounts or unmounts
  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    // Tear down previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    scrollRef.current = node;

    if (!node) return;

    // Scroll helper
    const scrollToBottom = () => {
      if (autoScroll.current) node.scrollTop = node.scrollHeight;
    };

    // Observe every DOM mutation inside the scroll container.
    // This fires AFTER ReactMarkdown has written the new text nodes,
    // so scrollHeight is always the real rendered height.
    const obs = new MutationObserver(scrollToBottom);
    obs.observe(node, { childList: true, subtree: true, characterData: true });
    observerRef.current = obs;

    // Scroll immediately when the div first mounts
    scrollToBottom();
  }, []);   // empty deps — observer itself handles all future updates

  // Clean up observer when component unmounts
  useEffect(() => () => { observerRef.current?.disconnect(); }, []);

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
            {model?.provider === 'ollama'
              ? <Bot size={15} className={`${providerColor.icon} hover:scale-110 hover:-rotate-12 transition-transform duration-300`} />
              : model?.provider === 'openrouter'
                ? <Globe size={15} className={`${providerColor.icon} hover:scale-110 hover:-rotate-12 transition-transform duration-300`} />
              : model?.provider === 'gemini'
                ? <Sparkles size={15} className={`${providerColor.icon} hover:scale-110 hover:rotate-12 transition-transform duration-300`} />
                : <Cpu size={15} className={`${providerColor.icon} hover:scale-110 hover:rotate-12 transition-transform duration-300`} />
            }
          </div>
          <div className="min-w-0">
            <p className={`text-[9px] font-semibold uppercase tracking-widest leading-none mb-0.5 ${providerColor.label}`}>
              {model?.provider === 'ollama' ? 'Local' : model?.provider ?? 'model'}
            </p>
            <h3 className="text-xs font-bold text-white/90 truncate leading-none max-w-[120px]" title={model?.name || column.modelId}>
              {model?.name ?? (column.modelId ? column.modelId : 'Select a model')}
            </h3>
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
                  onClick={() => onUpdate?.({ ...column, status: 'idle', error: undefined })}
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
          onClick={() => onUpdate?.({ ...column, output: '', status: 'idle' })}
          className="text-[9px] font-medium text-slate-800 hover:text-red-400 transition-colors uppercase tracking-widest"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
