import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, LogOut, AlertCircle, Send, Check, Calendar } from 'lucide-react';
import { MultiDayPicker, MultiDaySelection } from './MultiDayPicker';

interface MobileAttendanceCardProps {
  token: string;
  currentUser: any;
  onAttendanceChanged: () => void;
}

export const MobileAttendanceCard: React.FC<MobileAttendanceCardProps> = ({ token, currentUser, onAttendanceChanged }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedDates, setSelectedDates] = useState<string[]>([today]);
  const [daysCount, setDaysCount] = useState(1);
  const [category, setCategory] = useState('MEDICAL');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getDaysCount = () => daysCount;

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Check-in successful! Status marked as Present.");
        onAttendanceChanged();
      } else {
        setMessage("Could not record check-in.");
      }
    } catch (e) {
      setMessage("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Check-out recorded.");
        onAttendanceChanged();
      }
    } catch (e) {
      setMessage("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/absence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: currentUser?.userId,
          employeeName: currentUser?.fullName,
          startDate,
          endDate,
          dates: selectedDates,
          category,
          reason
        })
      });

      if (res.ok) {
        setShowAbsenceModal(false);
        setReason('');
        setMessage("Absence notice dispatched to Admin console via real-time WebSocket!");
        onAttendanceChanged();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">{t('attendance')}</h3>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Assumed Present (Default)</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Staff are automatically counted present. Only file a notice below if you will be absent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAbsenceModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition cursor-pointer"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{t('reportAbsence')}</span>
          </button>

          <button
            onClick={handleCheckOut}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>{t('checkOut')}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 font-medium">
          {message}
        </div>
      )}

      {/* Absence Filing Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t('reportAbsence')}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Submission triggers sub-200ms instantaneous STOMP alert & impact analysis on administrative consoles.
            </p>

            <form onSubmit={handleSubmitAbsence} className="space-y-4">
              <MultiDayPicker
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialDates={selectedDates}
                onChange={(sel: MultiDaySelection) => {
                  setStartDate(sel.startDate);
                  setEndDate(sel.endDate);
                  setSelectedDates(sel.dates);
                  setDaysCount(sel.daysCount);
                }}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('category')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="MEDICAL">{t('medical')}</option>
                  <option value="EMERGENCY">{t('emergency')}</option>
                  <option value="OFFSITE">{t('offsite')}</option>
                  <option value="OTHER">{t('other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('reason')}</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Supporting Ge'ez (አማርኛ, ትግርኛ) and Qubee diacritics..."
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm shadow-rose-600/30 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? "Broadcasting..." : t('submitNotice')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
