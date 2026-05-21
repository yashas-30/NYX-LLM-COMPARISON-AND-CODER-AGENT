/**
 * @file src/features/coder/components/MessageList.tsx
 * @description Renders the chat history with streaming support, markdown, syntax-highlighted
 *   code blocks, metrics, and copy/speed-read actions.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, BrainCircuit, Copy, Check, ArrowDown, Terminal } from 'lucide-react';
import { ChatMessage } from '@/src/core/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageListProps {
  history: ChatMessage[];
  activeAgent: 'open' | 'claude' | 'nyx';
  isLoading: boolean;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  onSpeedRead: (text: string) => void;
  emptyStateLabel?: string;
  emptyStateDescription?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Code Block Component
 * ───────────────────────────────────────────────────────────────────────────── */

const CodeBlock: React.FC<{
  language: string;
  code: string;
}> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const lang = language || 'text';

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-white/8 dark:border-white/5 shadow-xl ring-1 ring-black/10 dark:ring-black/30">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] dark:bg-[#0f0f1a] border-b border-white/8 dark:border-white/5">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/90" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/90" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/90" />
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Terminal size={10} className="text-primary/50" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
              {lang}
            </span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all duration-200 group-hover/code:opacity-100 opacity-60"
        >
          {copied ? (
            <>
              <Check size={10} className="text-emerald-400" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={10} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        showLineNumbers
        lineNumberStyle={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: '10px',
          userSelect: 'none',
          minWidth: '2.5em',
          paddingRight: '1em',
        }}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          background: '#13131f',
          fontSize: '12px',
          lineHeight: '1.65',
          borderRadius: 0,
          fontFamily: '"Geist Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
        }}
        codeTagProps={{
          style: {
            fontFamily: '"Geist Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
          }
        }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Markdown Renderer
 * ───────────────────────────────────────────────────────────────────────────── */

const MarkdownContent: React.FC<{ content: string; isStreaming?: boolean }> = ({
  content,
  isStreaming = false,
}) => {
  return (
    <div className="prose-nyx w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── Code blocks ────────────────────────────────────────────────────
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = !!match || (typeof children === 'string' && (children as string).includes('\n'));

            if (isBlock) {
              const lang = match ? match[1] : 'text';
              const code = String(children).replace(/\n$/, '');
              return <CodeBlock language={lang} code={code} />;
            }

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono font-semibold"
                {...props}
              >
                {children}
              </code>
            );
          },

          // ── Headings ───────────────────────────────────────────────────────
          h1: ({ children }) => (
            <h1 className="text-base font-black tracking-tight text-foreground mt-5 mb-2 pb-2 border-b border-white/10">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[13px] font-black tracking-tight text-foreground mt-4 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-primary inline-block shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[12px] font-bold tracking-tight text-foreground/90 mt-3 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-bold tracking-tight text-foreground/80 mt-2 mb-1">
              {children}
            </h4>
          ),

          // ── Paragraph ─────────────────────────────────────────────────────
          p: ({ children }) => (
            <p className="text-xs leading-[1.75] text-foreground/85 my-1.5 font-medium">
              {children}
            </p>
          ),

          // ── Lists ─────────────────────────────────────────────────────────
          ul: ({ children }) => (
            <ul className="space-y-1 my-2 pl-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 my-2 pl-0 list-none counter-reset-item">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-[11px] leading-relaxed text-foreground/80">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <span className="flex-1">{children}</span>
            </li>
          ),

          // ── Bold / Em ─────────────────────────────────────────────────────
          strong: ({ children }) => (
            <strong className="font-black text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-primary/80">{children}</em>
          ),

          // ── Blockquote ────────────────────────────────────────────────────
          blockquote: ({ children }) => (
            <blockquote className="my-2 pl-3 py-1 border-l-2 border-primary/50 bg-primary/5 rounded-r-lg text-[11px] text-foreground/70 italic">
              {children}
            </blockquote>
          ),

          // ── Horizontal rule ───────────────────────────────────────────────
          hr: () => (
            <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          ),

          // ── Table ─────────────────────────────────────────────────────────
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-[11px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-primary/10 text-primary border-b border-white/10">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-black uppercase tracking-wider text-[9px]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-t border-white/5 text-foreground/80">{children}</td>
          ),

          // ── Link ──────────────────────────────────────────────────────────
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/60 animate-pulse align-middle" />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Main Message List
 * ───────────────────────────────────────────────────────────────────────────── */

export const MessageList: React.FC<MessageListProps> = ({
  history,
  activeAgent,
  isLoading,
  onCopy,
  copiedId,
  onSpeedRead,
  emptyStateLabel = 'Awaiting Instructions',
  emptyStateDescription = 'Industrial-grade AI guidance for infrastructure and deployment.',
}) => {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      requestAnimationFrame(() => {
        if (consoleRef.current && autoScroll) {
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
      });
    }
  }, [history, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!consoleRef.current) return;
    requestAnimationFrame(() => {
      if (!consoleRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
      setShowJumpToBottom(!isAtBottom && history.length > 0);
    });
  }, [history.length]);

  const jumpToBottom = useCallback(() => {
    if (consoleRef.current) {
      requestAnimationFrame(() => {
        if (consoleRef.current) {
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
          setAutoScroll(true);
        }
      });
    }
  }, []);

  return (
    <div className="flex-1 min-h-0 relative flex flex-col bg-background/5 overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />
      </div>

      <div ref={consoleRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative p-4">
        <div className="w-full space-y-6 pb-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[20vh] text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-125 animate-pulse" />
                <motion.div className="w-8 h-8 text-primary relative z-10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </motion.div>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-sm font-bold tracking-tight text-foreground">{emptyStateLabel}</h2>
                <p className="text-muted-foreground max-w-xs mx-auto text-[10px] leading-relaxed">
                  {emptyStateDescription}
                </p>
              </div>
            </div>
          ) : (
            history.map((msg, i) => {
              const isUser = msg.role === 'user';
              const isStreaming = msg.status === 'loading';

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col w-full group mb-6"
                >
                  {/* Role label */}
                  <div className={`flex w-full mb-1 px-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isUser ? 'text-primary/70 dark:text-primary/95' : 'text-muted-foreground/45'}`}>
                      {isUser ? 'Operator' : 'System'}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div className={`
                    relative transition-all duration-500 w-full
                    ${isUser
                      ? activeAgent === 'nyx'
                        ? 'max-w-[85%] py-3 px-4 rounded-2xl border shadow-sm self-end rounded-tr-none text-[11px] bg-[#181224]/85 dark:bg-[#120B1C]/90 border-purple-500/30 text-purple-300 dark:text-purple-400 font-mono shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                        : 'max-w-[85%] py-3 px-4 rounded-2xl border shadow-sm self-end rounded-tr-none bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md border-white/30 dark:border-white/10 text-foreground/90'
                      : msg.status === 'error'
                        ? 'self-start text-red-500 dark:text-red-400 text-xs py-1.5'
                        : 'self-start text-foreground/90 text-xs py-1.5 pr-16 border-none shadow-none bg-transparent'
                    }
                  `}>
                    {msg.content ? (
                      <>
                        {isUser ? (
                          /* User messages: plain text, no markdown needed */
                          <div className="leading-[1.7] font-medium tracking-normal">
                            {msg.content}
                          </div>
                        ) : (
                          /* Assistant messages: rich markdown + syntax highlighting */
                          <MarkdownContent
                            content={msg.content}
                            isStreaming={isStreaming}
                          />
                        )}

                        {/* Action buttons */}
                        {!isUser && msg.content && msg.status !== 'error' && (
                          <div className="absolute top-0 right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <button
                              onClick={() => onCopy(msg.content, `msg-${i}`)}
                              className="p-1 rounded bg-background/80 hover:bg-background border border-border-strong/40 hover:border-border-strong text-muted-foreground hover:text-foreground transition-all"
                              title="Copy message"
                            >
                              {copiedId === `msg-${i}` ? <Check size={10} /> : <Copy size={10} />}
                            </button>
                            {(activeAgent === 'claude' || activeAgent === 'nyx') && (
                              <button
                                onClick={() => onSpeedRead(msg.content)}
                                className="p-1 rounded bg-background/80 hover:bg-background border border-border-strong/40 hover:border-border-strong text-muted-foreground hover:text-primary transition-all flex items-center gap-0.5"
                                title="Speed Read (RSVP)"
                              >
                                <Zap size={10} className="text-primary fill-primary/10" />
                                <span className="text-[9px] font-bold px-0.5">Speed Read</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Metrics */}
                        {!isUser && msg.metrics && (
                          <div className="mt-3 pt-2 border-t border-border-strong/20 flex items-center justify-end gap-2.5 opacity-40 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1">
                              <Zap className="w-2 h-2 text-primary" />
                              <span className="text-[8px] font-mono font-bold tracking-wider uppercase">
                                {msg.metrics.tps} <span className="text-[6px] opacity-40">t/s</span>
                              </span>
                            </div>
                            <div className="w-px h-1.5 bg-border-strong/50" />
                            <div className="flex items-center gap-1">
                              <BrainCircuit className="w-2 h-2 text-primary" />
                              <span className="text-[8px] font-mono font-bold tracking-wider uppercase">
                                {msg.metrics.tokens} <span className="text-[6px] opacity-40">units</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 py-1">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 self-start animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary">Executing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {showJumpToBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            onClick={jumpToBottom}
            className="absolute bottom-24 right-8 z-20 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform font-black uppercase tracking-widest text-[9px]"
          >
            <ArrowDown className="w-3 h-3" />
            Jump to Latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
