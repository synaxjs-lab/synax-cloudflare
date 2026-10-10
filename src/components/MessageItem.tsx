import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChatMessage } from '../types';
import {
  Play,
  Pause,
  Download,
  FileText,
  Smile,
  Reply,
  Pin,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  Clock,
  PinOff
} from 'lucide-react';

interface MessageItemProps {
  message: ChatMessage;
  currentUserId: string;
  senderName: string;
  senderPfp?: string;
  isOtherOnline?: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onJumpToMessage: (messageId: string) => void;
  isHighlighted?: boolean;
  onPin: (messageId: string) => void;
  onEdit: (messageId: string, text: string) => void;
  onDelete: (messageId: string) => void;
  onOpenImage: (url: string) => void;
  animateOnMount?: boolean;
}

const QUICK_REACTIONS = ['❤️', '✨', '🌙', '🔥', '😊', '🤍'];

// Turn plain-text HTTP(S) links into real links. Keep the parser intentionally
// small and deterministic so normal chat text remains unchanged and unsafe
// protocols (javascript:, data:, etc.) can never become clickable links.
function renderMessageText(text: string, isMe: boolean) {
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  text.replace(urlPattern, (rawMatch, _group, offset) => {
    const start = Number(offset);
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));

    // Don't include sentence punctuation or an unmatched closing bracket
    // that belongs to the surrounding prose in the actual href.
    const original = rawMatch as string;
    let href = original;
    while (/[.,!?;:]$/.test(href)) href = href.slice(0, -1);
    while (/[)\]}]$/.test(href)) {
      const last = href[href.length - 1];
      const pairs: Record<string, [string, string]> = {
        ')': ['(', ')'],
        ']': ['[', ']'],
        '}': ['{', '}'],
      };
      const pair = pairs[last];
      const opens = pair ? (href.match(new RegExp(`\\${pair[0]}`, 'g')) || []).length : 0;
      const closes = pair ? (href.match(new RegExp(`\\${pair[1]}`, 'g')) || []).length : 0;
      if (!pair || closes > opens) href = href.slice(0, -1);
      else break;
    }
    const displayUrl = href + original.slice(href.length);

    const safeHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
    parts.push(
      <a
        key={`link-${start}-${href}`}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={`underline underline-offset-2 break-all decoration-dotted transition-colors ${
          isMe
            ? 'text-cyan-200 hover:text-white'
            : 'text-indigo-300 hover:text-indigo-200'
        }`}
        title={safeHref}
      >
        {displayUrl}
      </a>,
    );

    lastIndex = start + rawMatch.length;
    return rawMatch;
  });

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const MessageItemComponent: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  senderName,
  senderPfp,
  onReact,
  onReply,
  onJumpToMessage,
  isHighlighted = false,
  onPin,
  onEdit,
  onDelete,
  onOpenImage,
  animateOnMount = false,
}) => {
  const isMe = message.senderId === currentUserId;
  const isSystem = message.senderId === 'system' || message.type === 'system';

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [copied, setCopied] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<{ emoji: string; id: number } | null>(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{ left: number; top: number } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeTrackingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeAnimationFrameRef = useRef<number | null>(null);
  const reactionButtonRef = useRef<HTMLButtonElement | null>(null);
  const reactionBurstTimerRef = useRef<number | null>(null);

  const isInteractiveTouchTarget = (target: EventTarget | null) => {
    const element = target instanceof HTMLElement ? target : null;
    return Boolean(element?.closest('button, a, input, textarea, video, audio, select'));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || isEditing || message.deleted || isInteractiveTouchTarget(event.target)) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    swipeTrackingRef.current = true;
    setSwipeOffset(0);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || !swipeTrackingRef.current) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > 44 && Math.abs(dy) > Math.abs(dx)) {
      swipeTrackingRef.current = false;
      setSwipeOffset(0);
      return;
    }
    const allowed = isMe ? -dx : dx;
    const nextOffset = allowed <= 0 ? 0 : Math.min(88, allowed);
    if (swipeAnimationFrameRef.current !== null) {
      cancelAnimationFrame(swipeAnimationFrameRef.current);
    }
    swipeAnimationFrameRef.current = requestAnimationFrame(() => {
      setSwipeOffset(nextOffset);
      swipeAnimationFrameRef.current = null;
    });
  };

  const resetSwipe = () => {
    swipeStartRef.current = null;
    swipeTrackingRef.current = false;
    if (swipeAnimationFrameRef.current !== null) {
      cancelAnimationFrame(swipeAnimationFrameRef.current);
      swipeAnimationFrameRef.current = null;
    }
    setSwipeOffset(0);
  };

  useEffect(() => () => {
    if (swipeAnimationFrameRef.current !== null) cancelAnimationFrame(swipeAnimationFrameRef.current);
    if (reactionBurstTimerRef.current !== null) window.clearTimeout(reactionBurstTimerRef.current);
  }, []);

  const triggerReaction = (emoji: string) => {
    setReactionBurst({ emoji, id: Date.now() + Math.random() });
    if (reactionBurstTimerRef.current !== null) window.clearTimeout(reactionBurstTimerRef.current);
    reactionBurstTimerRef.current = window.setTimeout(() => {
      setReactionBurst(null);
      reactionBurstTimerRef.current = null;
    }, 430);
    onReact(message.id, emoji);
    setShowReactionPicker(false);
  };

  const toggleReactionPicker = () => {
    if (showReactionPicker) {
      setShowReactionPicker(false);
      setReactionPickerPosition(null);
      return;
    }
    const button = reactionButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 270;
    const gap = 8;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2));
    const top = rect.top > 90 ? rect.top - 58 : rect.bottom + gap;
    setReactionPickerPosition({ left, top });
    setShowReactionPicker(true);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start) return resetSwipe();
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const allowed = isMe ? -dx : dx;
    const shouldReply = swipeTrackingRef.current && allowed >= 64 && Math.abs(dy) <= 56;
    if (shouldReply) {
      suppressClickRef.current = true;
      onReply(message);
      window.setTimeout(() => { suppressClickRef.current = false; }, 250);
    }
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    resetSwipe();
  };

  const handlePointerCancel = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event) { try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {} }
    resetSwipe();
  };

  // System Message
  if (isSystem) {
    const isExpiration = message.text?.includes('ALLOWED COMMUNICATION TIME HAS ENDED');
    return (
      <div className="w-full my-4 flex flex-col items-center justify-center px-4">
        {isExpiration ? (
          <div className="w-full max-w-lg p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-center shadow-[0_0_25px_rgba(239,68,68,0.15)]">
            <div className="text-xs uppercase tracking-[0.2em] font-mono text-red-400 font-bold mb-1">
              ────────────────────────
            </div>
            <p className="text-sm font-semibold text-red-200 tracking-wide font-cinzel">
              ⏰ YOUR ALLOWED COMMUNICATION TIME HAS ENDED.
            </p>
            <div className="text-xs uppercase tracking-[0.2em] font-mono text-red-400 font-bold mt-1 mb-2">
              ────────────────────────
            </div>
            <p className="text-xs text-red-300/80 italic font-light">
              {message.text?.replace('⏰ YOUR ALLOWED COMMUNICATION TIME HAS ENDED.', '').trim()}
            </p>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 text-xs tracking-wide">
            <span>{message.text}</span>
          </div>
        )}
      </div>
    );
  }

  // Audio Playback Handler
  const togglePlayAudio = () => {
    if (!audioRef.current && message.fileUrl) {
      const audio = new Audio(message.fileUrl);
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
      };
      audioRef.current = audio;
    }

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const saveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      id={`msg-${message.id}`}
      data-message-id={message.id}
      className={`synax-message-row group relative flex w-full gap-2.5 sm:gap-3 my-2.5 px-1.5 sm:px-2 md:px-4 rounded-2xl ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isHighlighted ? 'bg-indigo-500/10 ring-1 ring-indigo-400/70 shadow-[0_0_30px_rgba(99,102,241,0.28)]' : ''}`}
      style={{
        transform: `translateX(${(isMe ? -1 : 1) * swipeOffset}px)`,
        transition: swipeOffset === 0 ? 'transform 180ms ease-out' : 'none',
        willChange: 'transform',
        touchAction: 'pan-y',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={() => {
        if (suppressClickRef.current) return;
        if (
          typeof window !== 'undefined' &&
          window.matchMedia('(max-width: 767px)').matches &&
          !message.deleted &&
          !isEditing
        ) {
          setShowActionsMenu((prev) => !prev);
          setShowReactionPicker(false);
        }
      }}
    >
      {swipeOffset > 0 && !message.deleted && (
        <div
          aria-hidden="true"
          className={`absolute top-1/2 -translate-y-1/2 z-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 ${isMe ? 'right-2' : 'left-2'}`}
          style={{ opacity: Math.min(1, swipeOffset / 64) }}
        >
          <Reply className="w-4 h-4" />
        </div>
      )}

      {/* Sender Avatar */}
      <div className="shrink-0 pt-1 w-8">
        <img
          src={senderPfp}
          alt={senderName}
          loading="lazy"
          decoding="async"
          className="block w-8 h-8 rounded-full object-cover object-center aspect-square border border-slate-700/60 shadow-sm"
        />
      </div>

      {/* Message Content Bubble Container */}
      <div className={`relative min-w-0 max-w-[calc(100%-44px)] sm:max-w-md md:max-w-lg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Pinned Tag */}
        {message.isPinned && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-1 px-1">
            <Pin className="w-2.5 h-2.5 fill-amber-400" />
            <span>Pinned Message</span>
          </div>
        )}

        {/* Reply Preview Reference */}
        {message.replyTo && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onJumpToMessage(message.replyTo!.id);
            }}
            className={`group/reply mb-1 p-2.5 rounded-xl text-xs flex flex-col gap-0.5 border text-left cursor-pointer transition-all w-full max-w-full active:scale-[0.99] hover:border-indigo-400/60 ${
              isMe
                ? 'bg-indigo-950/40 border-indigo-800/40 text-indigo-200 hover:bg-indigo-900/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
            }`}
            title="Jump to original message"
            aria-label={`Jump to original message from ${message.replyTo.senderName}`}
            data-reply-target-id={message.replyTo.id}
          >
            <span className="text-[10px] font-semibold text-slate-400 group-hover/reply:text-indigo-300 transition-colors">
              Replying to {message.replyTo.senderName}
            </span>
            <p className="line-clamp-2 italic text-slate-300/80 break-words">
              "{message.replyTo.text}"
            </p>
          </button>
        )}

        {/* The Main Bubble */}
        <div
          className={`synax-message-bubble relative max-w-full p-3 sm:p-4 rounded-3xl text-sm leading-relaxed shadow-md ${animateOnMount ? 'synax-message-bubble-enter' : ''} ${
            isMe
              ? 'bg-gradient-to-br from-indigo-950/90 via-indigo-900/80 to-blue-950/90 text-white rounded-tr-xs border border-indigo-400/40 shadow-[0_4px_25px_rgba(99,102,241,0.25)] backdrop-blur-xl'
              : 'bg-gradient-to-br from-slate-900/90 via-purple-950/60 to-slate-950/90 text-slate-100 rounded-tl-xs border border-purple-400/30 shadow-[0_4px_25px_rgba(168,85,247,0.18)] backdrop-blur-xl'
          }`}
        >
          {reactionBurst && (
            <span
              key={String(reactionBurst.id)}
              aria-hidden="true"
              className="synax-reaction-burst pointer-events-none absolute z-40"
            >
              {reactionBurst.emoji}
            </span>
          )}

          {/* Deleted State */}
          {message.deleted ? (
            <p className="italic text-slate-400 text-xs flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>This message was deleted.</span>
            </p>
          ) : isEditing ? (
            /* Inline Edit View */
            <div className="space-y-2 min-w-[240px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 text-xs bg-slate-950/80 rounded-xl border border-slate-700 text-white focus:outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Image message */}
              {message.type === 'image' && message.fileUrl && (
                <div className="mb-2 overflow-hidden rounded-2xl cursor-pointer">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={message.fileUrl}
                    alt={message.fileName || 'Shared photo'}
                    onClick={() => onOpenImage(message.fileUrl!)}
                    className="block max-h-72 w-full max-w-[78vw] object-cover"
                  />
                </div>
              )}


              {/* Video message */}
              {(message.type as string) === 'video' && message.fileUrl && (
                <div className="mb-2 overflow-hidden rounded-2xl max-w-full bg-black/20">
                  <video
                    src={message.fileUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="block w-full max-w-[min(78vw,420px)] max-h-80 rounded-2xl object-contain bg-black"
                  >
                    Your browser does not support video playback.
                  </video>

                  {message.fileName && (
                    <div className="px-2.5 py-2 text-[10px] text-slate-300/80 truncate">
                      {message.fileName}
                    </div>
                  )}
                </div>
              )}

              {/* Voice message */}
              {message.type === 'voice' && message.fileUrl && (
                <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                      isMe ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    {/* Visual audio scrubber bar */}
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono opacity-80">
                      <span>Voice Note</span>
                      <span>{message.audioDuration ? `${Math.round(message.audioDuration)}s` : '0:05'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* File attachment */}
              {message.type === 'file' && message.fileUrl && (
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/20 border border-white/10 mb-2">
                  <div className="p-2 rounded-xl bg-white/10 text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-white">{message.fileName || 'Document'}</p>
                    <p className="text-[10px] text-white/60">
                      {message.fileSize ? `${Math.round(message.fileSize / 1024)} KB` : 'File'}
                    </p>
                  </div>
                  <a
                    href={message.fileUrl}
                    download={message.fileName || 'file'}
                    className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Text content */}
              {message.text && (
                <p className="whitespace-pre-wrap break-words">{renderMessageText(message.text, isMe)}</p>
              )}
            </>
          )}

          {/* Footer Metadata: Timestamp, Edited tag, Read checkmarks */}
          <div
            className={`flex items-center gap-1.5 mt-1 text-[10px] ${
              isMe ? 'text-indigo-200/80 justify-end' : 'text-slate-400 justify-start'
            }`}
          >
            {message.isEdited && <span className="italic">(edited)</span>}
            <span>{formatTime(message.timestamp)}</span>

            {isMe && !message.deleted && (
              <span title={message.status === 'read' ? 'Read' : message.status === 'delivered' ? 'Delivered' : 'Sent'}>
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Emoji Reactions Tray */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (() => {
          const counts: Record<string, number> = {};
          Object.values(message.reactions).forEach((emoji) => {
            const key = String(emoji || '');
            if (key) counts[key] = (counts[key] || 0) + 1;
          });
          const myReaction = message.reactions[currentUserId];

          return (
            <div className="flex flex-wrap gap-1 mt-1 z-10">
              {Object.entries(counts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerReaction(emoji);
                  }}
                  title={`${count} reaction${count === 1 ? '' : 's'}${myReaction === emoji ? ' • Your reaction' : ''}`}
                  className={`min-h-[22px] px-2 py-0.5 rounded-full text-xs flex items-center gap-1.5 border transition-all ${
                    myReaction === emoji
                      ? 'bg-indigo-950/90 border-indigo-400/60 text-indigo-100 shadow-[0_0_12px_rgba(99,102,241,0.18)]'
                      : 'bg-slate-900/90 border-slate-700 text-slate-200'
                  } hover:border-indigo-400/60 hover:bg-slate-800/90`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {count > 1 && (
                    <span className="text-[10px] font-semibold tabular-nums opacity-80">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Mobile actions: tap the message; no three-dot button */}
        {!message.deleted && showActionsMenu && (
          <div
            className={`md:hidden mt-1.5 flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-lg max-w-full ${
              isMe ? 'justify-end' : 'justify-start'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReactionPicker((prev) => !prev)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 bg-slate-900"
                aria-label="Add reaction"
              >
                <Smile className="w-4 h-4" />
              </button>

              {showReactionPicker && (
                <div
                  className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 p-1.5 rounded-2xl bg-slate-950 border border-slate-700 shadow-xl z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        triggerReaction(emoji);
                        setShowReactionPicker(false);
                        setShowActionsMenu(false);
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base active:bg-slate-800"
                      aria-label={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onReply(message);
                setShowActionsMenu(false);
                setShowReactionPicker(false);
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 bg-slate-900"
              aria-label="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                onPin(message.id);
                setShowActionsMenu(false);
                setShowReactionPicker(false);
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 bg-slate-900"
              aria-label={message.isPinned ? 'Unpin' : 'Pin'}
            >
              {message.isPinned ? (
                <PinOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Pin className="w-4 h-4" />
              )}
            </button>

            {message.text && (
              <button
                type="button"
                onClick={async () => {
                  await handleCopy();
                  setShowActionsMenu(false);
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 bg-slate-900"
                aria-label="Copy"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}

            {isMe && message.type === 'text' && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setShowActionsMenu(false);
                  setShowReactionPicker(false);
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 bg-slate-900"
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {isMe && (
              <button
                type="button"
                onClick={() => {
                  onDelete(message.id);
                  setShowActionsMenu(false);
                  setShowReactionPicker(false);
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-red-300 bg-slate-900"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Desktop hover actions */}
        {!message.deleted && (
          <div
            className={`hidden md:flex absolute top-0 opacity-0 group-hover:opacity-100 items-center gap-1 p-1 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-lg backdrop-blur-md z-20 ${
              isMe ? 'right-full mr-2' : 'left-full ml-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                ref={reactionButtonRef}
                type="button"
                onClick={toggleReactionPicker}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-transform touch-manipulation"
                title="Add reaction"
                aria-label="Add reaction"
                aria-expanded={showReactionPicker}
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {showReactionPicker && reactionPickerPosition && typeof document !== 'undefined' && createPortal(
                <div
                  className="fixed flex items-center gap-1 p-1.5 rounded-2xl bg-slate-900/98 border border-slate-700 shadow-2xl z-[9999] synax-reaction-picker"
                  style={{ left: reactionPickerPosition.left, top: reactionPickerPosition.top }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => triggerReaction(emoji)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-transform hover:scale-125 active:scale-95"
                      aria-label={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>,
                document.body,
              )}
            </div>

            <button
              type="button"
              onClick={() => onReply(message)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onPin(message.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800"
              title={message.isPinned ? 'Unpin' : 'Pin'}
            >
              {message.isPinned ? (
                <PinOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Pin className="w-3.5 h-3.5" />
              )}
            </button>

            {message.text && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {isMe && message.type === 'text' && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {isMe && (
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
                title="Delete for everyone"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}      </div>
    </div>
  );
};

export const MessageItem = React.memo(MessageItemComponent);
