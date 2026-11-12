import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Clock, CheckCircle2, AlertTriangle, FileText, User } from 'lucide-react';
import { LiveFeedItem } from '../hooks/useStompWebSocket';

interface LiveActivityFeedProps {
  feed: LiveFeedItem[];
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ feed }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center space-x-2.5 pb-4 border-b border-blue-100 mb-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{t('liveFeed')}</h3>
          <p className="text-[11px] text-slate-500 font-medium">Real-time STOMP event stream</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-96">
        {feed.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            Waiting for live events... Check-ins, absence notices, and task updates appear here in real time.
          </div>
        ) : (
          feed.map((item) => {
            const isAbsence = item.eventType === 'ABSENCE';
            const isCheckIn = item.eventType === 'CHECK_IN';
            const isTask = item.eventType === 'TASK_UPDATE' || item.eventType === 'TASK_ASSIGNED';

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border text-xs transition animate-in slide-in-from-right duration-200 ${
                  isAbsence
                    ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                    : isCheckIn
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-blue-50/60 border-blue-100 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 flex items-center space-x-1">
                    {isAbsence && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                    {isCheckIn && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {isTask && <FileText className="w-3.5 h-3.5 text-blue-600" />}
                    <span>{item.title}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.message}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
