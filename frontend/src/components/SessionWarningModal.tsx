import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogoutNow
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-2 border-amber-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-center">
        
        {/* Pulsing Warning Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-lg shadow-amber-500/20 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Session Expiring Soon!
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            You have been inactive. For office security, your session will automatically close in:
          </p>
        </div>

        {/* Live Countdown Circle */}
        <div className="py-2">
          <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-mono text-2xl font-black shadow-inner">
            <Clock className="w-6 h-6 text-amber-600 animate-spin" />
            <span>00:{String(remainingSeconds).padStart(2, '0')}</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 italic">
          Click below to continue working or you will be safely logged out.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In</span>
          </button>
          <button
            type="button"
            onClick={onLogoutNow}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out Now</span>
          </button>
        </div>

      </div>
    </div>
  );
};

