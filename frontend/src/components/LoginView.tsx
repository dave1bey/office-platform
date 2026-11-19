import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Mail, Shield, Eye, EyeOff, AlertCircle, Info, ChevronDown, ChevronUp, UserCheck, Smartphone, Clock, KeyRound } from 'lucide-react';
import { MobileInstallModal } from './MobileInstallModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { OfficeActionLogo } from './OfficeActionLogo';

interface LoginViewProps {
  onLoginSuccess: (data: any) => void;
  deferredPrompt?: any;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, deferredPrompt }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDirectoryHelp, setShowDirectoryHelp] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<boolean>(() => {
    return localStorage.getItem('session_expired_notice') === 'true';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both your corporate email / ID and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.token && data.role) {
          onLoginSuccess(data);
        } else {
          setError(data?.error || "Authentication failed. Invalid server response.");
        }
      } else {
        let errText = "Invalid email or password.";
        try {
          const errJson = await res.json();
          if (errJson.error) errText = errJson.error;
        } catch {
          const text = await res.text();
          if (text) errText = text;
        }
        setError(errText);
      }
    } catch (err: any) {
      setError("Network or connection error. Please verify the backend service is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-blue-100 rounded-2xl p-8 shadow-xl shadow-blue-500/10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <OfficeActionLogo size={56} className="shadow-lg shadow-blue-500/25" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('appName')}</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">{t('tagline')}</p>
          <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Shield className="w-3 h-3 text-blue-600" />
            <span>Enterprise Access Control</span>
          </div>
        </div>

        {/* Session Inactivity Timeout Alert */}
        {sessionExpiredNotice && !error && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl font-medium flex items-start space-x-2.5 animate-in fade-in shadow-sm">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-amber-950">Security Session Expired</span>
              You were automatically signed out after 10 minutes of inactivity to protect your account. Please sign in again.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Login Form: Strict credential entry */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username, Corporate Email or Employee Code
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. hagos, hagos@office.lan, or EMP-003"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-blue-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 transition"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Employees can sign in with their username (e.g. hagos), corporate email, or Employee ID code.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your confidential password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-blue-200 rounded-lg pl-9 pr-10 py-2 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-[10px] text-slate-400">Default: password123</span>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1 cursor-pointer transition py-0.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                <span>Change / Reset Password</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : "Sign In to My Account"}</span>
          </button>
        </form>

        {/* Collapsible Corporate Credentials Guide */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowDirectoryHelp(!showDirectoryHelp)}
            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-blue-700 font-semibold p-1.5 rounded-lg hover:bg-blue-50 transition cursor-pointer"
          >
            <div className="flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Need help? Corporate Staff Account Directory</span>
            </div>
            {showDirectoryHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDirectoryHelp && (
            <div className="mt-3 p-3 bg-slate-50 border border-blue-100 rounded-xl text-xs space-y-2 animate-in fade-in">
              <div className="text-[11px] font-bold text-slate-700">
                Staff Corporate Credentials Reference:
              </div>
              <p className="text-[11px] text-slate-500">
                Initial password for all seeded accounts is <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono font-bold text-blue-700">password123</code>. Employees must type their own email or code to enter.
              </p>
              <div className="space-y-1.5 pt-1 text-[11px] text-slate-600">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="font-semibold text-blue-900">Admin User (Administrator):</span>
                  <span className="font-mono text-slate-500">admin@office.lan (EMP-001)</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-800">Abebe Bikila:</span>
                  <span className="font-mono text-slate-500">abebe@office.lan (EMP-002)</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-800">Hagos Berhe:</span>
                  <span className="font-mono text-slate-500">hagos@office.lan (EMP-003)</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="font-semibold text-slate-800">Tolassa Chala:</span>
                  <span className="font-mono text-slate-500">tolassa@office.lan (EMP-004)</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="font-semibold text-slate-800">Sara Tesfaye:</span>
                  <span className="font-mono text-slate-500">sara@office.lan (EMP-005)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile App Install Pill */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowMobileModal(true)}
            className="inline-flex items-center space-x-1.5 text-xs text-blue-700 hover:text-blue-900 font-bold bg-blue-50/80 hover:bg-blue-100 px-3.5 py-1.5 rounded-full border border-blue-200 transition cursor-pointer shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Install on Android Phone or iPhone (iOS)</span>
          </button>
        </div>

      </div>

      <MobileInstallModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
        deferredPrompt={deferredPrompt}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        initialIdentifier={email}
      />
    </div>
  );
};
