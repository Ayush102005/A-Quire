import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connectNotifications } from '../services/api';
import { X, Mail, Lightbulb, AlertTriangle, Sparkles } from 'lucide-react';

const TOAST_CONFIG = {
  message: {
    Icon: Mail,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  hint: {
    Icon: Lightbulb,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50',
    border: 'border-teal-100',
  },
  alert: {
    Icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    border: 'border-amber-100',
  },
};

export default function GlobalToaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const ws = connectNotifications(token, (msg) => {
      if (msg.type === 'message' || msg.type === 'hint' || msg.type === 'alert') {
        const id = Date.now().toString() + Math.random().toString();
        setToasts(prev => [...prev, { id, ...msg, visible: true }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000); // Auto-dismiss after 5s
      }
    });

    return () => {
      try { ws.close(); } catch (e) {}
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-xs sm:max-w-sm" aria-live="polite" aria-label="Notifications">
      {toasts.map(toast => {
        const cfg = TOAST_CONFIG[toast.type] ?? TOAST_CONFIG.alert;
        const { Icon, iconColor, iconBg, border } = cfg;

        let text = toast.text || toast.hint_text || '';
        let action = null;
        if (text.includes('\nLink: ')) {
          const parts = text.split('\nLink: ');
          text = parts[0];
          const linkStr = parts[1].trim();
          action = linkStr.startsWith('/') ? linkStr : (linkStr.startsWith('http') ? linkStr : `https://${linkStr}`);
        }

        const isHint = toast.type === 'hint';

        return (
          <div
            key={toast.id}
            className={`w-80 bg-[var(--card-bg)] border shadow-2xl rounded-2xl p-4 flex gap-3 animate-toast-up relative overflow-hidden ${border}`}
            role="alert"
          >
            {/* Hint glow accent */}
            {isHint && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-300 opacity-80" />
            )}

            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <h4 className="text-sm font-bold text-[var(--text)] leading-tight mb-1 truncate">
                {toast.title || (isHint ? '✨ New AI Mentor Hint' : 'New Notification')}
              </h4>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 whitespace-pre-wrap leading-relaxed">
                {text}
              </p>
              {action && (
                <Link
                  to={action}
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline transition-colors focus-visible:outline-none"
                >
                  Join Meeting →
                </Link>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="absolute top-3 right-3 text-[var(--text-faint)] hover:text-[var(--text-muted)] p-1 hover:bg-[var(--surface-2)] rounded-lg transition-colors press-scale"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
