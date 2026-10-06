import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  Presentation,
  Hand,
  Smile,
  MessageSquare,
  Users,
  Info,
  PhoneOff,
  Disc,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const EMOJIS = ['👏', '👍', '❤️', '🎉', '😂', '🔥', '✋'];

export function ControlsBar({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  isHandRaised,
  isRecording,
  isPresentationActive,
  isPresenter,
  unreadChatCount,
  participantCount,
  activeSidebar,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onStartVideoFileShare,
  onTogglePresentation,
  onToggleRaiseHand,
  onSendReaction,
  onToggleRecording,
  onToggleSidebar,
  onOpenInfo,
  onLeaveCall,
}) {
  const { t } = useLanguage();
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onStartVideoFileShare) {
      onStartVideoFileShare(file);
      setShowShareMenu(false);
    }
  };

  return (
    <div className="relative px-2 sm:px-4 py-2 sm:py-3 bg-white/95 backdrop-blur-md border-t border-gray-200 flex items-center justify-between z-30 select-none shadow-sm gap-2">
      {/* Left: Meeting Info & Timer */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenInfo}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-semibold text-orange-700 transition"
          title={t.meetingInfoTitle}
        >
          <Info className="w-4 h-4 text-orange-600" />
          <span className="hidden md:inline">{t.meetingInfoTitle}</span>
        </button>

        {/* Recording status badge if active */}
        {isRecording && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 border border-red-300 text-red-600 text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>REC</span>
          </div>
        )}
      </div>

      {/* Center: Core Call Controls (Orange & Light Theme) */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto py-1 scrollbar-none shrink-0">
        {/* Mic Toggle */}
        <button
          onClick={onToggleAudio}
          className={`p-2.5 sm:p-3 md:p-3.5 rounded-full transition shadow-md shrink-0 ${
            isAudioMuted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
          }`}
          title={isAudioMuted ? t.micOffTitle : t.micOnTitle}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          className={`p-2.5 sm:p-3 md:p-3.5 rounded-full transition shadow-md shrink-0 ${
            isVideoOff
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
          }`}
          title={isVideoOff ? t.camOffTitle : t.camOnTitle}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share / Video Share Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              if (isScreenSharing) {
                onToggleScreenShare();
              } else {
                setShowShareMenu(!showShareMenu);
              }
            }}
            className={`p-2.5 sm:p-3 md:p-3.5 rounded-full transition shadow-md ${
              isScreenSharing
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
            }`}
            title={isScreenSharing ? t.screenShareStop : t.screenShareStart}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {showShareMenu && !isScreenSharing && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white border border-gray-200 p-2 rounded-2xl shadow-2xl flex flex-col gap-1.5 z-50 min-w-[220px] animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowShareMenu(false);
                  onToggleScreenShare();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-orange-50 text-gray-800 text-xs font-semibold transition text-left"
              >
                <MonitorUp className="w-4 h-4 text-orange-600" />
                <span>{t.screenShareStart}</span>
              </button>

              <label className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-orange-50 text-gray-800 text-xs font-semibold cursor-pointer transition text-left">
                <Video className="w-4 h-4 text-amber-600" />
                <span>{t.shareVideoFile || 'Видео файл намойиш қилиш'}</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Presentation & Slides Mode */}
        <button
          onClick={onTogglePresentation}
          className={`p-2.5 sm:p-3 md:p-3.5 rounded-full transition shadow-md shrink-0 ${
            isPresentationActive
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
          }`}
          title={isPresentationActive ? t.presentationActive : t.presentationMode}
        >
          <Presentation className="w-5 h-5" />
        </button>

        {/* Raise Hand */}
        <button
          onClick={onToggleRaiseHand}
          className={`p-2.5 sm:p-3 md:p-3.5 rounded-full transition shadow-md shrink-0 ${
            isHandRaised
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
          }`}
          title={isHandRaised ? t.lowerHand : t.raiseHand}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Reactions Emoji Popover */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
            className="p-2.5 sm:p-3 md:p-3.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 transition shadow-md"
            title={t.sendReaction}
          >
            <Smile className="w-5 h-5" />
          </button>

          {showReactionsMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white border border-gray-200 p-2 rounded-2xl shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowReactionsMenu(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-xl hover:scale-125 hover:bg-orange-50 rounded-xl transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Record Meeting */}
        <button
          onClick={onToggleRecording}
          className={`p-2.5 sm:p-3 md:p-3.5 rounded-full transition shadow-md shrink-0 ${
            isRecording
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
          }`}
          title={isRecording ? t.recordStop : t.recordStart}
        >
          <Disc className="w-5 h-5" />
        </button>

        {/* Leave Call (Red) - Always visible and clickable */}
        <button
          onClick={onLeaveCall}
          className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-lg shadow-red-600/30 flex items-center gap-2 shrink-0"
          title={t.leaveCall}
        >
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs font-bold">{t.leaveCall}</span>
        </button>
      </div>

      {/* Right: Sidebars (Chat & Participants) */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
        {/* Participants Sidebar Toggle */}
        <button
          onClick={() => onToggleSidebar('participants')}
          className={`relative p-2.5 sm:p-3 rounded-xl transition shrink-0 ${
            activeSidebar === 'participants'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
          }`}
          title={t.participantsCountTitle}
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
            {participantCount}
          </span>
        </button>

        {/* Chat Sidebar Toggle */}
        <button
          onClick={() => onToggleSidebar('chat')}
          className={`relative p-2.5 sm:p-3 rounded-xl transition shrink-0 ${
            activeSidebar === 'chat'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
          }`}
          title={t.chatTitle}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && activeSidebar !== 'chat' && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
              {unreadChatCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
