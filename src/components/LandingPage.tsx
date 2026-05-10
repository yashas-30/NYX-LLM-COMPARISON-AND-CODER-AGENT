import React, { useState } from 'react';
import { motion, Variants } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [isHovering, setIsHovering] = useState(false);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.04
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0, y: 10 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  const subTextVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <div className="relative h-screen w-full bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center font-sans select-none">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20200%20200%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27%20opacity=%271%27/%3E%3C/svg%3E')] opacity-10 pointer-events-none mix-blend-overlay"></div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 flex flex-col items-center"
        style={{ willChange: 'transform, opacity', translateZ: 0 }}
      >
        <div className="flex flex-col items-center space-y-8">
          <div className="flex flex-col items-center space-y-4">


            <motion.h1
              variants={textVariants}
              className="text-6xl font-black text-white tracking-tighter sm:text-7xl text-center"
            >
              LLM <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">LAB</span>
            </motion.h1>

            <motion.p
              variants={subTextVariants}
              className="text-slate-500 font-medium tracking-[0.3em] uppercase text-xs"
            >
              Advanced Model Synthesis Engine
            </motion.p>
          </div>

          <motion.button
            variants={buttonVariants}
            onClick={onStart}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-sm rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-all"
          >
            <span className="relative z-10 flex items-center gap-3">
              START
              <motion.div animate={isHovering ? { x: 4 } : { x: 0 }} transition={{ duration: 0.15 }}>
                <ArrowRight size={16} />
              </motion.div>
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovering ? 0.1 : 0 }}
              transition={{ duration: 0.15 }}
            />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
