import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { LogoMark } from './LogoMark';
import { X, Upload, Save, User, Sparkles, Check, Loader2 } from 'lucide-react';
import { ApiService } from '../services/api';

interface UserProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

const PRESET_PFPS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onProfileUpdated,
}) => {
  const [pfpUrl, setPfpUrl] = useState(user.pfpUrl || '');
  const [nickname, setNickname] = useState(user.nickname || '');
  const [bio, setBio] = useState(user.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await ApiService.uploadFile(file);
      setPfpUrl(res.fileUrl);
    } catch (err) {
      console.error('PFP upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await ApiService.updateOwnProfile({
        pfpUrl,
        nickname: nickname.trim(),
        bio: bio.trim(),
      });
      onProfileUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl select-none"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white font-cinzel">Personal Profile (PFP)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identity distinction callout */}
        <div className="mb-6 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 text-xs flex items-center gap-3">
          <LogoMark logo={user.logo} size="sm" glow={false} />
          <div>
            <span className="font-semibold text-white">Logo vs PFP: </span>
            <span>
              Your professional mark ({user.logo.name}) is configured by the Admin. Your PFP below is your personal chat portrait.
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Current PFP preview & upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <img
                src={pfpUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400'}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
              />
              <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-medium transition-opacity">
                <Upload className="w-4 h-4 mb-0.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                PFP Image URL / Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pfpUrl}
                  onChange={(e) => setPfpUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500">Presets:</span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {PRESET_PFPS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPfpUrl(url)}
                      className="w-6 h-6 rounded-full overflow-hidden border border-slate-700 hover:scale-110 transition-transform"
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Private Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Sera, Kael, My Bestie..."
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Bio / Status */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Sanctuary Status / Bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Stargazing through the digital veil..."
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            {savedSuccess ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-4 h-4" /> Profile saved successfully!
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                Only visible inside SYNAX.
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold tracking-wider uppercase shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
