import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, AlertCircle, X, Check, Trash2, Clock, User } from 'lucide-react';

export interface AbsenceRecordItem {
  id: number;
  employeeId: number;
  employeeName?: string;
  employeeCode?: string;
  attendanceDate: string;
  status: string;
  absenceCategory?: string;
  reason?: string;
  filedBy?: string;
  filedAt?: string;
}

interface EditAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AbsenceRecordItem | null;
  employees?: Array<{ id: number; fullName: string; employeeCode: string }>;
  token: string;
  onSaved: () => void;
}

export const EditAbsenceModal: React.FC<EditAbsenceModalProps> = ({
  isOpen,
  onClose,
  record,
  employees = [],
  token,
  onSaved
}) => {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('MEDICAL');
  const [reason, setReason] = useState('');
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setDate(record.attendanceDate || new Date().toISOString().split('T')[0]);
      setCategory(record.absenceCategory || 'MEDICAL');
      setReason(record.reason || '');
      setEmployeeId(record.employeeId);
      setError(null);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Please select a valid absence date.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/attendance/absence/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attendanceDate: date,
          absenceCategory: category,
          reason,
          employeeId: employeeId || record.employeeId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update absence');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating absence record.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAbsence = async () => {
    if (!window.confirm(`⚠️ Are you sure you want to cancel the absence on ${record.attendanceDate}? The employee will be marked as PRESENT.`)) {
      return;
    }

    try {
      setCancelling(true);
      setError(null);

      const res = await fetch(`/api/admin/attendance/absence/${record.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel absence');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error cancelling absence record.');
    } finally {
      setCancelling(false);
    }
  };

  const currentEmpName = record.employeeName || employees.find(e => e.id === record.employeeId)?.fullName || 'Staff Member';
  const currentEmpCode = record.employeeCode || employees.find(e => e.id === record.employeeId)?.employeeCode || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-700 to-red-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-5 h-5 text-rose-100" />
            </div>
            <div>
              <h3 className="text-base font-bold">Edit Absence Record</h3>
              <p className="text-xs text-rose-100">
                {currentEmpName} {currentEmpCode ? `(${currentEmpCode})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Assigned Staff Member */}
          {employees.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Staff Member:
              </label>
              <select
                value={employeeId || record.employeeId}
                onChange={(e) => setEmployeeId(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Absence Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Absence Date:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Absence Category:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
            >
              <option value="MEDICAL">Medical / Sick Leave (ሕመም / የሕክምና)</option>
              <option value="EMERGENCY">Family Emergency (ድንገተኛ የቤተሰብ ጉዳይ)</option>
              <option value="OFFSITE">Offsite Duty (የውጭ ሥራ / ተልዕኮ)</option>
              <option value="OTHER">Other / Personal Leave (ሌላ)</option>
            </select>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason / Notes:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter explanation or reason for absence..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Filed By metadata */}
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Original record: {record.filedBy || 'Self-Reported'}</span>
            <span>{record.filedAt ? new Date(record.filedAt).toLocaleDateString() : ''}</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            {/* Cancel Absence Button */}
            <button
              type="button"
              onClick={handleCancelAbsence}
              disabled={cancelling || saving}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-300 font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              title="Delete this absence record and mark employee as Present"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{cancelling ? 'Cancelling...' : 'Cancel Absence (Mark Present)'}</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving || cancelling}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
