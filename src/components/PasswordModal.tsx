import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogoMark } from './LogoMark';
import { ProfessionalLogo } from '../types';
import { Eye, EyeOff, Lock, ArrowLeft, ArrowRight, AlertCircle, Loader2, KeyRound } from 'lucide-react';

interface PasswordModalProps {
  userId: 'person_1' | 'person_2';
  name: string;
  username: string;
  logo: ProfessionalLogo;
  onSubmit: (password: string) => Promise<void>;
  onBack: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  userId,
  name,
  username,
  logo,
  onSubmit,
  onBack,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accentColor = logo.accentColor || (userId === 'person_1' ? '#6366f1' : '#ec4899');
  const glowColor = logo.glowColor || (userId === 'person_1' ? 'rgba(99, 102, 241, 0.5)' : 'rgba(236, 72, 153, 0.5)');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    try {
      await onSubmit(password);
    } catch (err: any) {
      setError(err.message || 'The private key entered does not match this sanctuary identity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      id="password-auth-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full min-h-screen flex items-center justify-center p-4 sm:p-6 select-none"
    >
      {/* Immersive Portal Card Container */}
      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-[32px] bg-slate-950/80 border border-slate-800/90 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden">
        {/* Luminous Realm Gradient Aura */}
        <div
          className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-30 pointer-events-none"
          style={{ background: accentColor }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none"
          style={{ background: accentColor }}
        />

        {/* Back / Realm Switch Button */}
        <div className="relative z-10 flex items-center justify-between mb-8">
          <button
            id="back-to-identities-btn"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Switch Identity</span>
          </button>

          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
            SYNAX AUTH
          </span>
        </div>

        {/* Persona Professional Logo Mark */}
        <div className="relative z-10 flex flex-col items-center justify-center mb-6">
          <div className="transition-transform duration-500 hover:scale-105">
            <LogoMark logo={logo} size="lg" glow={true} animate={true} />
          </div>
        </div>

        {/* Welcome Back Typography */}
        <div className="relative z-10 text-center space-y-1.5 mb-8">
          <p className="text-xs uppercase tracking-anime-wide font-sans-celestial text-indigo-300/85 font-light text-shadow-subtle">
            Welcome back,
          </p>
          <h2
            className={`text-2xl sm:text-3xl font-bold tracking-anime-header text-white font-cinzel ${
              userId === 'person_1' ? 'text-shadow-anime-glow' : 'text-shadow-anime-rose'
            }`}
          >
            {name}
          </h2>
          <p className="text-xs text-slate-400 font-sans-celestial tracking-wider">
            @{username}
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="auth-private-key-input"
              className="text-xs font-medium uppercase tracking-wider text-slate-300 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Enter your private key</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Default: synax123
              </span>
            </label>

            <div className="relative">
              <input
                id="auth-private-key-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-all font-mono text-sm tracking-widest"
                style={{
                  boxShadow: `inset 0 2px 4px rgba(0,0,0,0.5)`,
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit Action: ENTER SYNAX */}
          <button
            id="enter-synax-submit-btn"
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-4 rounded-2xl text-xs font-semibold tracking-[0.2em] uppercase text-white shadow-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, #4338ca)`,
              boxShadow: `0 0 30px ${glowColor}`,
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>ENTER SYNAX</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[10px] font-mono text-slate-500 tracking-wider flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>Encrypted Session · Verified Identity</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
