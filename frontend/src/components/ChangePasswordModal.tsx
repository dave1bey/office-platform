import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck, User } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  user?: any;
  targetEmployee?: any; // For admin resetting employee password
  initialIdentifier?: string; // For login screen prefill
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  token,
  user,
  targetEmployee,
  initialIdentifier = ''
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier || user?.employeeCode || user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [useCodeVerify, setUseCodeVerify] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdminResettingStaff = Boolean(targetEmployee && token);
  const isDirectLoginMode = Boolean(!token && !targetEmployee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isDirectLoginMode && !identifier.trim()) {
      setError("Please enter your username, email, or employee code.");
      return;
    }

    if (isDirectLoginMode) {
      if (useCodeVerify) {
        if (!verifyCode.trim()) {
          setError("Please enter your Employee ID Code to verify your identity.");
          return;
        }
      } else {
        if (!currentPassword.trim()) {
          setError("Please enter your current password, or toggle to verify with Employee ID Code.");
          return;
        }
      }
    } else if (!isAdminResettingStaff && !currentPassword.trim()) {
      setError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 4) {
      setError("New password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      let url = '/api/auth/change-password';
      let payload: any = { currentPassword, newPassword };
      const headers: any = { 'Content-Type': 'application/json' };

      if (isAdminResettingStaff) {
        url = `/api/admin/employees/${targetEmployee.id}/reset-password`;
        payload = { newPassword };
        headers['Authorization'] = `Bearer ${token}`;
      } else if (isDirectLoginMode) {
        url = '/api/auth/reset-password';
        payload = {
          identifier: identifier.trim(),
          currentPassword: currentPassword.trim(),
          verifyCode: verifyCode.trim(),
          newPassword
        };
      } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Password updated successfully!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 1800);
      } else {
        setError(data.error || "Failed to update password.");
      }
    } catch (err: any) {
      setError(err.message || "Network error updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAdminResettingStaff ? `Reset Password for ${targetEmployee.fullName}` : "Change Account Password"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAdminResettingStaff
                  ? `${targetEmployee.fullName} (${targetEmployee.employeeCode})`
                  : user
                    ? `${user.fullName} (${user.employeeCode || user.role})`
                    : "Self-Service Security Update for All Staff"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Direct Login Mode: Identifier Input */}
          {isDirectLoginMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Username, Email, or Employee Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. hagos, abebe, admin, or EMP-003"
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg py-2 pl-3 pr-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                />
              </div>
            </div>
          )}

          {/* Verification: Current Password OR Employee Code if forgotten */}
          {!isAdminResettingStaff && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {useCodeVerify ? "Verify with Employee ID Code" : "Current Password"}
                </label>
                {isDirectLoginMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseCodeVerify(!useCodeVerify);
                      setError(null);
                    }}
                    className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    {useCodeVerify ? "Use Current Password instead" : "Forgot Current Password?"}
                  </button>
                )}
              </div>

              {useCodeVerify ? (
                <div>
                  <input
                    type="text"
                    required
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="e.g. EMP-003 or your email"
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter your assigned Employee Code to securely verify and reset your password.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 4 characters"
                className="w-full bg-slate-50 border border-blue-200 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full bg-slate-50 border border-blue-200 rounded-lg py-2 pl-3 pr-10 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-lg text-[11px] text-blue-800 leading-relaxed font-medium">
            🔒 Initial default passwords for seeded accounts are <span className="font-mono font-bold">password123</span>. Any employee or admin can change their password at any time.
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-600/30 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
