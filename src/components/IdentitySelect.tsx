import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogoMark } from './LogoMark';
import { ProfessionalLogo } from '../types';
import { Sparkles, Shield, Lock, RotateCcw, ArrowRight, Star } from 'lucide-react';

interface IdentitySelectProps {
  person1: { id: 'person_1'; name: string; username: string; logo: ProfessionalLogo; isLocked?: boolean; bio?: string };
  person2: { id: 'person_2'; name: string; username: string; logo: ProfessionalLogo; isLocked?: boolean; bio?: string };
  worldTitle?: string;
  worldSubtitle?: string;
  onSelect: (userId: 'person_1' | 'person_2') => void;
  onOpenAdmin: () => void;
  onReplayIntro: () => void;
  onHoverRealm?: (side: 'left' | 'right' | null) => void;
}

export const IdentitySelect: React.FC<IdentitySelectProps> = ({
  person1,
  person2,
  worldTitle = 'SYNAX',
  worldSubtitle = 'Where Two Worlds Meet.',
  onSelect,
  onOpenAdmin,
  onReplayIntro,
  onHoverRealm,
}) => {
  const [hoveredUser, setHoveredUser] = useState<'person_1' | 'person_2' | null>(null);

  const handleMouseEnter = (user: 'person_1' | 'person_2') => {
    setHoveredUser(user);
    if (onHoverRealm) onHoverRealm(user === 'person_1' ? 'left' : 'right');
  };

  const handleMouseLeave = () => {
    setHoveredUser(null);
    if (onHoverRealm) onHoverRealm(null);
  };

  return (
    <motion.div
      id="identity-select-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full h-[100dvh] min-h-screen md:h-auto flex flex-col justify-between p-4 sm:p-8 md:p-12 select-none overflow-x-hidden overflow-y-auto md:overflow-y-visible overscroll-contain [-webkit-overflow-scrolling:touch]"
    >
      {/* 1. Top Utility Header (Replay Intro & System Control) */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-30 pt-2">
        <button
          id="replay-intro-btn"
          type="button"
          onClick={onReplayIntro}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all backdrop-blur-md shadow-sm"
          title="Replay cinematic prologue"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
          <span>Prologue</span>
        </button>

        {/* Discreet Center Brand Mark */}
        <div className="hidden sm:flex items-center gap-2 text-indigo-300/60 font-mono text-[11px] tracking-[0.3em] uppercase">
          <Star className="w-3 h-3 text-indigo-400 fill-indigo-400" />
          <span>Private Sanctuary</span>
          <Star className="w-3 h-3 text-indigo-400 fill-indigo-400" />
        </div>

        <button
          id="admin-portal-link-btn"
          type="button"
          onClick={onOpenAdmin}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-slate-400 hover:text-indigo-200 bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800/80 hover:border-indigo-500/40 transition-all backdrop-blur-md"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>System Control</span>
        </button>
      </header>

      {/* 2. Main Stage Composition */}
      <main className="w-full max-w-6xl mx-auto my-auto py-6 flex flex-col items-center">
        {/* Top Branding Section */}
        <div className="text-center space-y-2 mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/60 border border-indigo-500/20 text-indigo-200/90 text-[11px] tracking-anime-wide uppercase font-sans-celestial font-light backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Two Chosen Identities</span>
            <Sparkles className="w-3 h-3 text-indigo-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-anime-title uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-50 to-indigo-300 font-cinzel text-shadow-cinematic"
          >
            {worldTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="text-sm sm:text-base md:text-lg text-slate-300/90 tracking-anime-tagline uppercase font-sans-celestial font-light text-shadow-subtle"
          >
            {worldSubtitle}
          </motion.p>
        </div>

        {/* Split-Stage Realms Container */}
        <div className="relative w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-stretch max-w-5xl">
          {/* CENTRAL CONNECTING CONSTELLATION THREAD & NEXUS (Desktop) */}
          <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-20">
            {/* Horizontal glowing starlight bridge */}
            <div
              className={`w-full max-w-[280px] h-0.5 transition-all duration-700 ${
                hoveredUser === 'person_1'
                  ? 'bg-gradient-to-r from-indigo-500 to-transparent shadow-[0_0_15px_#6366f1]'
                  : hoveredUser === 'person_2'
                  ? 'bg-gradient-to-l from-pink-500 to-transparent shadow-[0_0_15px_#ec4899]'
                  : 'bg-gradient-to-r from-indigo-500/40 via-purple-400/40 to-pink-500/40'
              }`}
            />
            {/* Center Nexus Pill */}
            <div className="absolute px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-slate-700/80 shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>Sanctuary Nexus</span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* REALM 1: PERSON 1 (LEFT SIDE) */}
          {/* ==================================================== */}
          <motion.button
            id="select-person-1-realm"
            type="button"
            disabled={person1.isLocked}
            onClick={() => onSelect('person_1')}
            onMouseEnter={() => handleMouseEnter('person_1')}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            whileHover={person1.isLocked ? {} : { scale: 1.02 }}
            whileTap={person1.isLocked ? {} : { scale: 0.98 }}
            className={`group relative w-full text-left p-6 sm:p-8 md:p-10 rounded-[32px] transition-all duration-700 border backdrop-blur-xl flex flex-col justify-between overflow-hidden ${
              person1.isLocked
                ? 'opacity-60 cursor-not-allowed bg-slate-950/40 border-slate-800'
                : hoveredUser === 'person_1'
                ? 'bg-gradient-to-b from-indigo-950/50 via-slate-900/70 to-slate-950/90 border-indigo-500/80 shadow-[0_0_45px_rgba(99,102,241,0.35)]'
                : 'bg-gradient-to-b from-slate-900/40 via-slate-950/60 to-slate-950/80 border-slate-800/80 hover:border-indigo-500/50'
            }`}
          >
            {/* Ambient Background Aura */}
            <div
              className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 ${
                hoveredUser === 'person_1' ? 'opacity-50' : 'opacity-20'
              }`}
              style={{ background: person1.logo.accentColor || '#6366f1' }}
            />

            {/* Top Indicator */}
            <div className="flex items-center justify-between relative z-10 w-full mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-indigo-300">
                  Realm One
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500 group-hover:text-indigo-300 transition-colors">
                @{person1.username}
              </span>
            </div>

            {/* Central Professional Logo & Emblem */}
            <div className="relative z-10 flex flex-col items-center justify-center my-4 py-3">
              <div className="transition-transform duration-700 group-hover:scale-110">
                <LogoMark
                  logo={person1.logo}
                  size="xl"
                  glow={hoveredUser === 'person_1'}
                  animate={hoveredUser === 'person_1'}
                />
              </div>

              {/* Logo Name */}
              <p className="text-xs font-mono text-indigo-300/70 uppercase tracking-widest mt-4">
                {person1.logo.name}
              </p>
            </div>

            {/* Person Name & Bio */}
            <div className="relative z-10 text-center space-y-2 mt-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-anime-header text-white font-cinzel text-shadow-anime-glow group-hover:text-indigo-100 transition-colors">
                {person1.name}
              </h2>
              {person1.bio && (
                <p className="text-xs text-slate-400 line-clamp-1 italic font-sans-celestial font-light">
                  "{person1.bio}"
                </p>
              )}
            </div>

            {/* Enter Call-to-action Button / Lock Status */}
            <div className="relative z-10 mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              {person1.isLocked ? (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-medium">
                  <Lock className="w-4 h-4" />
                  <span>Access restricted by Admin</span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-medium tracking-anime-pill uppercase font-sans-celestial text-slate-300 group-hover:text-white transition-colors">
                    Enter as {person1.name.split(' ')[0]}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </>
              )}
            </div>
          </motion.button>

          {/* ==================================================== */}
          {/* REALM 2: PERSON 2 (RIGHT SIDE) */}
          {/* ==================================================== */}
          <motion.button
            id="select-person-2-realm"
            type="button"
            disabled={person2.isLocked}
            onClick={() => onSelect('person_2')}
            onMouseEnter={() => handleMouseEnter('person_2')}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            whileHover={person2.isLocked ? {} : { scale: 1.02 }}
            whileTap={person2.isLocked ? {} : { scale: 0.98 }}
            className={`group relative w-full text-left p-6 sm:p-8 md:p-10 rounded-[32px] transition-all duration-700 border backdrop-blur-xl flex flex-col justify-between overflow-hidden ${
              person2.isLocked
                ? 'opacity-60 cursor-not-allowed bg-slate-950/40 border-slate-800'
                : hoveredUser === 'person_2'
                ? 'bg-gradient-to-b from-pink-950/50 via-slate-900/70 to-slate-950/90 border-pink-500/80 shadow-[0_0_45px_rgba(236,72,153,0.35)]'
                : 'bg-gradient-to-b from-slate-900/40 via-slate-950/60 to-slate-950/80 border-slate-800/80 hover:border-pink-500/50'
            }`}
          >
            {/* Ambient Background Aura */}
            <div
              className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 ${
                hoveredUser === 'person_2' ? 'opacity-50' : 'opacity-20'
              }`}
              style={{ background: person2.logo.accentColor || '#ec4899' }}
            />

            {/* Top Indicator */}
            <div className="flex items-center justify-between relative z-10 w-full mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-pink-300">
                  Realm Two
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500 group-hover:text-pink-300 transition-colors">
                @{person2.username}
              </span>
            </div>

            {/* Central Professional Logo & Emblem */}
            <div className="relative z-10 flex flex-col items-center justify-center my-4 py-3">
              <div className="transition-transform duration-700 group-hover:scale-110">
                <LogoMark
                  logo={person2.logo}
                  size="xl"
                  glow={hoveredUser === 'person_2'}
                  animate={hoveredUser === 'person_2'}
                />
              </div>

              {/* Logo Name */}
              <p className="text-xs font-mono text-pink-300/70 uppercase tracking-widest mt-4">
                {person2.logo.name}
              </p>
            </div>

            {/* Person Name & Bio */}
            <div className="relative z-10 text-center space-y-2 mt-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-anime-header text-white font-cinzel text-shadow-anime-rose group-hover:text-pink-100 transition-colors">
                {person2.name}
              </h2>
              {person2.bio && (
                <p className="text-xs text-slate-400 line-clamp-1 italic font-sans-celestial font-light">
                  "{person2.bio}"
                </p>
              )}
            </div>

            {/* Enter Call-to-action Button / Lock Status */}
            <div className="relative z-10 mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              {person2.isLocked ? (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-medium">
                  <Lock className="w-4 h-4" />
                  <span>Access restricted by Admin</span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-medium tracking-anime-pill uppercase font-sans-celestial text-slate-300 group-hover:text-white transition-colors">
                    Enter as {person2.name.split(' ')[0]}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-pink-600/30 border border-pink-500/50 flex items-center justify-center text-pink-200 group-hover:bg-pink-600 group-hover:text-white transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </>
              )}
            </div>
          </motion.button>
        </div>
      </main>

      {/* 3. Bottom Atmospheric Micro-Footnote */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-center text-center z-20 pb-2">
        <p className="text-[11px] font-mono text-slate-500 tracking-wider">
          An exclusive sanctuary for two kindred minds · End-to-end private & authoritative
        </p>
      </footer>
    </motion.div>
  );
};
