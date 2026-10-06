import React from 'react';
import {
  Users,
  X,
  Mic,
  MicOff,
  Hand,
  UserX,
  VolumeX,
  BarChart2,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function ParticipantsPanel({
  self,
  participants,
  isHost,
  onClose,
  onMuteParticipant,
  onMuteAll,
  onKickParticipant,
  onOpenReport,
}) {
  const { t } = useLanguage();
  const allParticipants = [self, ...participants];

  return (
    <div className="w-full sm:w-80 md:w-96 h-full bg-white border-l border-gray-200 flex flex-col z-40 shadow-2xl absolute sm:relative right-0 top-0 bottom-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-600" />
          <h2 className="font-bold text-gray-900 text-sm">
            {t.participantsHeading} ({allParticipants.length})
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold border border-gray-200 transition shadow-sm"
          title={t.close}
        >
          <X className="w-4 h-4" />
          <span>{t.close}</span>
        </button>
      </div>

      {/* Host Controls Banner */}
      {isHost && (
        <div className="px-4 py-2.5 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between gap-2">
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-sm"
              title={t.viewLiveReport}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{t.meetingReport}</span>
            </button>
          )}
          {participants.length > 0 && (
            <button
              onClick={onMuteAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>{t.muteAll}</span>
            </button>
          )}
        </div>
      )}

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#fbfbfb]">
        {allParticipants.map((p) => {
          const isMe = p.socketId === self.socketId;

          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition"
            >
              {/* User Avatar + Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: p.avatarColor || '#ea580c' }}
                >
                  {p.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-800 truncate max-w-[120px]">
                      {p.name}
                    </span>
                    {isMe && <span className="text-[10px] text-gray-400">{t.you}</span>}
                  </div>
                  {p.isHost && (
                    <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">
                      {t.hostBadge}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icons & Action buttons */}
              <div className="flex items-center gap-1.5">
                {/* Hand Raised */}
                {p.isHandRaised && (
                  <div className="p-1 rounded-lg bg-orange-100 text-orange-600 animate-bounce" title={t.handRaisedBadge}>
                    <Hand className="w-3.5 h-3.5 fill-orange-600" />
                  </div>
                )}

                {/* Mic Icon */}
                <div
                  className={`p-1.5 rounded-lg ${
                    p.audioEnabled ? 'text-gray-500' : 'text-red-600 bg-red-50'
                  }`}
                >
                  {p.audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </div>

                {/* Host actions on other participants */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1 ml-1 pl-1 border-l border-gray-200">
                    <button
                      onClick={() => onMuteParticipant(p.socketId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title={t.muteUser}
                    >
                      <MicOff className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onKickParticipant(p.socketId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title={t.kickUser}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
