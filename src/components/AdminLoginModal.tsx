import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, EyeOff, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { ApiService } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    try {
      await ApiService.adminLogin(password);
      setPassword('');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid administrator master key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl select-none"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-indigo-500/30 p-6 sm:p-8 shadow-[0_0_60px_rgba(99,102,241,0.2)] overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.3)] mb-4">
            <Shield className="w-6 h-6" />
          </div>

          <h3 className="text-xl font-bold text-white font-cinzel tracking-anime-header text-shadow-anime-glow">
            Admin Master Sanctuary
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans-celestial tracking-wider font-light">
            Protected System Control & Time Authority
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase tracking-wider text-slate-300 font-medium">
                Master Admin Key
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Default: synax-admin-777</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>

              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3 px-4 rounded-xl font-semibold tracking-wider uppercase text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>Access Master Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};
