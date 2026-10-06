import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export function ChatPanel({ messages, onSendMessage, onClose, currentUserId }) {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="w-full sm:w-80 md:w-96 h-full bg-white border-l border-gray-200 flex flex-col z-40 shadow-2xl absolute sm:relative right-0 top-0 bottom-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          <h2 className="font-bold text-gray-900 text-sm">{t.chatHeading}</h2>
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

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbfbfb]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-xs">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-orange-400" />
            <p className="font-medium text-gray-500">{t.noMessages}</p>
            <p className="text-[11px] text-gray-400 mt-1">{t.noMessagesSub}</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-[11px] font-medium text-gray-500 border border-gray-200">
                    {msg.text} • {msg.timestamp}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderSocketId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isMe ? t.you.replace(/[()]/g, '') : msg.sender}
                  </span>
                  <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-orange-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-300 focus-within:border-orange-500 transition">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.chatPlaceholder}
            className="flex-1 bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
