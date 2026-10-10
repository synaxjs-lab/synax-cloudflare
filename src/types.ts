export interface ProfessionalLogo {
  id: string;
  name: string;
  svgPath: string;
  accentColor: string;
  glowColor: string;
}

export interface UserProfile {
  id: 'person_1' | 'person_2';
  slot: 1 | 2;
  name: string;
  username: string;
  logo: ProfessionalLogo;
  pfpUrl: string; // Personal profile picture (separate from logo!)
  nickname?: string;
  bio?: string;
  isLocked: boolean;
  lockReason?: string;
  allowedMinutes: number;
  dailyUsageSeconds: number;
  activeUsageSeconds?: number;
  activeSessionCount?: number;
  activeSessionStartedAt?: number;
  sessionStartTimestamp?: number;
  lastActiveTimestamp?: number;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  otherUser: Omit<UserProfile, 'isLocked'>;
  timeStatus: TimeStatus;
  settings: AppSettings;
}

export interface TimeStatus {
  hasLimit: boolean;
  mode: 'continuous' | 'daily';
  allowedSeconds: number;
  remainingSeconds: number;
  isExpired: boolean;
  warnings: number[]; // e.g. [600, 300, 60] seconds
  customMessage: string;
  serverTimestamp: number;
  dailyUsageDate?: string | null;
  usageUpdatedAt?: string | null;
  usageVersion?: number;
}

export interface AppSettings {
  worldTitle: string;
  worldSubtitle: string;
  welcomeMessage: string;
  theme: 'celestial' | 'cyberpunk' | 'twilight' | 'aurora';
  chatWallpaper: string;
  accentColor: string;
  introDurationSeconds: number;
  timeOverMessage: string;
  timeStrategy: 'continuous' | 'daily';
  /** When enabled, each user's configured daily allowance is restored at 12:00 AM Asia/Kolkata. */
  dailyResetAtMidnight?: boolean;
  warningMinutes: number[];
  showTimerToUsers?: boolean;
  restrictionsOnExpire: {
    disableMessaging: boolean;
    disableVoiceCalls: boolean;
    disableVideoCalls: boolean;
    disableImages: boolean;
    disableFiles: boolean;
    disableVoiceMessages: boolean;
    lockSession: boolean;
  };
  featuresEnabled: {
    messages: boolean;
    reactions: boolean;
    imageSharing: boolean;
    fileSharing: boolean;
    voiceMessages: boolean;
    voiceCalls: boolean;
    videoCalls: boolean;
    editing: boolean;
    deleting: boolean;
  };
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  senderId: 'person_1' | 'person_2' | 'system';
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  audioDuration?: number;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions: Record<string, string>; // userId -> emoji
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isPinned?: boolean;
  isEdited?: boolean;
  deleted?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  details?: string;
  level: 'info' | 'warn' | 'alert';
}

export type AuditLog = ActivityLog;

export interface CallSignalPayload {
  type: 'call:offer' | 'call:answer' | 'call:ice-candidate' | 'call:reject' | 'call:end';
  callType: 'voice' | 'video';
  callerId: string;
  targetId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PresenceState {
  userId: string;
  isOnline: boolean;
  isTyping: boolean;
  lastSeen: number;
}
