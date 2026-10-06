import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Share2, Users } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function MeetingInfoModal({ roomId, onClose }) {
  const { t } = useLanguage();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const meetingUrl = window.location.href;

  const copyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-gray-900 text-base">{t.meetingInfoTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 my-5">
          {/* Room ID Copy */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
              {t.roomIdLabel}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={roomId}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-900 font-mono focus:outline-none"
              />
              <button
                onClick={copyCode}
                className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-orange-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? t.copiedBtn : t.copyBtn}</span>
              </button>
            </div>
          </div>

          {/* Full Link Copy */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
              {t.meetingUrlLabel}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={meetingUrl}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-900 truncate focus:outline-none"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? t.copiedLink : t.copyLink}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100 text-xs text-gray-600 space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="w-4 h-4 text-orange-600" />
              <span>{t.capacityNotice}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.noInstallNotice}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}
