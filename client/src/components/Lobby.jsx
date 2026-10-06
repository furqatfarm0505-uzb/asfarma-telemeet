import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Shield, Users, Copy, Check } from 'lucide-react';
import { AsfarmaLogo } from './AsfarmaLogo';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

export function Lobby({ roomId, onJoinRoom }) {
  const { t } = useLanguage();
  const [userName, setUserName] = useState(() => localStorage.getItem('asfarma_user_name') || '');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [stream, setStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);

  // Setup preview camera & mic
  useEffect(() => {
    let localStream = null;
    let animId = null;

    async function setupPreview() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Setup audio level meter
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(avg * 2.5)));
          animId = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err) {
        console.warn('Lobby camera preview error:', err);
      }
    }

    setupPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (animId) cancelAnimationFrame(animId);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !isAudioEnabled));
    }
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !isVideoEnabled));
    }
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;

    localStorage.setItem('asfarma_user_name', userName.trim());

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    onJoinRoom({
      name: userName.trim(),
      audioEnabled: isAudioEnabled,
      videoEnabled: isVideoEnabled,
    });
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      {/* Top Header with Asfarma Logo and Language Switcher */}
      <div className="w-full max-w-5xl mb-6 flex items-center justify-between">
        <AsfarmaLogo size="large" />

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <button
            onClick={copyRoomLink}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-xs font-semibold text-gray-700 shadow-sm transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-orange-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            <span>{copied ? t.copiedLink : `${t.room}: ${roomId}`}</span>
          </button>
        </div>
      </div>

      {/* Main Card Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-gray-200/90 p-6 md:p-8 rounded-3xl shadow-xl">
        {/* Left: Camera Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-[#1a1c20] rounded-2xl overflow-hidden border border-gray-300 shadow-inner flex items-center justify-center">
            {isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="w-24 h-24 rounded-full bg-orange-600/20 border-2 border-orange-500 text-orange-400 flex items-center justify-center text-3xl font-black">
                  {userName ? userName.charAt(0).toUpperCase() : 'A'}
                </div>
                <p className="text-sm font-medium">{t.camOffPlaceholder}</p>
              </div>
            )}

            {/* Speaking audio meter bar */}
            {isAudioEnabled && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10">
                <Mic className="w-4 h-4 text-orange-400 animate-pulse" />
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick Toggle Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-3 rounded-full backdrop-blur-md transition shadow-lg ${
                  isAudioEnabled
                    ? 'bg-black/60 hover:bg-black/80 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                title={isAudioEnabled ? t.micOnTitle : t.micOffTitle}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3 rounded-full backdrop-blur-md transition shadow-lg ${
                  isVideoEnabled
                    ? 'bg-black/60 hover:bg-black/80 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                title={isVideoEnabled ? t.camOnTitle : t.camOffTitle}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-orange-600" />
            {t.securityNotice}
          </p>
        </div>

        {/* Right: Join Form */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
              {t.lobbyReadyTitle}
            </h2>
            <p className="text-sm text-gray-500">
              {t.lobbyReadyDesc}
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                {t.yourNameLabel}
              </label>
              <input
                type="text"
                required
                autoFocus
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={t.yourNamePlaceholder}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm shadow-sm"
              />
            </div>

            <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/80 space-y-2 text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <span>{t.micStatus}</span>
                <span className={isAudioEnabled ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                  {isAudioEnabled ? t.enabledText : t.disabledText}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.camStatus}</span>
                <span className={isVideoEnabled ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                  {isVideoEnabled ? t.enabledText : t.disabledText}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white shadow-xl shadow-orange-600/30 transition transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
            >
              <Users className="w-4 h-4" />
              <span>{t.joinMeetingBtn}</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <span className="text-xs text-gray-500 font-medium">
              {t.deviceNotice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
