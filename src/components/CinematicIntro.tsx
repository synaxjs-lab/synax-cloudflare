import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogoMark } from './LogoMark';
import { ProfessionalLogo } from '../types';
import { SoundEffects } from '../services/sound';
import { FastForward, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface CinematicIntroProps {
  person1: { name: string; logo: ProfessionalLogo };
  person2: { name: string; logo: ProfessionalLogo };
  worldTitle?: string;
  worldSubtitle?: string;
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({
  person1,
  person2,
  worldTitle = 'SYNAX',
  worldSubtitle = 'Where Two Worlds Meet.',
  onComplete,
}) => {
  // Step in the cinematic story:
  // 0: Deep night darkness & ambient stars
  // 1: Person 1 Logo emerges on left
  // 2: Person 1 Name revealed elegantly
  // 3: Person 2 Logo emerges on right
  // 4: Person 2 Name revealed
  // 5: Both visual identities slowly glide toward center
  // 6: Subtle glowing connection forms between them
  // 7: SYNAX title and tagline emerge in center
  // 8: Smooth fade into identity selection
  const [step, setStep] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    // Respect reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    const t1 = setTimeout(() => {
      setStep(1);
      if (soundEnabled) SoundEffects.playAtmosphereChime();
    }, 1200);

    const t2 = setTimeout(() => {
      setStep(2);
    }, 2400);

    const t3 = setTimeout(() => {
      setStep(3);
      if (soundEnabled) SoundEffects.playAtmosphereChime();
    }, 3800);

    const t4 = setTimeout(() => {
      setStep(4);
    }, 5000);

    const t5 = setTimeout(() => {
      setStep(5);
    }, 6400);

    const t6 = setTimeout(() => {
      setStep(6);
      if (soundEnabled) SoundEffects.playAtmosphereChime();
    }, 7600);

    const t7 = setTimeout(() => {
      setStep(7);
      if (soundEnabled) SoundEffects.playAtmosphereChime();
    }, 8800);

    const t8 = setTimeout(() => {
      setStep(8);
      setTimeout(onComplete, 900);
    }, 11400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
      clearTimeout(t8);
    };
  }, [onComplete, soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) SoundEffects.playAtmosphereChime();
  };

  return (
    <motion.div
      id="cinematic-intro-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: step === 8 ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#03050a] overflow-hidden px-4 select-none"
    >
      {/* 1. Cinematic Night Sky & Ambient Atmospheric Sweeps */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft moving ambient light sweep */}
        <motion.div
          animate={{
            x: ['-25%', '25%', '-25%'],
            y: ['-10%', '10%', '-10%'],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-900/30 via-purple-900/25 to-pink-900/20 blur-[140px]"
        />

        {/* Shinkai-style soft horizon twilight glow */}
        <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-indigo-950/40 via-purple-950/20 to-transparent" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(3,5,10,0.92)_100%)]" />
      </div>

      {/* 2. Top Controls: Sound & Skip Intro */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-40">
        <button
          id="intro-sound-toggle"
          type="button"
          onClick={toggleSound}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide bg-slate-900/70 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all backdrop-blur-md"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Audio Off'}</span>
        </button>

        <button
          id="skip-intro-btn"
          type="button"
          onClick={onComplete}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-slate-900/70 border border-indigo-500/40 text-indigo-200 hover:text-white hover:bg-indigo-600/40 hover:border-indigo-400/60 transition-all shadow-lg backdrop-blur-md group"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-indigo-300" />
        </button>
      </div>

      {/* 3. Central Stage Container */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center my-auto min-h-[520px]">
        {/* The Two Identities Facing Each Other */}
        <div className="relative w-full flex flex-col md:flex-row items-center justify-center gap-10 md:gap-32">
          {/* PERSON 1 (LEFT REALM) */}
          <div className="relative flex flex-col items-center">
            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  id="intro-person-1-logo"
                  initial={{ opacity: 0, scale: 0.5, x: -70, filter: 'blur(12px)' }}
                  animate={{
                    opacity: 1,
                    scale: step >= 5 ? 1.08 : 1,
                    x: step >= 5 ? 30 : 0,
                    filter: 'blur(0px)',
                  }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center relative"
                >
                  <div className="relative group">
                    <LogoMark logo={person1.logo} size="hero" glow={true} animate={true} />
                    {/* Ethereal aura pulse */}
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute -inset-4 rounded-full border border-indigo-400/30 pointer-events-none"
                    />
                  </div>

                  {/* Name Reveal */}
                  <AnimatePresence>
                    {step >= 2 && (
                      <motion.div
                        id="intro-person-1-name"
                        initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.9, delay: 0.2 }}
                        className="text-center mt-4"
                      >
                        <h2 className="text-xl md:text-2xl font-bold tracking-anime-header text-white font-cinzel text-shadow-anime-glow">
                          {person1.name}
                        </h2>
                        <p className="text-[11px] uppercase tracking-anime-pill text-indigo-300/85 mt-1 font-sans-celestial font-light text-shadow-subtle">
                          Realm Mark I
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ETHEREAL CONNECTING CONSTELLATION BRIDGE (CENTER) */}
          <AnimatePresence>
            {step >= 6 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-center pointer-events-none"
              >
                {/* Horizontal glowing starlight beam */}
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="hidden md:block h-px bg-gradient-to-r from-indigo-400 via-white to-pink-400 shadow-[0_0_20px_#fff]"
                />

                {/* Central anime constellation nexus emblem */}
                <motion.div
                  animate={{
                    scale: [0.95, 1.2, 0.95],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-full border border-white/70 bg-gradient-to-tr from-indigo-600/40 via-purple-600/40 to-pink-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.7)] backdrop-blur-md"
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PERSON 2 (RIGHT REALM) */}
          <div className="relative flex flex-col items-center">
            <AnimatePresence>
              {step >= 3 && (
                <motion.div
                  id="intro-person-2-logo"
                  initial={{ opacity: 0, scale: 0.5, x: 70, filter: 'blur(12px)' }}
                  animate={{
                    opacity: 1,
                    scale: step >= 5 ? 1.08 : 1,
                    x: step >= 5 ? -30 : 0,
                    filter: 'blur(0px)',
                  }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center relative"
                >
                  <div className="relative group">
                    <LogoMark logo={person2.logo} size="hero" glow={true} animate={true} />
                    {/* Ethereal aura pulse */}
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute -inset-4 rounded-full border border-pink-400/30 pointer-events-none"
                    />
                  </div>

                  {/* Name Reveal */}
                  <AnimatePresence>
                    {step >= 4 && (
                      <motion.div
                        id="intro-person-2-name"
                        initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.9, delay: 0.2 }}
                        className="text-center mt-4"
                      >
                        <h2 className="text-xl md:text-2xl font-bold tracking-anime-header text-white font-cinzel text-shadow-anime-rose">
                          {person2.name}
                        </h2>
                        <p className="text-[11px] uppercase tracking-anime-pill text-pink-300/85 mt-1 font-sans-celestial font-light text-shadow-subtle">
                          Realm Mark II
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 4. STEP 7: PROMINENT "SYNAX" BRAND REVEAL & TAGLINE */}
        <div className="min-h-[140px] flex flex-col items-center justify-center mt-12 text-center px-4">
          <AnimatePresence>
            {step >= 7 && (
              <motion.div
                id="intro-title-block"
                initial={{ opacity: 0, y: 25, scale: 0.9, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-3"
              >
                {/* Japanese-style decorative bracket header */}
                <div className="flex items-center justify-center gap-3 text-indigo-300/80 text-xs tracking-anime-wide uppercase font-sans-celestial font-light text-shadow-subtle">
                  <span className="w-8 h-px bg-gradient-to-r from-transparent to-indigo-400" />
                  <span>Two Minds · One Sky</span>
                  <span className="w-8 h-px bg-gradient-to-l from-transparent to-indigo-400" />
                </div>

                {/* Dominant SYNAX Brand Header */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-anime-title uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-300 font-cinzel text-shadow-cinematic">
                  {worldTitle}
                </h1>

                {/* Tagline */}
                <p className="text-sm sm:text-base md:text-lg text-slate-200/90 tracking-anime-tagline uppercase font-sans-celestial font-light text-shadow-subtle">
                  {worldSubtitle}
                </p>

                {/* Luminous Divider */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 180 }}
                  transition={{ duration: 1.4, delay: 0.3 }}
                  className="h-0.5 mx-auto bg-gradient-to-r from-transparent via-white to-transparent mt-4 shadow-[0_0_10px_#fff]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 5. Minimal Cinematic Timeline Indicator at Bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-1 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/80">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 11.4, ease: 'linear' }}
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        />
      </div>
    </motion.div>
  );
};
