import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Globe, Activity, Shield, User, Smartphone, Clock, RefreshCw, ChevronDown, KeyRound } from 'lucide-react';
import { MobileInstallModal } from './MobileInstallModal';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavbarProps {
  user: any;
  token?: string;
  onLogout: () => void;
  connected: boolean;
  deferredPrompt?: any;
  sessionRemainingSeconds?: number;
  sessionTimeoutMinutes?: number;
  onChangeSessionTimeout?: (minutes: number) => void;
  onExtendSession?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  token,
  onLogout,
  connected,
  deferredPrompt,
  sessionRemainingSeconds = 600,
  sessionTimeoutMinutes = 10,
  onChangeSessionTimeout,
  onExtendSession
}) => {
  const { t, i18n } = useTranslation();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('user_language', lang);
  };

  const currentLang = i18n.language || 'en';

  const formatSessionTime = (seconds: number) => {
    if (sessionTimeoutMinutes === 0) return 'Session: Active';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <>
    <header className="bg-white/95 backdrop-blur border-b border-blue-200/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/25">
              OP
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block">
                {t('appName')}
              </span>
              <span className="text-xs text-slate-500 hidden sm:block font-medium">
                {t('tagline')}
              </span>
            </div>
          </div>

          {/* Right section: Language switcher + WebSocket status + User profile */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Install Mobile App Button */}
            <button
              onClick={() => setShowMobileModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer shadow-sm"
              title="Install Mobile App on Android & iOS"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">📱 Mobile App</span>
            </button>

            {/* Real-time status pill */}
            <div className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              connected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{connected ? 'Live STOMP' : 'Connecting'}</span>
            </div>

            {/* Persistent 1-click Language Switcher Header (EN, AM, TI, OM) */}
            <div className="flex items-center bg-blue-50/80 p-1 rounded-lg border border-blue-200">
              <Globe className="w-3.5 h-3.5 text-blue-600 ml-1.5 mr-1" />
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
                  currentLang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('am')}
                className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
                  currentLang === 'am' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="አማርኛ (Amharic)"
              >
                አማ
              </button>
              <button
                onClick={() => changeLanguage('ti')}
                className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
                  currentLang === 'ti' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="ትግርኛ (Tigrinya)"
              >
                ትግ
              </button>
              <button
                onClick={() => changeLanguage('om')}
                className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
                  currentLang === 'om' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="Afaan Oromoo"
              >
                OM
              </button>
            </div>

            {/* Time Session Pill with Settings Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSessionMenu(!showSessionMenu)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  sessionRemainingSeconds < 120
                    ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-blue-50/70 text-slate-700 hover:text-blue-700 border-blue-200'
                }`}
                title="Security Session Timeout Status (Click to adjust)"
              >
                <Clock className={`w-3.5 h-3.5 ${sessionRemainingSeconds < 120 ? 'text-amber-600' : 'text-blue-600'}`} />
                <span className="font-mono">{formatSessionTime(sessionRemainingSeconds)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showSessionMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-blue-100 rounded-xl p-4 shadow-xl z-50 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span>Security Session Timeout</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {formatSessionTime(sessionRemainingSeconds)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Automatically logs you out if inactive to protect your data from unauthorized access.
                  </p>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Timeout Duration:
                    </span>
                    <div className="grid grid-cols-4 gap-1 pt-1 text-xs">
                      {[5, 10, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            onChangeSessionTimeout?.(mins);
                            setShowSessionMenu(false);
                          }}
                          className={`py-1 rounded text-center font-bold text-[11px] transition cursor-pointer border ${
                            sessionTimeoutMinutes === mins
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-blue-50 border-slate-200'
                          }`}
                        >
                          {mins === 60 ? '1h' : `${mins}m`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        onExtendSession?.();
                        setShowSessionMenu(false);
                      }}
                      className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-blue-600" />
                      <span>Extend Session (Reset Timer)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Role */}
            <div className="flex items-center space-x-2 pl-2 border-l border-blue-100">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800 flex items-center justify-end space-x-1.5">
                  <span>{user.fullName}</span>
                  {user.isTemporaryAdmin && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm animate-pulse">
                      ⚡ Acting Admin
                    </span>
                  )}
                </div>
                <div className="text-xs uppercase font-semibold tracking-wider">
                  {user.isTemporaryAdmin ? (
                    <span className="text-amber-700 font-mono text-[10px]">
                      Expires: {user.temporaryAdminUntil ? new Date(user.temporaryAdminUntil).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                    </span>
                  ) : (
                    <span className="text-blue-600 font-bold">{user.role}</span>
                  )}
                </div>
              </div>

              {/* Change Password Button */}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 rounded-lg bg-blue-50 text-slate-600 hover:text-blue-700 hover:bg-blue-100 border border-blue-100 transition cursor-pointer"
                title="Change Account Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-blue-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-blue-100 transition cursor-pointer"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>

    <MobileInstallModal
      isOpen={showMobileModal}
      onClose={() => setShowMobileModal(false)}
      deferredPrompt={deferredPrompt}
    />

    <ChangePasswordModal
      isOpen={showPasswordModal}
      onClose={() => setShowPasswordModal(false)}
      token={token || localStorage.getItem('token') || ''}
      user={user}
    />
    </>
  );
};
