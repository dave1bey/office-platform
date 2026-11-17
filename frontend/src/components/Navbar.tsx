import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Globe, Shield, User, Smartphone, Clock, RefreshCw, ChevronDown, KeyRound, Menu } from 'lucide-react';
import { MobileInstallModal } from './MobileInstallModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { OfficeActionLogo } from './OfficeActionLogo';

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
  const [showMobileLangMenu, setShowMobileLangMenu] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);

  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sessionMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowMobileLangMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowMobileUserMenu(false);
      }
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(event.target as Node)) {
        setShowSessionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('user_language', lang);
    setShowMobileLangMenu(false);
  };

  const currentLang = i18n.language || 'en';

  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'am', label: 'አማ', name: 'አማርኛ (Amharic)' },
    { code: 'ti', label: 'ትግ', name: 'ትግርኛ (Tigrinya)' },
    { code: 'om', label: 'OM', name: 'Afaan Oromoo' },
  ];

  const currentLangObj = languages.find(l => l.code === currentLang) || languages[0];

  const formatSessionTime = (seconds: number) => {
    if (sessionTimeoutMinutes === 0) return 'Active';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const formatSessionTimeCompact = (seconds: number) => {
    if (sessionTimeoutMinutes === 0) return 'Active';
    const m = Math.floor(seconds / 60);
    if (m >= 60) {
      return `${Math.floor(m / 60)}h`;
    }
    return `${m}m`;
  };

  return (
    <>
    <header className="bg-white/95 backdrop-blur border-b border-blue-200/80 sticky top-0 z-50 shadow-sm w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
            <OfficeActionLogo size={34} className="sm:w-9 sm:h-9" />
            <div className="min-w-0">
              <span className="text-sm sm:text-lg font-black text-slate-900 tracking-tight block truncate">
                <span className="sm:hidden">{t('shortAppName') || 'Office Action'}</span>
                <span className="hidden sm:inline">{t('appName')}</span>
              </span>
              <span className="text-xs text-slate-500 hidden sm:block font-medium truncate">
                {t('tagline')}
              </span>
            </div>
          </div>

          {/* Right section: Mobile & Desktop Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            
            {/* Install Mobile App Button (Desktop) */}
            <button
              onClick={() => setShowMobileModal(true)}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer shadow-sm"
              title="Install Mobile App on Android & iOS"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>📱 Mobile App</span>
            </button>

            {/* Real-time status pill (Desktop only) */}
            <div className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              connected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{connected ? 'Live' : 'Connecting'}</span>
            </div>

            {/* Language Switcher - Desktop (Full 4-button bar) */}
            <div className="hidden sm:flex items-center bg-blue-50/80 p-0.5 sm:p-1 rounded-lg border border-blue-200">
              <Globe className="w-3.5 h-3.5 text-blue-600 ml-1 mr-1" />
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
                    currentLang === lang.code ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
                  }`}
                  title={lang.name}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Language Switcher - Mobile (Compact dropdown button) */}
            <div className="relative sm:hidden" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setShowMobileLangMenu(!showMobileLangMenu)}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition"
                title="Select Language"
              >
                <Globe className="w-3 h-3 text-blue-600" />
                <span>{currentLangObj.label}</span>
                <ChevronDown className="w-2.5 h-2.5 text-blue-500" />
              </button>

              {showMobileLangMenu && (
                <div className="absolute right-0 mt-1.5 w-36 bg-white border border-blue-100 rounded-xl p-1.5 shadow-xl z-50 space-y-1 animate-in fade-in zoom-in-95">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg font-bold transition text-left ${
                        currentLang === lang.code
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      <span>{lang.name}</span>
                      <span className="text-[10px] opacity-75">{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time Session Pill with Settings Dropdown (Responsive) */}
            <div className="relative" ref={sessionMenuRef}>
              <button
                type="button"
                onClick={() => setShowSessionMenu(!showSessionMenu)}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  sessionRemainingSeconds < 120
                    ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-blue-50/70 text-slate-700 hover:text-blue-700 border-blue-200'
                }`}
                title="Security Session Timeout Status (Click to adjust)"
              >
                <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${sessionRemainingSeconds < 120 ? 'text-amber-600' : 'text-blue-600'}`} />
                <span className="font-mono text-[11px] sm:text-xs">
                  <span className="sm:hidden">{formatSessionTimeCompact(sessionRemainingSeconds)}</span>
                  <span className="hidden sm:inline">{formatSessionTime(sessionRemainingSeconds)}</span>
                </span>
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
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

            {/* Desktop User Profile + Password + Logout */}
            <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-blue-100">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-800 flex items-center justify-end space-x-1.5">
                  <span className="max-w-[120px] truncate">{user?.fullName}</span>
                  {user?.isTemporaryAdmin && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm animate-pulse">
                      ⚡ Acting Admin
                    </span>
                  )}
                </div>
                <div className="text-xs uppercase font-semibold tracking-wider">
                  {user?.isTemporaryAdmin ? (
                    <span className="text-amber-700 font-mono text-[10px]">
                      Expires: {user.temporaryAdminUntil ? new Date(user.temporaryAdminUntil).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                    </span>
                  ) : (
                    <span className="text-blue-600 font-bold">{user?.role}</span>
                  )}
                </div>
              </div>

              {/* Change Password Button */}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-slate-700 hover:text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer font-medium text-xs shadow-sm"
                title="Change Account Password"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Password</span>
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-blue-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-blue-100 transition cursor-pointer"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Actions Hamburger/Profile Menu (< sm) */}
            <div className="relative sm:hidden" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
                className="flex items-center justify-center p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 transition"
                title="Account Menu"
              >
                <Menu className="w-4 h-4 text-blue-700" />
              </button>

              {showMobileUserMenu && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-blue-100 rounded-xl p-3 shadow-xl z-50 space-y-2.5 animate-in fade-in zoom-in-95">
                  {/* User info */}
                  <div className="border-b border-blue-100 pb-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                    <p className="text-[10px] text-blue-600 font-semibold">{user?.role}</p>
                    {user?.isTemporaryAdmin && (
                      <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        ⚡ Acting Admin
                      </span>
                    )}
                  </div>

                  {/* Mobile Actions */}
                  <div className="space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileUserMenu(false);
                        setShowPasswordModal(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-blue-50 font-medium transition text-left"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileUserMenu(false);
                        setShowMobileModal(true);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-blue-700 hover:bg-blue-50 font-medium transition text-left"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Install Mobile App</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition text-left pt-1 border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              )}
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
      token={token || localStorage.getItem('auth_token') || localStorage.getItem('token') || user?.token || ''}
      user={user}
    />
    </>
  );
};
