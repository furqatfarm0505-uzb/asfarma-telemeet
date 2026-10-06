import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Pin, PinOff, Hand } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function VideoTile({
  stream,
  name,
  isSelf = false,
  isHost = false,
  audioEnabled = true,
  videoEnabled = true,
  isSpeaking = false,
  isHandRaised = false,
  isPinned = false,
  onPinToggle,
  avatarColor = '#3B82F6',
}) {
  const { t } = useLanguage();
  const videoRef = useRef(null);

  const [hasVideoTrack, setHasVideoTrack] = React.useState(() => {
    return Boolean(videoEnabled && stream && stream.getVideoTracks().length > 0);
  });

  // Directly attach and play stream whenever stream or element updates
  const setVideoRef = (el) => {
    videoRef.current = el;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  };

  useEffect(() => {
    const updateVideoState = () => {
      if (!stream) {
        setHasVideoTrack(false);
        return;
      }
      const vTracks = stream.getVideoTracks();
      const active = vTracks.some((t) => t.readyState === 'live' && t.enabled !== false);
      setHasVideoTrack(active && videoEnabled);
    };

    updateVideoState();

    if (stream) {
      stream.addEventListener('addtrack', updateVideoState);
      stream.addEventListener('removetrack', updateVideoState);
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener('unmute', updateVideoState);
        t.addEventListener('mute', updateVideoState);
        t.addEventListener('ended', updateVideoState);
      });
    }

    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }

    return () => {
      if (stream) {
        stream.removeEventListener('addtrack', updateVideoState);
        stream.removeEventListener('removetrack', updateVideoState);
        stream.getVideoTracks().forEach((t) => {
          t.removeEventListener('unmute', updateVideoState);
          t.removeEventListener('mute', updateVideoState);
          t.removeEventListener('ended', updateVideoState);
        });
      }
    };
  }, [stream, videoEnabled]);

  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const showVideo = hasVideoTrack || (videoEnabled && stream && stream.getVideoTracks().length > 0);

  return (
    <div
      className={`relative w-full h-full bg-[#1e2024] rounded-2xl overflow-hidden group border transition-all duration-300 ${
        isSpeaking
          ? 'border-orange-500 shadow-[0_0_18px_rgba(234,88,12,0.6)] ring-2 ring-orange-500/50'
          : 'border-gray-700/80 hover:border-orange-500/40'
      }`}
    >
      {/* Video Element - Always kept mounted so WebRTC stream binding is never lost */}
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        muted={isSelf} // Always mute self to avoid acoustic echo feedback
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isSelf ? 'mirror' : ''
        } ${showVideo ? 'opacity-100 z-10' : 'opacity-0 absolute inset-0 -z-10'}`}
      />

      {/* Avatar Placeholder - Shown when video is off */}
      {!showVideo && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1c20] to-[#121316]">
          <div
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-xl transition-transform duration-300 ${
              isSpeaking ? 'scale-110 ring-4 ring-orange-500 ring-offset-4 ring-offset-[#121316]' : ''
            }`}
            style={{ backgroundColor: avatarColor || '#ea580c' }}
          >
            {initial}
          </div>
        </div>
      )}

      {/* Top Left: Hand Raised Badge */}
      {isHandRaised && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500 text-white text-xs font-semibold shadow-lg backdrop-blur-md animate-bounce">
          <Hand className="w-3.5 h-3.5 fill-white" />
          <span>{t.handRaisedBadge}</span>
        </div>
      )}

      {/* Top Right: Pin Action Button */}
      {onPinToggle && (
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onPinToggle}
            className={`p-2 rounded-lg backdrop-blur-md text-white transition ${
              isPinned ? 'bg-orange-600' : 'bg-black/60 hover:bg-black/80'
            }`}
            title={isPinned ? t.unpinTile : t.pinTile}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Bottom Info Bar: Name Tag & Mic Status */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white max-w-[85%] truncate shadow-md">
          <span className="truncate">
            {name} {isSelf && t.you}
          </span>
          {isHost && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-600 text-white">
              {t.hostBadge}
            </span>
          )}
        </div>

        {/* Audio Muted Indicator */}
        <div
          className={`p-1.5 rounded-lg backdrop-blur-md shadow-md ${
            audioEnabled
              ? 'bg-black/60 text-emerald-400'
              : 'bg-red-600/90 text-white'
          }`}
        >
          {audioEnabled ? (
            <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
          ) : (
            <MicOff className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}
