import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Users,
  Clock,
  Palette,
  MessageSquare,
  Lock,
  History,
  Database,
  Sliders,
  LogOut,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Eye,
  Phone,
  Video,
  Mic,
  Image as ImageIcon,
  FileText,
  Smile,
  X,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { LogoMark } from './LogoMark';
import {
  UserProfile,
  AppSettings,
  TimeStatus,
  AuditLog,
  ProfessionalLogo,
  ChatMessage
} from '../types';
import { PRESET_LOGOS } from '../data/logos';
import { ApiService } from '../services/api';

interface AdminPanelProps {
  onExit: () => void;
}

type TabType =
  | 'dashboard'
  | 'users'
  | 'logos'
  | 'time'
  | 'communication'
  | 'appearance'
  | 'messages'
  | 'security'
  | 'audit'
  | 'system';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Password editing states
  const [person1Password, setPerson1Password] = useState('');
  const [person2Password, setPerson2Password] = useState('');
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // Status banners
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [usersData, settingsData, timeData, auditData, msgData, sessData] = await Promise.all([
        ApiService.adminGetUsers(),
        ApiService.adminGetSettings(),
        ApiService.adminGetAuditLogs(),
        ApiService.adminGetMessages(),
        ApiService.adminGetSessions(),
      ]);
      setUsers(usersData);
      setSettings(settingsData);
      setTimeStatus(usersData[0] ? (usersData[0] as any).timeStatus || null : null);
      setAuditLogs(auditData);
      setMessages(msgData);
      setActiveSessions(sessData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setErrorMsg('Failed to sync admin state. Please ensure you are authenticated.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const triggerSuccess = (text: string) => {
    setSaveSuccess(text);
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  // Update Settings
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const updated = await ApiService.adminUpdateSettings(settings);
      setSettings(updated);
      triggerSuccess('Settings updated and broadcasted successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings');
    }
  };

  // User details save
  const handleSaveUser = async (user: UserProfile, newPassword?: string) => {
    try {
      await ApiService.adminUpdateUser(user.id, {
        name: user.name,
        username: user.username,
        nickname: user.nickname,
        bio: user.bio,
        pfpUrl: user.pfpUrl,
        logo: user.logo,
        isLocked: user.isLocked,
        password: newPassword && newPassword.trim() ? newPassword : undefined,
      });
      triggerSuccess(`Updated identity for ${user.name}`);
      fetchAllData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user');
    }
  };

  // Grant Extra Time to both users
  const handleGrantTime = async (minutes: number) => {
    try {
      await ApiService.adminGrantExtraTime(minutes);
      await fetchAllData();
      triggerSuccess(`Granted +${minutes} minutes to both users.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to grant time');
    }
  };

  // Reset usage for both users without changing their configured limits
  const handleResetUsage = async () => {
    try {
      await ApiService.adminResetTimeUsage();
      await fetchAllData();
      triggerSuccess('Usage reset to 0 for both users.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset usage');
    }
  };

  // Set an exact time limit for one user
  const handleSetTimeLimit = async (
    userId: 'person_1' | 'person_2',
    minutes: number
  ) => {
    const safeMinutes = Math.max(
      1,
      Math.floor(Number(minutes))
    );

    try {
      await ApiService.adminSetTimeLimit(
        userId,
        safeMinutes
      );
      await fetchAllData();

      const personName =
        userId === 'person_1'
          ? person1?.name || 'Person 1'
          : person2?.name || 'Person 2';

      triggerSuccess(
        `${personName} limit set to ${safeMinutes} minutes.`
      );
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Failed to set time limit'
      );
    }
  };

  // Add or remove time from one user
  const handleAdjustTime = async (
    userId: 'person_1' | 'person_2',
    minutes: number
  ) => {
    try {
      if (minutes >= 0) {
        await ApiService.adminAddTime(
          userId,
          minutes
        );
      } else {
        await ApiService.adminRemoveTime(
          userId,
          Math.abs(minutes)
        );
      }

      await fetchAllData();

      const personName =
        userId === 'person_1'
          ? person1?.name || 'Person 1'
          : person2?.name || 'Person 2';

      triggerSuccess(
        `${personName}: ${
          minutes >= 0 ? '+' : ''
        }${minutes} minutes.`
      );
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Failed to adjust time'
      );
    }
  };

  // Reset usage for one user only
  const handleResetUserUsage = async (
    userId: 'person_1' | 'person_2'
  ) => {
    try {
      await ApiService.adminResetUserUsage(userId);
      await fetchAllData();

      const personName =
        userId === 'person_1'
          ? person1?.name || 'Person 1'
          : person2?.name || 'Person 2';

      triggerSuccess(
        `${personName} usage reset to 0.`
      );
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Failed to reset user usage'
      );
    }
  };

  // Clear Messages
  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to completely erase the chat history for both users? This cannot be undone.')) {
      return;
    }
    try {
      await ApiService.adminClearMessages();
      setMessages([]);
      triggerSuccess('Chat history cleared cleanly.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear chat');
    }
  };

  // Export Database Snapshot
  const handleExportDatabase = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      settings,
      timeStatus,
      messagesCount: messages.length,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synax_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerSuccess('Database snapshot exported!');
  };

  // Update Admin Password
  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCurrentPassword || !adminNewPassword) return;
    try {
      await ApiService.adminUpdatePassword(adminCurrentPassword, adminNewPassword);
      setAdminCurrentPassword('');
      setAdminNewPassword('');
      triggerSuccess('Admin master password successfully updated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update admin password');
    }
  };

  const person1 = users.find((u) => u.id === 'person_1');
  const person2 = users.find((u) => u.id === 'person_2');

  const navigationItems = [
    { id: 'dashboard', label: 'Overview', icon: Sliders },
    { id: 'users', label: 'People (2 Users)', icon: Users },
    { id: 'logos', label: 'Logos & Identity', icon: Palette },
    { id: 'time', label: 'Time Controls', icon: Clock },
    { id: 'communication', label: 'Features & Calling', icon: MessageSquare },
    { id: 'appearance', label: 'Atmosphere & Theme', icon: Sparkles },
    { id: 'messages', label: 'Message Audit', icon: Eye },
    { id: 'security', label: 'Lockdown & Keys', icon: Lock },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'system', label: 'Database & Reset', icon: Database },
  ];

  return (
    <div
      id="synax-admin-workspace"
      className="relative z-20 w-full min-h-screen bg-[#05070d] text-slate-100 flex flex-col md:flex-row overflow-hidden select-none font-sans"
    >
      {/* Toast Alert */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs shadow-2xl backdrop-blur-xl"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccess}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs shadow-2xl backdrop-blur-xl"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-2 text-red-400 font-bold">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950/95 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 sm:p-6 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-600 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-anime-header text-white font-cinzel text-shadow-anime-glow">
                Synax Control
              </h1>
              <p className="text-[10px] text-indigo-300/80 uppercase tracking-anime-pill font-sans-celestial font-light">
                Admin Master Sanctuary
              </p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1 overflow-x-auto md:overflow-x-visible flex md:flex-col gap-1 pb-2 md:pb-0">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 hidden md:block" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
          <button
            type="button"
            onClick={fetchAllData}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Status</span>
          </button>

          <button
            id="admin-exit-btn"
            type="button"
            onClick={onExit}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit to World</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto p-4 sm:p-8 md:p-10 bg-[#07090f]/70">
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && settings && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">System Dashboard</h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time status of the private sanctuary for {person1?.name} & {person2?.name}.
              </p>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <span className="text-[10px] uppercase font-mono text-slate-400">Sanctuary Health</span>
                <p className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE & SECURE</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">WebSocket Active • Server Authoritative</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <span className="text-[10px] uppercase font-mono text-slate-400">Allowed Time Remaining</span>
                <p className="text-lg font-bold text-indigo-300 font-mono mt-1">
                  {timeStatus ? `${Math.floor(timeStatus.remainingSeconds / 60)}m ${timeStatus.remainingSeconds % 60}s` : '--'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Limit: {users[0]?.allowedMinutes ?? 60}m / {settings.timeStrategy} • Timer {(settings as AppSettings & { showTimerToUsers?: boolean }).showTimerToUsers !== false ? 'Visible' : 'Hidden'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <span className="text-[10px] uppercase font-mono text-slate-400">Messages Stored</span>
                <p className="text-lg font-bold text-white font-mono mt-1">{messages.length}</p>
                <p className="text-[11px] text-slate-500 mt-1">Persistent server database</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <span className="text-[10px] uppercase font-mono text-slate-400">Lockdown Status</span>
                <p className="text-lg font-bold mt-1">
                  {settings.emergencyLockdown ? (
                    <span className="text-red-400">LOCKED</span>
                  ) : (
                    <span className="text-indigo-400">UNLOCKED</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Emergency switch</p>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
                Quick Server Time Interventions
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleGrantTime(15)}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
                >
                  + Grant 15 Minutes
                </button>
                <button
                  type="button"
                  onClick={() => handleGrantTime(30)}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all"
                >
                  + Grant 30 Minutes
                </button>
                <button
                  type="button"
                  onClick={handleResetUsage}
                  className="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Reset Session Usage
                </button>
              </div>
            </div>

            {/* Identities Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {person1 && (
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex items-center gap-4">
                  <LogoMark logo={person1.logo} size="md" glow={true} />
                  <div>
                    <h4 className="text-base font-bold text-white font-cinzel">{person1.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">@{person1.username}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Mark: {person1.logo.name}
                    </span>
                  </div>
                </div>
              )}

              {person2 && (
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 flex items-center gap-4">
                  <LogoMark logo={person2.logo} size="md" glow={true} />
                  <div>
                    <h4 className="text-base font-bold text-white font-cinzel">{person2.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">@{person2.username}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-pink-950 text-pink-300 border border-pink-800">
                      Mark: {person2.logo.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT (PERSON 1 & PERSON 2) */}
        {activeTab === 'users' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
                Person 1 & Person 2 Management
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure names, usernames, passwords, and lock states for the two participants.
              </p>
            </div>

            {/* Person 1 Card */}
            {person1 && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <LogoMark logo={person1.logo} size="sm" glow={false} />
                    <h3 className="text-base font-bold text-white font-cinzel">Person 1 Account</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={person1.isLocked}
                      onChange={(e) => {
                        setUsers((prev) =>
                          prev.map((u) => (u.id === 'person_1' ? { ...u, isLocked: e.target.checked } : u))
                        );
                      }}
                      className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-red-500"
                    />
                    <span className={person1.isLocked ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      Account Locked
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase text-slate-400">Display Name</label>
                    <input
                      type="text"
                      value={person1.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers((prev) =>
                          prev.map((u) => (u.id === 'person_1' ? { ...u, name: val } : u))
                        );
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase text-slate-400">Username</label>
                    <input
                      type="text"
                      value={person1.username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers((prev) =>
                          prev.map((u) => (u.id === 'person_1' ? { ...u, username: val } : u))
                        );
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs uppercase text-slate-400">
                      Set New Password (Leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password for Person 1..."
                      value={person1Password}
                      onChange={(e) => setPerson1Password(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveUser(person1, person1Password)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Person 1</span>
                  </button>
                </div>
              </div>
            )}

            {/* Person 2 Card */}
            {person2 && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <LogoMark logo={person2.logo} size="sm" glow={false} />
                    <h3 className="text-base font-bold text-white font-cinzel">Person 2 Account</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={person2.isLocked}
                      onChange={(e) => {
                        setUsers((prev) =>
                          prev.map((u) => (u.id === 'person_2' ? { ...u, isLocked: e.target.checked } : u))
                        );
                      }}
                      className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-red-500"
                    />
                    <span className={person2.isLocked ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      Account Locked
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase text-slate-400">Display Name</label>
                    <input
                      type="text"
                      value={person2.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers((prev) =>
                          prev.map((u) => (u.id === 'person_2' ? { ...u, name: val } : u))
                        );
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase text-slate-400">Username</label>
                    <input
                      type="text"
                      value={person2.username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers((prev) =>
                          prev.map((u) => (u.id === 'person_2' ? { ...u, username: val } : u))
                        );
                      }}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs uppercase text-slate-400">
                      Set New Password (Leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new password for Person 2..."
                      value={person2Password}
                      onChange={(e) => setPerson2Password(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveUser(person2, person2Password)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Person 2</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LOGOS & IDENTITY SYSTEM */}
        {activeTab === 'logos' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
                Professional Logos & Identity System
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select from premium geometric anime-inspired vector emblems, or customize colors and paths.
              </p>
            </div>

            {/* Logo Selectors for Person 1 & 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Person 1 Logo */}
              {person1 && (
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-indigo-300 font-cinzel">
                    {person1.name} — Professional Mark
                  </h3>
                  <div className="flex items-center gap-4 py-2">
                    <LogoMark logo={person1.logo} size="lg" glow={true} />
                    <div>
                      <p className="text-sm font-bold text-white">{person1.logo.name}</p>
                      <p className="text-xs text-slate-400 font-mono">Accent: {person1.logo.accentColor}</p>
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <label className="text-xs uppercase text-slate-400 font-medium">Choose Mark Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_LOGOS.map((logo) => (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={() => {
                          const updatedLogo: ProfessionalLogo = {
                            ...logo,
                            accentColor: person1.logo.accentColor,
                            glowColor: person1.logo.glowColor,
                          };
                          setUsers((prev) =>
                            prev.map((u) => (u.id === 'person_1' ? { ...u, logo: updatedLogo } : u))
                          );
                        }}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          person1.logo.id === logo.id
                            ? 'bg-indigo-950 border-indigo-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <LogoMark logo={logo} size="sm" glow={false} />
                        <span className="text-[10px] text-slate-300 truncate w-full">{logo.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase text-slate-400">Accent Color (Hex)</label>
                    <input
                      type="color"
                      value={person1.logo.accentColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers((prev) =>
                          prev.map((u) =>
                            u.id === 'person_1'
                              ? { ...u, logo: { ...u.logo, accentColor: val, glowColor: `${val}60` } }
                              : u
                          )
                        );
                      }}
                      className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveUser(person1)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    Save Logo Mark I
                  </button>
                </div>
              )}

              {/* Person 2 Logo */}
              {person2 && (
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-pink-300 font-cinzel">
                    {person2.name} — Professional Mark
                  </h3>
                  <div className="flex items-center gap-4 py-2">
                    <LogoMark logo={person2.logo} size="lg" glow={true} />
                    <div>
                      <p className="text-sm font-bold text-white">{person2.logo.name}</p>
                      <p className="text-xs text-slate-400 font-mono">Accent: {person2.logo.accentColor}</p>
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <label className="text-xs uppercase text-slate-400 font-medium">Choose Mark Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_LOGOS.map((logo) => (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={() => {
                          const updatedLogo: ProfessionalLogo = {
                            ...logo,
                            accentColor: person2.logo.accentColor,
                            glowColor: person2.logo.glowColor,
                          };
                          setUsers((prev) =>
                            prev.map((u) => (u.id === 'person_2' ? { ...u, logo: updatedLogo } : u))
                          );
                        }}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          person2.logo.id === logo.id
                            ? 'bg-pink-950 border-pink-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <LogoMark logo={logo} size="sm" glow={false} />
                        <span className="text-[10px] text-slate-300 truncate w-full">{logo.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase text-slate-400">Accent Color (Hex)</label>
                    <input
                      type="color"
                      value={person2.logo.accentColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers((prev) =>
                          prev.map((u) =>
                            u.id === 'person_2'
                              ? { ...u, logo: { ...u.logo, accentColor: val, glowColor: `${val}60` } }
                              : u
                          )
                        );
                      }}
                      className="w-full h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveUser(person2)}
                    className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold uppercase tracking-wider"
                  >
                    Save Logo Mark II
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TIME CONTROLS (SERVER-AUTHORITATIVE) */}
        {activeTab === 'time' && settings && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
                Server-Side Authoritative Time Controls
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Set an exact limit, add or remove time, or reset consumed usage.
                The server remains the source of truth for both users.
              </p>
            </div>

            {/* Tracking mode and expiration settings */}
            <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase text-slate-400 font-medium">
                    Tracking Mode
                  </label>
                  <select
                    value={settings.timeStrategy}
                    onChange={(e) => {
                      const mode = e.target.value as 'continuous' | 'daily';
                      setSettings({
                        ...settings,
                        timeStrategy: mode,
                        dailyResetAtMidnight: mode === 'daily',
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  >
                    <option value="daily">
                      Daily Allowed Time (Aggregated)
                    </option>
                    <option value="continuous">
                      Active Usage (Pauses When Offline)
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase text-slate-400 font-medium">
                    Daily Reset
                  </label>
                  <label className="flex items-center justify-between gap-3 w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <span className="text-sm text-white">Reset allowance every day at 12:00 AM (India)</span>
                    <input
                      type="checkbox"
                      checked={settings.dailyResetAtMidnight === true || settings.timeStrategy === 'daily'}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setSettings({
                          ...settings,
                          dailyResetAtMidnight: enabled,
                          timeStrategy: enabled ? 'daily' : 'continuous',
                        });
                      }}
                      className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <p className="text-[10px] text-slate-500">
                    The configured limit is restored each new India calendar day. Example: 180 minutes becomes available again after midnight.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase text-slate-400 font-medium">
                    Timer Visibility
                  </label>
                  <label className="flex items-center justify-between gap-3 w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <span className="text-sm text-white">
                      Show countdown to users
                    </span>
                    <input
                      type="checkbox"
                      checked={(settings as AppSettings & { showTimerToUsers?: boolean }).showTimerToUsers !== false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          showTimerToUsers: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Turn this off to hide the timer from both users while keeping the server limit active.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase text-slate-400 font-medium">
                    Expiration Message
                  </label>
                  <input
                    type="text"
                    value={settings.timeOverMessage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        timeOverMessage: e.target.value,
                      })
                    }
                    placeholder="Your time in SYNAX has ended for now."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>
              </div>

              {/* Per-user time controls */}
              <div className="pt-5 border-t border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Individual User Time
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Set the total limit directly. Removing time can never reduce
                    the finite limit below 1 minute.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {[person1, person2]
                    .filter(
                      (user): user is UserProfile =>
                        Boolean(user)
                    )
                    .map((user) => {
                      const isPerson1 =
                        user.id === 'person_1';

                      const time = (user as any).timeStatus;
                      const remainingSeconds =
                        time?.remainingSeconds ?? 0;

                      return (
                        <div
                          key={user.id}
                          className={`p-4 sm:p-5 rounded-2xl bg-slate-950/80 border ${
                            isPerson1
                              ? 'border-indigo-500/30'
                              : 'border-pink-500/30'
                          } space-y-4`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex items-center gap-3">
                              <LogoMark
                                logo={user.logo}
                                size="sm"
                                glow={false}
                              />
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white font-cinzel truncate">
                                  {user.name}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {user.id}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p
                                className={`text-lg font-bold font-mono ${
                                  time?.isExpired
                                    ? 'text-red-400'
                                    : isPerson1
                                      ? 'text-indigo-300'
                                      : 'text-pink-300'
                                }`}
                              >
                                {Math.floor(
                                  remainingSeconds / 60
                                )}m {remainingSeconds % 60}s
                              </p>
                              <p className="text-[10px] text-slate-500">
                                remaining
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-slate-500">
                                Exact Limit (minutes)
                              </label>
                              <input
                                id={`time-limit-${user.id}`}
                                type="number"
                                min={1}
                                max={10080}
                                defaultValue={user.allowedMinutes}
                                key={`${user.id}-${user.allowedMinutes}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const value = Number(
                                      (
                                        e.target as HTMLInputElement
                                      ).value
                                    );
                                    if (
                                      Number.isFinite(value) &&
                                      value >= 1
                                    ) {
                                      void handleSetTimeLimit(
                                        user.id,
                                        value
                                      );
                                    }
                                  }
                                }}
                                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const element =
                                    document.getElementById(
                                      `time-limit-${user.id}`
                                    ) as HTMLInputElement | null;

                                  const value = Number(
                                    element?.value ??
                                      user.allowedMinutes
                                  );

                                  if (
                                    Number.isFinite(value) &&
                                    value >= 1
                                  ) {
                                    void handleSetTimeLimit(
                                      user.id,
                                      value
                                    );
                                  }
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl text-white text-xs font-semibold ${
                                  isPerson1
                                    ? 'bg-indigo-600 hover:bg-indigo-500'
                                    : 'bg-pink-600 hover:bg-pink-500'
                                }`}
                              >
                                Set Exact Limit
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleAdjustTime(
                                  user.id,
                                  5
                                )
                              }
                              className="px-2 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-[11px] font-semibold"
                            >
                              +5m
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleAdjustTime(
                                  user.id,
                                  15
                                )
                              }
                              className="px-2 py-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-[11px] font-semibold"
                            >
                              +15m
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleAdjustTime(
                                  user.id,
                                  -5
                                )
                              }
                              className="px-2 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-[11px] font-semibold"
                            >
                              -5m
                            </button>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                void handleResetUserUsage(
                                  user.id
                                )
                              }
                              className="flex-1 px-3 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border border-amber-800/60 text-xs font-semibold flex items-center justify-center gap-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset Usage
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const confirmed =
                                  window.confirm(
                                    `Set ${user.name}'s limit to 1 minute? This may immediately expire their current session.`
                                  );

                                if (confirmed) {
                                  void handleSetTimeLimit(
                                    user.id,
                                    1
                                  );
                                }
                              }}
                              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-semibold"
                            >
                              Minimum
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Global expiration restrictions */}
              <div className="pt-5 border-t border-slate-800">
                <h4 className="text-xs uppercase tracking-wider text-slate-300 font-semibold mb-3">
                  Restrictions When Time Expires
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .disableMessaging
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            disableMessaging:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>Disable sending messages</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .disableVoiceCalls
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            disableVoiceCalls:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>Disable voice calls</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .disableVideoCalls
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            disableVideoCalls:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>Disable video calls</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .disableImages
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            disableImages:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>Disable image uploads</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .disableFiles
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            disableFiles:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>Disable file uploads</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .disableVoiceMessages
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            disableVoiceMessages:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>Disable voice messages</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={
                        settings.restrictionsOnExpire
                          .lockSession
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restrictionsOnExpire: {
                            ...settings.restrictionsOnExpire,
                            lockSession:
                              e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-950 text-indigo-600"
                    />
                    <span>
                      Lock session when time reaches zero
                    </span>
                  </label>
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-indigo-600/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Time Rules</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: COMMUNICATION CONTROLS */}
        {activeTab === 'communication' && settings && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
                Feature & Communication Controls
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Granularly enable or disable specific communication channels.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(settings.featuresEnabled).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-slate-200 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          featuresEnabled: {
                            ...settings.featuresEnabled,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Feature Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ATMOSPHERE & THEME */}
        {activeTab === 'appearance' && settings && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">
                Atmosphere & Appearance
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize titles, opening animation duration, and cosmic ambient theme.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-slate-400 font-medium">World Title</label>
                <input
                  type="text"
                  value={settings.worldTitle}
                  onChange={(e) => setSettings({ ...settings, worldTitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-cinzel"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-slate-400 font-medium">Subtitle</label>
                <input
                  type="text"
                  value={settings.worldSubtitle}
                  onChange={(e) => setSettings({ ...settings, worldSubtitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-slate-400 font-medium">Cosmic Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white capitalize"
                >
                  <option value="celestial">Celestial (Deep Blue & Violet Void)</option>
                  <option value="twilight">Twilight (Dark Lavender & Obsidian)</option>
                  <option value="cyberpunk">Cyberpunk (Neon Rose & Midnight Indigo)</option>
                  <option value="aurora">Aurora (Emerald Borealis & Stardust)</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Atmosphere</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: MESSAGE AUDIT */}
        {activeTab === 'messages' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">Message Audit & History</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Audit persistent conversation records or perform fresh-chapter resets.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-900 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Chat History</span>
              </button>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 max-h-[500px] overflow-y-auto space-y-2">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No messages recorded in the database.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-indigo-400 uppercase font-mono">[{m.senderId}]: </span>
                      <span className="text-slate-200">{m.text || `[${m.type} attachment]`}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">
                      {new Date(m.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: SECURITY & LOCKDOWN */}
        {activeTab === 'security' && settings && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">Security & Master Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Emergency lockdown controls and master Admin authentication.
              </p>
            </div>

            {/* Emergency Lockdown Card */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-red-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">
                    Emergency Sanctuary Lockdown
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Instantly blocks both users from entering and terminates active sessions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emergencyLockdown}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emergencyLockdown: e.target.checked,
                    })
                  }
                  className="rounded bg-slate-950 text-red-600 focus:ring-red-500 w-5 h-5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase text-slate-400 font-medium">Lockdown Message Displayed</label>
                <input
                  type="text"
                  value={settings.emergencyLockdownMessage}
                  onChange={(e) => setSettings({ ...settings, emergencyLockdownMessage: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold uppercase"
                >
                  Save Lockdown State
                </button>
              </div>
            </div>

            {/* Admin Password Change */}
            <form onSubmit={handleUpdateAdminPassword} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Change Master Admin Password</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase text-slate-400">Current Admin Password</label>
                  <input
                    type="password"
                    value={adminCurrentPassword}
                    onChange={(e) => setAdminCurrentPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    placeholder="Current password (default: admin123)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase text-slate-400">New Admin Password</label>
                  <input
                    type="password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    placeholder="Enter new master password"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!adminCurrentPassword || !adminNewPassword}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase disabled:opacity-50"
                >
                  Update Admin Password
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 9: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">System Audit Trail</h2>
              <p className="text-xs text-slate-400 mt-1">
                Authoritative chronological event log of logins, logouts, calls, and admin modifications.
              </p>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 max-h-[550px] overflow-y-auto space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No audit logs recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-indigo-300 font-mono">[{log.action}]: </span>
                      <span className="text-slate-300">{log.details}</span>
                      {log.actor && <span className="text-slate-500 ml-2 font-mono">by {log.actor}</span>}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">
                      {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 10: SYSTEM DATA & BACKUP */}
        {activeTab === 'system' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-cinzel text-white">Database Snapshot & Backup</h2>
              <p className="text-xs text-slate-400 mt-1">
                Export and inspect the persistent JSON datastore or reset to pristine defaults.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">Export Database Snapshot</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Download complete snapshot containing users, logos, settings, messages, and audit trail.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-red-300">Reset Factory Defaults</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Restores Person 1 (Sora), Person 2 (Aria), default logos, and default 60-minute rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Reset the entire Synax sanctuary to factory defaults?')) {
                      await ApiService.adminResetDefaults();
                      fetchAllData();
                      triggerSuccess('Restored factory defaults!');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-950 border border-red-500/40 text-red-200 hover:text-white hover:bg-red-900 text-xs font-semibold uppercase shrink-0"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};