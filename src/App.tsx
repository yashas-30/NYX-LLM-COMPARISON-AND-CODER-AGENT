import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { CompareDashboard } from './components/CompareDashboard';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Layers } from 'lucide-react';


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-50"
          >
            <LandingPage onStart={() => setIsAuthenticated(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-1 h-screen overflow-hidden"
          >
            <CompareDashboard onExit={() => setIsAuthenticated(false)} />
          </motion.div>
        )}
      </AnimatePresence>


      
      <Toaster 
        position="top-right" 
        theme="dark" 
        expand={false} 
        richColors 
        closeButton
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 20, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }
        }}
      />
    </div>
  );
}
