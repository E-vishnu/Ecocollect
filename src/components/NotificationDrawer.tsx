import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Sparkles, X, Check } from 'lucide-react';
import { AppNotification } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onSelectPickup?: (pickupId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkRead,
  onSelectPickup
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{t('notificationDrawer.title', 'Activity Notifications')}</h3>
              <span className="text-[11px] text-slate-500">
                {notifications.filter(n => !n.read).length} {t('notificationDrawer.unreadUpdates', 'unread updates')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              {t('notificationDrawer.noNotifications', 'No notifications yet.')}
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkRead(notif.id);
                    if (notif.pickupId && onSelectPickup) {
                      onSelectPickup(notif.pickupId);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {notif.type === 'reward' ? (
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      ) : notif.type === 'warning' ? (
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      ) : notif.type === 'success' ? (
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.pickupId && (
                        <span className="inline-block mt-2 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          {t('notificationDrawer.viewPickup', 'View Pickup')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
