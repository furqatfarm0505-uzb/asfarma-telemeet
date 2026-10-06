import React, { useState } from 'react';
import {
  Plus,
  Link as LinkIcon,
  Presentation,
  MonitorUp,
  Shield,
  Users,
  Zap,
  Calendar,
  Sparkles,
  Copy,
  Check,
  X,
  Video,
} from 'lucide-react';
import { AsfarmaLogo } from './AsfarmaLogo';
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

export function Home({ onStartNewMeeting, onJoinWithCode }) {
  const { t } = useLanguage();
  const [roomInput, setRoomInput] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false);

  // Scheduled meeting details
  const [scheduledTitle, setScheduledTitle] = useState(t.meetingTopicDefault);
  const [scheduledDate, setScheduledDate] = useState('10.10.2026');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [scheduledRoomId, setScheduledRoomId] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;

    let code = roomInput.trim();
    if (code.includes('=')) {
      code = code.split('=').pop();
    } else if (code.includes('/')) {
      code = code.split('/').filter(Boolean).pop();
    }

    onJoinWithCode(code);
  };

  const openScheduleModal = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newId = `${p1}-${p2}-${p3}`;

    setScheduledRoomId(newId);
    setShowNewMeetingMenu(false);
    setShowScheduleModal(true);
  };

  const getMeetingUrl = () => {
    return `${window.location.origin}/?room=${scheduledRoomId}`;
  };

  const getTelegramMessage = () => {
    return t.telegramInviteTemplate(scheduledTitle, scheduledDate, scheduledTime, getMeetingUrl());
  };

  const copyFullInvitation = () => {
    navigator.clipboard.writeText(getTelegramMessage());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const copyOnlyLink = () => {
    navigator.clipboard.writeText(getMeetingUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Navbar with Asfarma Logo and Language Switcher */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200/80 bg-white shadow-sm max-w-7xl mx-auto w-full rounded-b-2xl">
        {/* Asfarma Logo Top Left */}
        <AsfarmaLogo size="large" />

        <div className="flex items-center gap-3 md:gap-4 text-xs">
          {/* Language Switcher Button (O'Z / RU) */}
          <LanguageSwitcher />

          <span className="hidden sm:flex items-center gap-1.5 font-medium text-gray-500">
            <Shield className="w-4 h-4 text-emerald-600" />
            {t.secureWebRTC}
          </span>
          <span className="hidden md:inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-bold border border-orange-200">
            {t.corporateSystem}
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-5xl mx-auto w-full text-center">
        {/* Orange Brand Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-700 mb-8 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>{t.homeBadge}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight max-w-4xl">
          {t.homeTitlePrefix}{' '}
          <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
            {t.homeTitleAccent}
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mb-10 leading-relaxed">
          {t.homeDesc}
        </p>

        {/* Action Controls: New Meeting Dropdown & Join Code */}
        <div className="w-full max-w-md flex flex-col sm:flex-row items-center gap-3 mb-12">
          {/* New Meeting Dropdown */}
          <div className="relative w-full sm:w-auto flex-1">
            <button
              onClick={() => setShowNewMeetingMenu(!showNewMeetingMenu)}
              className="w-full py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-xl shadow-orange-600/25 transition flex items-center justify-center gap-2 transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newMeeting}</span>
            </button>

            {/* Dropdown options */}
            {showNewMeetingMenu && (
              <div className="absolute top-14 left-0 right-0 sm:w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 z-50 text-left space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={openScheduleModal}
                  className="w-full p-2.5 rounded-xl hover:bg-orange-50 text-xs text-gray-700 flex items-center gap-3 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{t.scheduleForLater}</div>
                    <div className="text-[10px] text-gray-500">{t.scheduleDesc}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowNewMeetingMenu(false);
                    onStartNewMeeting();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-orange-50 text-xs text-gray-700 flex items-center gap-3 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{t.startInstantMeeting}</div>
                    <div className="text-[10px] text-gray-500">{t.startInstantDesc}</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Join with Code Form */}
          <form onSubmit={handleJoinSubmit} className="w-full sm:w-auto flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder={t.codePlaceholder}
                className="w-full pl-9 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!roomInput.trim()}
              className="py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-xs font-semibold text-white transition shadow-sm"
            >
              {t.joinBtn}
            </button>
          </form>
        </div>

        {/* Feature Cards Grid (Light theme + Orange accents) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
          <div className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:border-orange-500/50 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
              <Presentation className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">{t.feature1Title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t.feature1Desc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:border-orange-500/50 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <MonitorUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">{t.feature2Title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t.feature2Desc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:border-orange-500/50 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">{t.feature3Title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t.feature3Desc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-gray-200/90 shadow-sm hover:border-orange-500/50 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">{t.feature4Title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{t.feature4Desc}</p>
          </div>
        </div>
      </main>

      {/* Schedule / Invitation Modal (Light Theme + Orange) */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900 text-base">{t.scheduleModalTitle}</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 my-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {t.meetingTopic}
                </label>
                <input
                  type="text"
                  value={scheduledTitle}
                  onChange={(e) => setScheduledTitle(e.target.value)}
                  placeholder="Масалан: Asfarma Ҳисобот Йиғилиши"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t.dateLabel}
                  </label>
                  <input
                    type="text"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    placeholder="10.10.2026"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    {t.timeLabel}
                  </label>
                  <input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="10:00"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Ready Invitation Text Preview */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {t.telegramInviteTitle}
                </label>
                <div className="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200 text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {getTelegramMessage()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={copyFullInvitation}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25"
              >
                {copiedText ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? t.copiedFullText : t.copyFullText}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyOnlyLink}
                  className="py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-orange-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? t.linkCopied : t.copyOnlyLink}</span>
                </button>

                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    onJoinWithCode(scheduledRoomId);
                  }}
                  className="py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition"
                >
                  {t.openRoomNow}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-200 bg-white text-center text-xs text-gray-500">
        {t.footerText}
      </footer>
    </div>
  );
}
