import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Lock, RotateCcw } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60000;

type AuthStage = 'LANDING' | 'LOGIN' | 'SETUP' | 'RECOVERY';

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [stage, setStage] = useState<AuthStage>('LANDING');
  const [pin, setPin] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  const [tempPin, setTempPin] = useState('');
  const [securityName, setSecurityName] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);

  // Load stored credentials
  const storedPin = localStorage.getItem('llm_lab_pin') || '927426';
  const storedName = localStorage.getItem('llm_lab_security_name');

  const handleStart = () => {
    onStart();
  };

  const handlePinChange = (value: string) => {
    if (lockoutUntil) return;
    if (value.length > 6) return;

    setPin(value);
    setIsError(false);

    if (value.length === 6) {
      if (value === storedPin) {
        onStart();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setIsError(true);
        setPin('');

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION);
        }
      }
    }
  };

  const finalizeSetup = () => {
    if (tempPin.length === 6 && securityName.trim()) {
      localStorage.setItem('llm_lab_pin', tempPin);
      localStorage.setItem('llm_lab_security_name', securityName.trim());
      onStart();
    }
  };

  const handleRecovery = () => {
    if (recoveryInput.trim().toLowerCase() === storedName?.toLowerCase()) {
      setStage('SETUP');
      setSetupStep(1);
      setRecoveryInput('');
      setAttempts(0);
      setLockoutUntil(null);
    } else {
      setIsError(true);
    }
  };

  // Motion values for cursor tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for the cursor follower
  const springConfig = { damping: 25, stiffness: 150 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (lockoutUntil) {
      const remaining = lockoutUntil - Date.now();
      if (remaining <= 0) {
        setLockoutUntil(null);
        setAttempts(0);
      } else {
        const timer = setTimeout(() => {
          setLockoutUntil(null);
          setAttempts(0);
        }, remaining);
        return () => clearTimeout(timer);
      }
    }
  }, [lockoutUntil]);

  const isLocked = lockoutUntil !== null && lockoutUntil > Date.now();

  return (
    <div className="relative h-screen w-full bg-[#0a0a0a] overflow-hidden flex flex-col items-center justify-center font-sans select-none">
      {/* Dynamic Cursor Effect (Antigravity Style) */}
      <motion.div
        className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-40"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.25) 0%, rgba(0, 229, 255, 0.1) 40%, rgba(79, 70, 229, 0) 70%)',
        }}
      />

      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%270%200%20200%20200%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27%20opacity=%271%27/%3E%3C/svg%3E')] opacity-20 pointer-events-none mix-blend-overlay"></div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.15,
              delayChildren: 0.3
            }
          }
        }}
        className="relative z-10 flex flex-col items-center"
      >
        <AnimatePresence mode="wait">
          {stage === 'LANDING' && (
            <motion.div
              key="landing"
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center space-y-12"
            >
              <div className="flex flex-col items-center space-y-4">
                <motion.div
                  variants={{
                    hidden: { scale: 0.8, opacity: 0, y: 10 },
                    visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
                  }}
                  className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl mb-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
                >
                  <Sparkles className="text-white/80" size={32} />
                </motion.div>

                <motion.h1
                  variants={{
                    hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
                    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } }
                  }}
                  className="text-7xl font-black text-white tracking-tighter sm:text-8xl text-center"
                >
                  LLM <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">LAB</span>
                </motion.h1>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } }
                  }}
                  className="text-slate-500 font-medium tracking-[0.3em] uppercase text-xs"
                >
                  Advanced Model Synthesis Engine
                </motion.p>
              </div>

              <motion.button
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
                }}
                onClick={handleStart}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Enter Application
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </motion.button>
            </motion.div>
          )}

          {stage === 'SETUP' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="flex flex-col items-center space-y-8 max-w-sm w-full"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center backdrop-blur-xl mb-2">
                  <Lock className="text-indigo-400" size={24} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">System Initialization</h2>
                <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase text-center">
                  {setupStep === 1 ? 'Configure Access Protocol' : 'Identity Verification Secret'}
                </p>
              </div>

              {setupStep === 1 ? (
                <div className="w-full space-y-6">
                  <div className="flex justify-center gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-12 h-14 rounded-2xl border transition-all flex items-center justify-center text-xl font-mono font-bold
                          ${tempPin.length > i ? 'text-white border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 bg-white/5'}
                        `}
                      >
                        {tempPin[i] ? '•' : ''}
                      </div>
                    ))}
                  </div>
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    value={tempPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 6) setTempPin(val);
                      if (val.length === 6) setSetupStep(2);
                    }}
                    className="sr-only"
                  />
                  <p className="text-[9px] text-slate-600 text-center uppercase tracking-widest font-black italic">Set 6-digit Master PIN</p>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  <input
                    autoFocus
                    placeholder="Enter Security Name"
                    value={securityName}
                    onChange={(e) => setSecurityName(e.target.value)}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold placeholder:text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all text-center uppercase tracking-widest"
                  />
                  <button
                    disabled={!securityName.trim()}
                    onClick={finalizeSetup}
                    className="w-full h-14 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Authorize Credentials
                  </button>
                  <button onClick={() => setSetupStep(1)} className="w-full text-[9px] text-slate-600 uppercase tracking-widest font-black">Back to PIN</button>
                </div>
              )}
            </motion.div>
          )}

          {stage === 'LOGIN' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="flex flex-col items-center space-y-8 max-w-sm w-full"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl mb-2">
                  {isLocked ? <RotateCcw className="text-red-400 animate-spin-slow" size={24} /> : <Lock className="text-indigo-400" size={24} />}
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Identity Verification</h2>
                <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase text-center">
                  {isLocked
                    ? `System lockdown. Try again in 60s`
                    : `Enter Access Protocol`}
                </p>
              </div>

              <div className="w-full space-y-6">
                <motion.div
                  className="flex justify-center gap-3"
                  animate={isError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-12 h-14 rounded-2xl border transition-all flex items-center justify-center text-xl font-mono font-bold
                        ${isError ? 'border-red-500/80 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 bg-white/5'}
                        ${pin.length > i ? 'text-white' : 'text-transparent'}
                        ${pin.length === i && !isError && !isLocked ? 'border-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.2)]' : ''}
                      `}
                    >
                      {pin[i] ? '•' : ''}
                    </div>
                  ))}
                </motion.div>

                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value.replace(/[^0-9]/g, ''))}
                  className="sr-only"
                  disabled={isLocked}
                />

                <div className="flex flex-col items-center gap-4">
                  {isError && !isLocked && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-[10px] font-bold uppercase tracking-widest"
                    >
                      Access Denied. {MAX_ATTEMPTS - attempts} attempts remaining.
                    </motion.span>
                  )}

                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setStage('LANDING')}
                      className="text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors outline-none"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setStage('RECOVERY')}
                      className="text-indigo-400/60 hover:text-indigo-400 text-[10px] font-bold uppercase tracking-widest transition-colors outline-none"
                    >
                      Emergency Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'RECOVERY' && (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="flex flex-col items-center space-y-8 max-w-sm w-full"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center backdrop-blur-xl mb-2">
                  <RotateCcw className="text-orange-400" size={24} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Emergency Reset</h2>
                <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase text-center">
                  Verification Required
                </p>
              </div>

              <div className="w-full space-y-4">
                <input
                  autoFocus
                  placeholder="Enter Security Name"
                  value={recoveryInput}
                  onChange={(e) => {
                    setRecoveryInput(e.target.value);
                    setIsError(false);
                  }}
                  className={`w-full h-14 bg-white/5 border rounded-2xl px-6 text-white text-sm font-bold placeholder:text-slate-700 outline-none transition-all text-center uppercase tracking-widest
                    ${isError ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/10 focus:ring-indigo-500/30'}
                  `}
                />

                {isError && (
                  <p className="text-red-400 text-[9px] text-center font-black uppercase tracking-widest">Identity Denied</p>
                )}

                <button
                  onClick={handleRecovery}
                  className="w-full h-14 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Verify Identity
                </button>
                <button onClick={() => setStage('LOGIN')} className="w-full text-[9px] text-slate-600 uppercase tracking-widest font-black">Cancel Reset</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Decorative corners */}
      <div className="absolute top-12 left-12 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Protocol 2.4.0</span>
      </div>

      <div className="absolute bottom-12 right-12">
        <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">© 2026 Neural Synthesis Corp</span>
      </div>
    </div>
  );
};

