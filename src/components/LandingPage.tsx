import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../lib/design-system/icons';
import { WebGLShader } from './landing/WebGLShader';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-transparent flex flex-col items-center justify-center font-sans antialiased selection:bg-primary/20">
      {/* WebGL Shader Background */}
      <div className="fixed inset-0 z-0">
        <WebGLShader />
      </div>
      
      {/* Content wrapper with proper z-index */}
      <div className="relative z-10 flex flex-col items-center gap-12 text-center px-6">
        {/* Logo Container with animations */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              boxShadow: [
                "0 0 40px 0px rgba(var(--primary-rgb), 0.1)",
                "0 0 60px 10px rgba(var(--primary-rgb), 0.3)",
                "0 0 40px 0px rgba(var(--primary-rgb), 0.1)"
              ]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              repeatType: "reverse", 
              ease: "easeInOut" 
            }}
            className="w-32 h-32 rounded-[64px] bg-card/25 border border-border-strong flex items-center justify-center shadow-2xl relative z-10 backdrop-blur-md"
          >
            <Logo size={80} className="text-primary" />
          </motion.div>
          
          {/* Subtle Outer Glow Layer */}
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1.1, 1.25, 1.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
          />
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
        >
          <button
            onClick={onStart}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="group relative px-10 py-5 bg-background/40 hover:bg-primary border border-primary/30 hover:border-primary text-foreground hover:text-white rounded-full overflow-hidden transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(var(--primary-rgb),0.4)] active:scale-98 backdrop-blur-md"
          >
            <span className="relative z-10 flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em]">
              get start with NYX
              <motion.div animate={isHovering ? { x: 4 } : { x: 0 }}>
                <ArrowRight size={16} strokeWidth={3.5} />
              </motion.div>
            </span>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </motion.div>
      </div>
    </main>
  );
};



