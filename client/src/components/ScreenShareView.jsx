import React, { useRef, useEffect, useState } from 'react';
import { Monitor, Maximize2, Minimize2, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function ScreenShareView({
  stream,
  sharerName,
  isSelf = false,
  onStopScreenShare,
}) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#0d0e11] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#16181d] border-b border-gray-800/80 text-xs z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-orange-500/20 text-orange-400">
            <Monitor className="w-4 h-4" />
          </div>
          <span className="font-semibold text-white">
            {isSelf
              ? t.youAreSharing
              : t.someoneIsSharing(sharerName)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#202327] hover:bg-[#2c3036] text-gray-300 hover:text-white transition"
            title={isFullscreen ? t.exitFullscreen : t.fullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Stop Sharing Button (Only for sharer) */}
          {isSelf && (
            <button
              onClick={onStopScreenShare}
              className="px-3 py-1 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-red-600/30"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.stopSharingBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Video Content */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden p-2">
        {!stream ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium">{t.connectingScreen || 'Экран намойиши уланмоқда...'}</p>
          </div>
        ) : (
          <>
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            {/* If stream contains audio track and not self, play audio */}
            {!isSelf && stream.getAudioTracks().length > 0 && (
              <audio
                ref={(el) => {
                  if (el && el.srcObject !== stream) {
                    el.srcObject = stream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
              />
            )}
          </>
        )}

        {/* Presenter Tips Overlay at Bottom */}
        {isSelf && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs text-gray-300 flex items-center gap-2 shadow-xl z-20">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span>{t.pptxLiveTip}</span>
          </div>
        )}
      </div>
    </div>
  );
}
