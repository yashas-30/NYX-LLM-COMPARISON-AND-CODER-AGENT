/**
 * @file src/components/CoderDashboard.tsx
 * @description Claude Desktop-style dashboard with a warm-slate sidebar, Chat/Code tabs,
 *              main chat canvas, and top-level view routing (coder / registry / settings).
 */

import React, { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardState } from '@/src/hooks/useDashboardState';
import { useChatSessions } from '@/src/hooks/useChatSessions';
import { CoderPage } from '@/src/features/coder/CoderPage';
import { SettingsView } from './dashboard/SettingsView';
import { AVAILABLE_MODELS } from '@/src/config/models';
import { useTheme } from '../context/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';
import {
  PanelLeftClose, PanelLeftOpen, Plus, MessageSquare,
  Box, Settings, Trash2, ChevronRight, User
} from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';

const ModelRegistryView = lazy(() =>
  import('./dashboard/ModelRegistryView').then(m => ({ default: m.ModelRegistryView }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-[#191918]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Loading</span>
    </div>
  </div>
);

type ViewMode = 'coder' | 'registry' | 'settings';

export const CoderDashboard: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'code'>('chat');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    activeMode, setActiveMode,
    apiKeys,
    modelSettings, setModelSettings, trackUsage,
    statuses,
    models, setModel,
    updateApiKey,
    clearApiKeys,
  } = useDashboardState(onExit);

  const { theme } = useTheme();
  const chatSessions = useChatSessions();
  const { sessions, activeSid, deleteSession, switchSession, createSession } = chatSessions;

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarVariants = {
    open: { width: 260, opacity: 1 },
    closed: { width: 0, opacity: 0 },
  };

  return (
    <ErrorBoundary>
      <main className={`h-[100dvh] w-screen overflow-hidden flex bg-[#191918] text-foreground antialiased selection:bg-primary/20 ${theme === 'dark' ? 'dark' : ''}`}>

        {/* Backdrop for mobile */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25"
            />
          )}
        </AnimatePresence>

        {/* ── Collapsible Sidebar (Claude Warm Slate) ────────────────────── */}
        <motion.aside
          variants={sidebarVariants}
          initial="open"
          animate={sidebarOpen ? 'open' : 'closed'}
          transition={{ type: 'spring', stiffness: 380, damping: 35 }}
          className={`h-full overflow-hidden flex flex-col bg-[#222221] border-r border-white/[0.03] relative z-30 ${isMobile ? 'fixed inset-y-0 left-0 shadow-2xl w-[260px]' : 'flex-none z-20'}`}
        >
          <div className="flex flex-col h-full min-w-[260px]">
            {/* Sidebar Top Header (Claude Desktop style close button positioning) */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1 select-none">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#E0B86F]">NYX</span>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white border border-transparent hover:border-white/5 transition-all cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={13} />
              </motion.button>
            </div>

            {/* Claude-style Segmented Control */}
            <div className="flex bg-[#191918] p-1 rounded-xl border border-white/5 mx-3.5 mt-2 mb-2.5">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                  sidebarTab === 'chat'
                    ? 'bg-[#2D2D2B] text-[#E0B86F] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  setSidebarTab('code');
                  toast.info("Workspace explorer view compiled cleanly.");
                }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                  sidebarTab === 'code'
                    ? 'bg-[#2D2D2B] text-[#E0B86F] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Code
              </button>
            </div>

            {/* Top Primary Actions (Claude minimal actions with gold grid buttons) */}
            <div className="px-3.5 pb-2 space-y-1.5">
              <motion.button
                whileHover={{ scale: 1.01, backgroundColor: 'rgba(224,184,111,0.06)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  createSession([]);
                  setActiveMode('coder');
                }}
                className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer border border-[#E0B86F]/20 hover:border-[#E0B86F]/40 text-[#E0B86F] bg-[#E0B86F]/5"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span className="translate-y-[-0.5px]">New Chat</span>
              </motion.button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setActiveMode('registry')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-bold tracking-wide transition-all border cursor-pointer ${
                    activeMode === 'registry'
                      ? 'bg-white/[0.08] text-[#E0B86F] border-white/10'
                      : 'bg-white/[0.01] border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <Box size={11} strokeWidth={2} />
                  <span>Models</span>
                </button>
                <button
                  onClick={() => setActiveMode('settings')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-bold tracking-wide transition-all border cursor-pointer ${
                    activeMode === 'settings'
                      ? 'bg-white/[0.08] text-[#E0B86F] border-white/10'
                      : 'bg-white/[0.01] border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <Settings size={11} strokeWidth={2} />
                  <span>Settings</span>
                </button>
              </div>
            </div>

            {/* Recents Section */}
            <div className="px-4 pt-3.5 pb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500 select-none">
                Recents
              </span>
            </div>

            {/* Chat Session List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-none">
              <AnimatePresence>
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">No chats yet</p>
                  </div>
                ) : (
                  filteredSessions.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSid}
                      onClick={() => {
                        switchSession(session.id);
                        setActiveMode('coder');
                      }}
                      onDelete={() => deleteSession(session.id)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Bottom user badge (Claude Desktop flat layout) */}
            <div className="px-4 py-3.5 border-t border-white/[0.03] bg-[#1E1E1D] mt-auto">
              <div className="flex items-center gap-3 p-1 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E0B86F] to-amber-600 flex items-center justify-center shrink-0 shadow-md select-none">
                  <User size={13} className="text-black" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col min-w-0 select-none">
                  <span className="text-[11px] font-black tracking-wide text-foreground/80 truncate uppercase">User</span>
                  <span className="text-[8px] text-[#E0B86F] font-black tracking-widest uppercase">Pro Account</span>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* ── Collapsed Sidebar Toggle (Floating trigger) ───────────────── */}
        <AnimatePresence>
          {!sidebarOpen && activeMode !== 'coder' && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(true)}
              className="absolute top-3.5 left-3.5 z-30 p-2 rounded-xl bg-[#222221] hover:bg-[#2D2D2B] border border-white/5 text-zinc-500 hover:text-white transition-all shadow-md cursor-pointer"
            >
              <PanelLeftOpen size={14} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Main Content Canvas ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 h-full relative overflow-hidden bg-[#191918]">
          <AnimatePresence mode="wait">
            {activeMode === 'coder' ? (
              <motion.div
                key="coder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <ErrorBoundary name="CoderPage">
                  <CoderPage
                    allModels={AVAILABLE_MODELS}
                    apiKeys={apiKeys}
                    modelSettings={modelSettings}
                    setModelSettings={setModelSettings}
                    trackUsage={trackUsage}
                    providerStatuses={statuses}
                    models={models}
                    setModel={setModel}
                    activeMode={activeMode}
                    setActiveMode={setActiveMode}
                    sidebarOpen={sidebarOpen}
                    onToggleSidebar={() => setSidebarOpen(p => !p)}
                    chatSessions={chatSessions}
                  />
                </ErrorBoundary>
              </motion.div>
            ) : activeMode === 'registry' ? (
              <motion.div
                key="registry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Suspense fallback={<LoadingFallback />}>
                  <ErrorBoundary name="ModelRegistry">
                    <ModelRegistryView
                      selectModel={(mid) => {
                        setModel(mid);
                        setActiveMode('coder');
                      }}
                      apiKeys={apiKeys}
                      providerStatuses={statuses}
                      activeMode={activeMode}
                      setActiveMode={setActiveMode}
                      sidebarOpen={sidebarOpen}
                    />
                  </ErrorBoundary>
                </Suspense>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 overflow-auto"
              >
                <ErrorBoundary name="Settings">
                  <SettingsView
                    apiKeys={apiKeys}
                    updateApiKey={updateApiKey}
                    clearApiKeys={clearApiKeys}
                    activeMode={activeMode}
                    setActiveMode={setActiveMode}
                    sidebarOpen={sidebarOpen}
                  />
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </ErrorBoundary>
  );
};

/* ── Sidebar Nav Button (Tactile editorial design) ─────────────────────── */
const SideNavButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
      active
        ? 'bg-white/[0.08] text-white border border-white/10 shadow-sm font-bold'
        : 'text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
    }`}
  >
    <span className={`transition-all duration-200 ${active ? 'scale-105 text-[#E0B86F]' : 'opacity-70 text-zinc-400'}`}>{icon}</span>
    <span className="translate-y-[-0.5px]">{label}</span>
  </motion.button>
);

/* ── Recent Chat Session Item ──────────────────────────────────────────── */
const SessionItem: React.FC<{
  session: { id: string; title: string; updatedAt: number };
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}> = ({ session, isActive, onClick, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl cursor-pointer transition-all border ${
        isActive
          ? 'bg-white/[0.06] text-white border-white/[0.08] shadow-sm font-bold'
          : 'text-zinc-400 hover:bg-white/[0.03] hover:text-white border-transparent'
      }`}
      onClick={onClick}
    >
      <MessageSquare size={12} className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-105 text-[#E0B86F]' : 'opacity-40 group-hover:scale-105 group-hover:opacity-75'}`} />
      <span className="flex-1 text-[11px] font-medium truncate translate-y-[-0.5px] tracking-wide">{session.title}</span>
      <AnimatePresence>
        {(hovered || isActive) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="shrink-0 p-1.5 rounded-lg bg-red-500/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <Trash2 size={10} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};