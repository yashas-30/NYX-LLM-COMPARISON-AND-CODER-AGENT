import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  motion, 
  AnimatePresence, 
  useScroll, 
  useTransform, 
  useSpring,
  useMotionValue
} from 'framer-motion';
import { 
  Search, 
  Send, 
  Settings, 
  History, 
  LayoutGrid, 
  Zap, 
  Cpu, 
  ChevronRight, 
  CheckCircle2, 
  Code2,
  FileDiff,
  BarChart3,
  Key,
  RefreshCw,
  Sparkles,
  Bot,
  Terminal,
  Clock,
  Layers,
  Fingerprint,
  Plus,
  X
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ── Types & Mock Data ──────────────────────────────────────────

type ModelProvider = 'Google' | 'Anthropic' | 'DeepSeek' | 'OpenRouter';

interface LLMModel {
  id: string;
  name: string;
  provider: ModelProvider;
  active: boolean;
  color: string;
}

interface RunResult {
  id: string;
  prompt: string;
  timestamp: string;
  models: string[];
  outputs: Record<string, string>;
}

const MOCK_MODELS: LLMModel[] = [
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', active: true, color: '#7C3AED' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', active: true, color: '#06B6D4' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', active: true, color: '#F97316' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', active: true, color: '#10B981' },
  { id: 'gpt-4o', name: 'GPT-4o (via OpenRouter)', provider: 'OpenRouter', active: false, color: '#FFFFFF' },
];

const MOCK_HISTORY: RunResult[] = [
  {
    id: '1',
    prompt: 'Write a React component for a glassmorphism card.',
    timestamp: '2 mins ago',
    models: ['gemini-1.5-pro', 'claude-3-5-sonnet'],
    outputs: {
      'gemini-1.5-pro': '```tsx\nexport const Card = () => (\n  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">\n    <h2 className="text-white">Glass Card</h2>\n  </div>\n);```',
      'claude-3-5-sonnet': '```tsx\nconst GlassCard = ({ children }) => {\n  return (\n    <div className="p-4 bg-opacity-20 bg-clip-padding backdrop-filter backdrop-blur-xl border border-gray-200 rounded-2xl">\n      {children}\n    </div>\n  );\n};```'
    }
  },
  {
    id: '2',
    prompt: 'Explain quantum entanglement in simple terms.',
    timestamp: '1 hour ago',
    models: ['deepseek-v3'],
    outputs: { 'deepseek-v3': 'Quantum entanglement is a physical phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in a way such that the quantum state of each particle cannot be described independently of the state of the others.' }
  }
];

// ── Custom Hooks ──────────────────────────────────────────────

const useLerpMouse = (factor = 0.08) => {
  const mouse = useRef({ x: 0, y: 0 });
  const lerp = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    let frameId: number;
    const animate = () => {
      lerp.current.x += (mouse.current.x - lerp.current.x) * factor;
      lerp.current.y += (mouse.current.y - lerp.current.y) * factor;
      setPosition({ x: lerp.current.x, y: lerp.current.y });
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, [factor]);

  return position;
};

// ── Components ────────────────────────────────────────────────

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/10 ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    {children}
  </div>
);

const TypewriterText = ({ text, delay = 20 }: { text: string, delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay]);

  return <span>{displayedText}</span>;
};

// ── Pages ───────────────────────────────────────────────────

const LandingPage = ({ onStart }: { onStart: () => void }) => {
  const orbPos = useLerpMouse(0.06);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      
      {/* Interactive Cursor Orb */}
      <motion.div 
        className="fixed pointer-events-none z-0 rounded-full blur-[120px] opacity-20 bg-violet"
        style={{ 
          width: 600, 
          height: 600, 
          x: orbPos.x - 300, 
          y: orbPos.y - 300,
        }}
        animate={{
          backgroundColor: ['#7C3AED', '#06B6D4', '#10B981', '#7C3AED'],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating Provider Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { Icon: Bot, color: '#7C3AED', top: '15%', left: '10%' },
          { Icon: Sparkles, color: '#06B6D4', top: '25%', left: '80%' },
          { Icon: Cpu, color: '#10B981', top: '70%', left: '15%' },
          { Icon: Zap, color: '#F97316', top: '65%', left: '75%' },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute opacity-10"
            style={{ top: item.top, left: item.left }}
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 5 + i, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.5 
            }}
          >
            <item.Icon size={64} color={item.color} />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <motion.h1 
          className="text-8xl md:text-9xl font-black tracking-tighter mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet via-cyan to-emerald animate-gradient-x bg-[length:200%_auto]">
            LLMLab
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl text-slate-500 font-medium tracking-tight mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          One Prompt. Every Model. Total Clarity.
        </motion.p>

        <motion.button
          onClick={onStart}
          className="group relative px-10 py-5 rounded-full font-bold text-lg text-white transition-all overflow-hidden"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet to-cyan opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-all scale-150" />
          <span className="relative flex items-center gap-2">
            Get Started <ChevronRight size={20} />
          </span>
          <motion.div 
            className="absolute inset-0 border-2 border-white/30 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      </div>

      {/* Footer Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};

const ArenaPage = ({ prompt, setPrompt, handleRun, isRunning, results }: any) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="max-w-3xl mx-auto w-full">
        <GlassCard className="p-1 focus-within:ring-2 ring-violet/50">
          <div className="flex items-center px-4">
            <Search className="text-slate-500 mr-3" size={20} />
            <input 
              type="text" 
              placeholder="Enter your prompt here..."
              className="w-full bg-transparent border-none focus:ring-0 text-lg py-4 text-white placeholder:text-slate-600"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            />
            <motion.button
              onClick={handleRun}
              disabled={isRunning || !prompt.trim()}
              className="p-3 bg-violet rounded-xl text-white disabled:opacity-50 disabled:grayscale transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={20} />
            </motion.button>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {MOCK_MODELS.filter(m => m.active).map((model, idx) => (
            <motion.div
              key={model.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.1, type: "spring", damping: 20 }}
            >
              <GlassCard className="h-full flex flex-col min-h-[300px]">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg" 
                      style={{ backgroundColor: `${model.color}20`, color: model.color }}
                    >
                      <Bot size={18} />
                    </div>
                    <span className="font-semibold text-sm tracking-tight">{model.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${results[model.id] ? 'bg-emerald animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                      {results[model.id] ? 'Online' : 'Standby'}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex-1 text-sm text-slate-300 font-mono leading-relaxed overflow-auto custom-scrollbar">
                  {results[model.id] ? (
                    <TypewriterText text={results[model.id]} />
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-20 italic">
                      {isRunning ? 'Thinking...' : 'Awaiting prompt...'}
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Floating Action Button */}
      <motion.button
        onClick={handleRun}
        disabled={isRunning || !prompt.trim()}
        className="fixed bottom-8 right-8 px-6 py-4 rounded-2xl bg-white text-black font-bold flex items-center gap-2 shadow-2xl hover:bg-slate-100 transition-colors z-50 overflow-hidden disabled:opacity-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet/20 to-cyan/20 animate-shimmer" />
        <Zap size={20} className="fill-current" />
        Run All Models
      </motion.button>
    </div>
  );
};

const AnalysisPage = () => {
  const [mode, setMode] = useState<'standard' | 'code'>('standard');
  const radarData = [
    { subject: 'Accuracy', A: 120, B: 110, fullMark: 150 },
    { subject: 'Speed', A: 98, B: 130, fullMark: 150 },
    { subject: 'Verbosity', A: 86, B: 130, fullMark: 150 },
    { subject: 'Logic', A: 99, B: 100, fullMark: 150 },
    { subject: 'Safety', A: 140, B: 120, fullMark: 150 },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Model Analysis</h2>
        <div className="flex p-1 bg-white/5 rounded-full border border-white/10 relative">
          <motion.div 
            className="absolute bg-violet rounded-full h-[calc(100%-8px)] my-1"
            initial={false}
            animate={{ x: mode === 'standard' ? 4 : 100, width: mode === 'standard' ? 92 : 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button 
            onClick={() => setMode('standard')}
            className={`relative z-10 px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'standard' ? 'text-white' : 'text-slate-500'}`}
          >
            Standard
          </button>
          <button 
            onClick={() => setMode('code')}
            className={`relative z-10 px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'code' ? 'text-white' : 'text-slate-500'}`}
          >
            Code
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6 text-slate-400 text-sm font-mono">
              <FileDiff size={16} /> 
              <span>COMPARISON: GEMINI-1.5-PRO VS CLAUDE-3.5-SONNET</span>
            </div>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="p-4 bg-emerald/10 border-l-4 border-emerald rounded-r-xl">
                <span className="text-emerald font-bold mr-2">+</span>
                Utilizes the latest Transformer architecture with enhanced attention mechanisms...
              </div>
              <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-xl opacity-60">
                <span className="text-rose-500 font-bold mr-2">-</span>
                Relies on legacy sparse-tensor processing which may lead to higher latency...
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                General output consistency remains high across both variations, with notable divergence in technical terminology selection.
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-mono">
                <Code2 size={16} /> 
                <span>SYNTAX DIFF VIEW</span>
              </div>
              <div className="bg-emerald/20 text-emerald text-[10px] font-bold px-2 py-1 rounded border border-emerald/30">
                92% SIMILARITY
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/5">
              <SyntaxHighlighter 
                language="typescript" 
                style={vscDarkPlus}
                customStyle={{ background: 'transparent', padding: '1.5rem', margin: 0 }}
              >
                {`// Canonical Model Implementation
function processPrompt(input: string) {
  const result = await ai.generate(input);
  return result.text;
}`}
              </SyntaxHighlighter>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-8">
          <GlassCard className="p-6 flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-8 flex items-center gap-2 self-start">
              <BarChart3 size={20} className="text-violet" />
              Performance Metrics
            </h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Radar
                    name="Model A"
                    dataKey="A"
                    stroke="#7C3AED"
                    fill="#7C3AED"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Model B"
                    dataKey="B"
                    stroke="#06B6D4"
                    fill="#06B6D4"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-8">
              <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-2xl font-bold text-violet">8.4s</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Avg Latency</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-2xl font-bold text-emerald">100%</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Reliability</div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const HistoryPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Run History</h2>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search prompts..."
            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 ring-violet transition-all w-64"
          />
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_HISTORY.map((run, i) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-4 hover:bg-white/[0.07] cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 rounded-xl bg-violet/10 text-violet group-hover:scale-110 transition-transform">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 line-clamp-1">{run.prompt}</h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>{run.timestamp}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <div className="flex -space-x-2">
                        {run.models.map((m, idx) => (
                          <div key={idx} className="w-5 h-5 rounded-full bg-slate-800 border border-black flex items-center justify-center text-[8px]">
                            {m.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span>{run.models.length} models</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const providers = [
    { name: 'Google Gemini', icon: Bot, color: '#7C3AED' },
    { name: 'Anthropic Claude', icon: Cpu, color: '#F97316' },
    { name: 'DeepSeek', icon: Terminal, color: '#10B981' },
    { name: 'OpenRouter', icon: Layers, color: '#FFFFFF' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-700">
      <section>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Fingerprint size={24} className="text-violet" />
          API Connectivity
        </h3>
        <div className="space-y-6">
          {providers.map((p, i) => (
            <GlassCard key={p.name} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                    <p.icon size={20} />
                  </div>
                  <span className="font-bold">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald uppercase tracking-widest">
                  <CheckCircle2 size={12} /> Key Active
                </div>
              </div>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input 
                    type="password" 
                    value="••••••••••••••••••••••••••••••••"
                    readOnly
                    className="w-full bg-black/50 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-slate-400 focus:ring-1 ring-violet"
                  />
                </div>
                <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-sm font-bold flex items-center gap-2">
                  <RefreshCw size={16} /> Test
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Layers size={24} className="text-cyan" />
          Preferences
        </h3>
        <GlassCard className="divide-y divide-white/5">
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="font-bold">OLED Dark Mode</div>
              <div className="text-sm text-slate-500">Enable pure black background for OLED screens</div>
            </div>
            <div className="w-12 h-6 bg-violet rounded-full relative p-1 cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="font-bold">Streaming Responses</div>
              <div className="text-sm text-slate-500">Simulate real-time output delivery</div>
            </div>
            <div className="w-12 h-6 bg-emerald rounded-full relative p-1 cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
};

// ── App Container ─────────────────────────────────────────────

export default function LLMLab() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'arena' | 'analysis' | 'history' | 'settings'>('arena');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModelDrawerOpen, setIsModelDrawerOpen] = useState(false);

  // Global Arena State
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [models, setModels] = useState<LLMModel[]>(MOCK_MODELS);

  const toggleModel = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  };

  const activeModels = useMemo(() => models.filter(m => m.active), [models]);

  const handleRun = () => {
    if (!prompt.trim() || activeModels.length === 0) return;
    setIsRunning(true);
    setResults({});
    
    activeModels.forEach((model, i) => {
      setTimeout(() => {
        setResults(prev => ({
          ...prev,
          [model.id]: `[LLMLab Output] Responding from ${model.name} for: "${prompt.slice(0, 30)}..."\n\nThis is a high-fidelity simulated response optimized for ${model.provider} performance characteristics.`
        }));
        if (i === activeModels.length - 1) setIsRunning(false);
      }, 800 + i * 400);
    });
  };

  if (!started) return <LandingPage onStart={() => setStarted(true)} />;

  return (
    <div className="flex min-h-screen bg-black text-slate-200">
      {/* Sidebar / Navigation */}
      <motion.aside 
        className="fixed md:relative z-40 bg-[#050505] border-r border-white/5 flex flex-col transition-all overflow-hidden h-screen"
        animate={{ width: isSidebarOpen ? 280 : 80 }}
      >
        <div className="p-6 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet to-cyan flex items-center justify-center shrink-0">
            <Zap className="text-white fill-current" size={24} />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
            >
              LLMLab
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'arena', label: 'Arena', Icon: LayoutGrid },
            { id: 'analysis', label: 'Analysis', Icon: BarChart3 },
            { id: 'history', label: 'History', Icon: History },
            { id: 'settings', label: 'Settings', Icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all relative group ${
                activeTab === item.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeNav"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.Icon className="shrink-0 relative z-10" size={20} />
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold tracking-tight relative z-10"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-slate-500"
          >
            {isSidebarOpen ? <ChevronRight className="rotate-180" /> : <ChevronRight />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium capitalize">{activeTab}</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className="text-white font-bold">Standard Session</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald/10 border border-emerald/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="text-[10px] font-black text-emerald uppercase tracking-widest">System Stable</span>
            </div>
            <GlassCard className="p-2">
              <Fingerprint size={20} className="text-slate-400" />
            </GlassCard>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          {/* Subtle Global Background Glows */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

          {activeTab === 'arena' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setIsModelDrawerOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-sm font-bold"
                >
                  <Plus size={18} /> Select Models
                </button>
              </div>
              
              <ArenaPage 
                prompt={prompt} 
                setPrompt={setPrompt} 
                handleRun={handleRun} 
                isRunning={isRunning} 
                results={results} 
                activeModels={activeModels}
              />

              {/* Model Selector Drawer */}
              <AnimatePresence>
                {isModelDrawerOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsModelDrawerOpen(false)}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed left-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-r border-white/10 z-[70] p-8 shadow-2xl"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold">Model Registry</h3>
                        <button onClick={() => setIsModelDrawerOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {models.map(model => (
                          <div 
                            key={model.id}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              model.active 
                                ? 'bg-white/5 border-white/20' 
                                : 'bg-transparent border-white/5 opacity-50'
                            }`}
                            onClick={() => toggleModel(model.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg" style={{ backgroundColor: `${model.color}20`, color: model.color }}>
                                <Bot size={18} />
                              </div>
                              <div className="text-sm font-bold">{model.name}</div>
                            </div>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${model.active ? 'bg-violet' : 'bg-slate-800'}`}>
                              <motion.div 
                                className="absolute top-1 w-3 h-3 bg-white rounded-full"
                                animate={{ left: model.active ? 24 : 4 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="absolute bottom-8 left-8 right-8">
                        <button 
                          onClick={() => setIsModelDrawerOpen(false)}
                          className="w-full py-4 bg-violet hover:bg-violet-600 rounded-2xl font-bold transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
          {activeTab === 'analysis' && <AnalysisPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </div>
      </main>

      {/* Mobile Navigation (Bottom Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-4 z-50">
        {[
          { id: 'arena', Icon: LayoutGrid },
          { id: 'analysis', Icon: BarChart3 },
          { id: 'history', Icon: History },
          { id: 'settings', Icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-violet text-white' : 'text-slate-500'}`}
          >
            <item.Icon size={24} />
          </button>
        ))}
      </div>
    </div>
  );
}
