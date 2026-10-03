import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TimeStatus } from '../types';
import { ServerClock } from '../services/clock';
import { Clock, AlertTriangle, Lock, Hourglass } from 'lucide-react';

interface TimeBannerProps {
  timeStatus: TimeStatus | null;
  onTimeExpired?: () => void;
}

export const TimeBanner: React.FC<TimeBannerProps> = ({ timeStatus }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(timeStatus?.remainingSeconds || 3600);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!timeStatus) return;
    ServerClock.sync(timeStatus.serverTimestamp);

    const update = () => {
      const elapsed = Math.max(0, Math.floor((ServerClock.now() - timeStatus.serverTimestamp) / 1000));
      const next = Math.max(0, Number(timeStatus.remainingSeconds || 0) - elapsed);
      setSecondsLeft(next);

      if (next === 600) setActiveWarning('10 minutes remaining in your private session');
      else if (next === 300) setActiveWarning('5 minutes remaining in your private session');
      else if (next === 60) setActiveWarning('Final 1 minute remaining before sanctuary restrictions apply');
      else if (next <= 0) setActiveWarning(null);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [timeStatus]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCritical = secondsLeft < 300;
  const isExpired = secondsLeft <= 0 || timeStatus?.isExpired;

  return (
    <div className="relative z-30">
      {/* Warning Toast */}
      <AnimatePresence>
        {activeWarning && !isExpired && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-xl text-xs font-medium"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>{activeWarning}</span>
            <button
              onClick={() => setActiveWarning(null)}
              className="ml-2 text-amber-400 hover:text-amber-100 text-xs uppercase"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Expiration Notice Banner if Expired */}
      {isExpired && (
        <motion.div
          id="time-expired-global-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="w-full bg-red-950/90 border-b border-red-500/40 text-red-200 px-4 py-3 text-center text-xs backdrop-blur-md shadow-lg"
        >
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 font-medium">
            <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Sanctuary Time Limit Reached</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <span className="italic">{timeStatus?.customMessage || 'Your time in SYNAX has ended for now. See you again soon ✨'}</span>
          </div>
        </motion.div>
      )}

      {/* Pill Widget in Header (Rendered inside header component) */}
    </div>
  );
};

export const TimeRemainingPill: React.FC<{ secondsLeft: number; isExpired: boolean }> = ({
  secondsLeft,
  isExpired,
}) => {
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(Math.max(0, totalSeconds) / 60);
    const s = Math.max(0, totalSeconds) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = secondsLeft <= 300 && !isExpired;

  return (
    <div
      id="time-remaining-pill"
      className={`inline-flex max-w-full items-center gap-1 px-2 sm:gap-1.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono font-semibold tracking-wider transition-all backdrop-blur-md border ${
        isExpired
          ? 'bg-red-950/60 border-red-500/40 text-red-300'
          : isWarning
          ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse'
          : 'bg-slate-900/70 border-slate-700/60 text-indigo-300'
      }`}
      title={isExpired ? 'Session time expired' : 'Authoritative server time remaining'}
    >
      {isExpired ? (
        <>
          <Lock className="w-3 h-3 text-red-400" />
          <span>00:00<span className="hidden sm:inline"> EXPIRED</span></span>
        </>
      ) : (
        <>
          <Hourglass className={`w-3 h-3 ${isWarning ? 'text-amber-400' : 'text-indigo-400'}`} />
          <span>{formatTime(secondsLeft)}</span>
        </>
      )}
    </div>
  );
};
