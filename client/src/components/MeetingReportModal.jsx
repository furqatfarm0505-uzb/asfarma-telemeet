import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { AsfarmaLogo } from './AsfarmaLogo';
import {
  Clock,
  Users,
  Video,
  VideoOff,
  Download,
  Copy,
  Check,
  X,
  Home as HomeIcon,
  Award,
  Calendar,
  Sparkles
} from 'lucide-react';

export function MeetingReportModal({ report, isLivePreview = false, onClose, onLeaveToHome }) {
  const { t, language } = useLanguage();
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  if (!report) return null;

  const attendees = report.attendees || [];
  const totalDurationMs = report.totalDurationMs || 0;

  // Format milliseconds into human readable string
  const formatTime = (ms) => {
    const totalSecs = Math.max(0, Math.floor((ms || 0) / 1000));
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs} ${t.hoursShort || (language === 'ru' ? 'ч' : 'соат')}`);
    if (mins > 0 || hrs > 0) parts.push(`${mins} ${t.minutesShort || (language === 'ru' ? 'мин' : 'дақ')}`);
    parts.push(`${secs} ${t.secondsShort || (language === 'ru' ? 'сек' : 'сон')}`);
    return parts.join(' ');
  };

  const formatClock = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch {
      return '';
    }
  };

  // CSV Export with UTF-8 BOM for Microsoft Excel
  const handleExportCSV = () => {
    const headers = [
      '№',
      language === 'ru' ? 'Участник' : 'Иштирокчи',
      language === 'ru' ? 'Роль' : 'Роли',
      language === 'ru' ? 'Время в сессии' : 'Қатнашган вақти',
      language === 'ru' ? 'Время работы камеры' : 'Камера ёқиқ вақти',
      language === 'ru' ? 'Активность камеры (%)' : 'Камера фаоллиги (%)',
      language === 'ru' ? 'Время входа' : 'Кирган вақти',
      language === 'ru' ? 'Статус' : 'Ҳолати'
    ];

    const rows = attendees.map((att, index) => [
      index + 1,
      `"${(att.name || '').replace(/"/g, '""')}"`,
      att.isHost ? 'Host' : (language === 'ru' ? 'Участник' : 'Иштирокчи'),
      `"${formatTime(att.totalMeetingTimeMs)}"`,
      `"${formatTime(att.cameraOnTimeMs)}"`,
      `"${att.cameraPercentage || 0}%"`,
      `"${formatClock(att.firstJoinedAt)}"`,
      att.isOnline ? (language === 'ru' ? 'В сети' : 'Онлайн') : (language === 'ru' ? 'Вышел' : 'Чиққан')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `asfarma-report-${report.roomId || 'meeting'}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Telegram Formatted Summary
  const handleCopyTelegram = () => {
    const dateStr = formatDate(report.createdAt);
    const totalDurationStr = formatTime(totalDurationMs);

    let text = `📊 ASFАRMA ВИДЕОКОНФЕРЕНЦИЯ ҲИСОБОТИ\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 ${t.room}: ${report.roomId}\n`;
    text += `⏱ ${t.totalMeetingDuration}: ${totalDurationStr}\n`;
    text += `👥 ${t.totalParticipants}: ${attendees.length}\n`;
    text += `📹 ${t.avgCameraEngagement}: ${report.avgCameraPercentage || 0}%\n`;
    text += `🗓 Сана: ${dateStr}\n\n`;
    text += `📋 ИШТИРОКЧИЛАР ДАВОМАТИ ВА КАМЕРА ФАОЛЛИГИ:\n`;

    attendees.forEach((att, idx) => {
      const roleStr = att.isHost ? ' (Host)' : '';
      text += `${idx + 1}. ${att.name}${roleStr}\n`;
      text += `   ⏱ ${t.meetingTime}: ${formatTime(att.totalMeetingTimeMs)} | 📹 ${t.cameraTime}: ${formatTime(att.cameraOnTimeMs)} (${att.cameraPercentage || 0}%)\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Asfarma Pharmaceuticals © 2026`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedTelegram(true);
      setTimeout(() => setCopiedTelegram(false), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {t.sessionReportTitle}
                </h2>
                {isLivePreview && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/80 text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-orange-100 flex items-center gap-2 mt-0.5">
                <span>{t.room}: <strong>{report.roomId}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(report.createdAt)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Total Conference Duration */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                  {t.totalMeetingDuration}
                </div>
                <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
                  {formatTime(totalDurationMs)}
                </div>
              </div>
            </div>

            {/* 2. Total Participants */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                  {t.totalParticipants}
                </div>
                <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
                  {attendees.length} {language === 'ru' ? 'чел.' : 'нафар'}
                </div>
              </div>
            </div>

            {/* 3. Average Camera Engagement */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  {t.avgCameraEngagement}
                </div>
                <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
                  {report.avgCameraPercentage || 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Attendees Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                  {language === 'ru' ? 'Посещаемость и активность участников' : 'Иштирокчилар давомати ва камера фаоллиги'}
                </h3>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {attendees.length} {t.participantName.toLowerCase()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200 text-[11px]">
                    <th className="py-3 px-3 text-center w-10">№</th>
                    <th className="py-3 px-4">{t.participantName}</th>
                    <th className="py-3 px-4">{t.meetingTime}</th>
                    <th className="py-3 px-4">{t.cameraTime}</th>
                    <th className="py-3 px-4 min-w-[140px]">{t.engagement}</th>
                    <th className="py-3 px-4">{t.joinedAtTime}</th>
                    <th className="py-3 px-4 text-center">{t.statusText}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {attendees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400">
                        {language === 'ru' ? 'Данные отсутствуют' : 'Маълумотлар мавжуд эмас'}
                      </td>
                    </tr>
                  ) : (
                    attendees.map((att, idx) => {
                      const pct = att.cameraPercentage || 0;
                      const isHigh = pct >= 65;
                      const isMedium = pct >= 35 && pct < 65;

                      return (
                        <tr key={idx} className="hover:bg-orange-50/40 transition">
                          <td className="py-3 px-3 text-center font-bold text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{att.name}</span>
                              {att.isHost && (
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold text-[10px]">
                                  Host
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {formatTime(att.totalMeetingTimeMs)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-gray-800">
                              {att.cameraOnTimeMs > 0 ? (
                                <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <VideoOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              )}
                              <span>{formatTime(att.cameraOnTimeMs)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isHigh
                                      ? 'bg-emerald-500'
                                      : isMedium
                                      ? 'bg-amber-500'
                                      : 'bg-gray-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-10 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-medium">
                            {formatClock(att.firstJoinedAt)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {att.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t.activeOnline}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                {t.leftOffline}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm border border-gray-300 shadow-sm transition"
            >
              <Download className="w-4 h-4 text-orange-600" />
              <span>{t.exportCsv}</span>
            </button>

            <button
              onClick={handleCopyTelegram}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs sm:text-sm border border-orange-200 shadow-sm transition"
            >
              {copiedTelegram ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">{t.reportCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-orange-600" />
                  <span>{t.copyTelegramReport}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onLeaveToHome ? (
              <button
                onClick={onLeaveToHome}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition"
              >
                <HomeIcon className="w-4 h-4" />
                <span>{t.backToHome}</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs sm:text-sm shadow-sm transition"
              >
                {t.close}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
