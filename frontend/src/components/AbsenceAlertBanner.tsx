import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Calendar, AlertOctagon, User, Edit, Trash2 } from 'lucide-react';
import { AbsenceAlert } from '../hooks/useStompWebSocket';
import { EditAbsenceModal, AbsenceRecordItem } from './EditAbsenceModal';

interface AbsenceAlertBannerProps {
  alert: AbsenceAlert | null;
  onDismiss: () => void;
  currentUser?: any;
  token?: string;
  onAbsenceUpdated?: () => void;
}

export const AbsenceAlertBanner: React.FC<AbsenceAlertBannerProps> = ({
  alert,
  onDismiss,
  currentUser,
  token = '',
  onAbsenceUpdated
}) => {
  const { t } = useTranslation();
  const [cancelling, setCancelling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  if (!alert) return null;

  const isAdmin = currentUser?.role === 'ADMIN' || Boolean(currentUser?.isTemporaryAdmin);

  const handleCancelAbsence = async () => {
    if (!token) return;
    if (!window.confirm(`⚠️ Cancel this absence for ${alert.employeeName}?\n\nTheir status will be restored to PRESENT.`)) {
      return;
    }

    try {
      setCancelling(true);
      const res = await fetch('/api/admin/attendance/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId: (alert as any).recordId,
          employeeId: alert.employeeId,
          dates: alert.dates || [alert.absenceDate]
        })
      });

      if (res.ok) {
        onAbsenceUpdated?.();
        onDismiss();
      } else {
        const err = await res.json();
        window.alert(err.error || 'Failed to cancel absence');
      }
    } catch (e) {
      console.error(e);
      window.alert('Error cancelling absence');
    } finally {
      setCancelling(false);
    }
  };

  const recordForModal: AbsenceRecordItem = {
    id: (alert as any).recordId || 0,
    employeeId: alert.employeeId,
    employeeName: alert.employeeName,
    employeeCode: alert.employeeCode,
    attendanceDate: alert.absenceDate,
    status: 'ABSENT',
    absenceCategory: alert.category,
    reason: alert.reason
  };

  return (
    <>
      <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-b-2 border-rose-500 shadow-2xl text-white px-4 py-4 animate-in slide-in-from-top duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-600 rounded-full animate-bounce shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs uppercase tracking-widest font-extrabold bg-red-600 text-white px-2 py-0.5 rounded">
                    {t('realtimeAbsenceAlert')}
                  </span>
                  <span className="text-xs text-rose-300">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mt-1">
                  {alert.employeeName} ({alert.employeeCode}) — {t('absent')} [{alert.category}]
                  {alert.daysCount && alert.daysCount > 1 && (
                    <span className="ml-2 text-xs bg-red-800 text-rose-200 px-2 py-0.5 rounded-full border border-red-600">
                      {alert.daysCount} Days
                    </span>
                  )}
                </h3>

                <p className="text-sm text-rose-100 mt-0.5 italic">
                  "{alert.reason || 'No description provided'}" &bull; {t('absenceDate')}: {
                    alert.daysCount && alert.daysCount > 1
                      ? `${alert.startDate || alert.absenceDate} to ${alert.endDate || alert.absenceDate}`
                      : alert.absenceDate
                  }
                </p>

                {/* FR-AB-03: Operational Impact Analysis (Tasks Due Today) */}
                <div className="mt-3 bg-red-950/80 p-3 rounded-lg border border-red-700/60">
                  <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>{t('operationalImpact')}: {alert.tasksAtRisk.length} {t('tasksAtRisk')}</span>
                  </div>

                  {alert.tasksAtRisk.length === 0 ? (
                    <p className="text-xs text-rose-200">
                      No active tasks are scheduled for completion today by this team member.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                      {alert.tasksAtRisk.map((task) => (
                        <div key={task.id} className="bg-red-900/60 p-2 rounded border border-red-800 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{task.title}</div>
                            <div className="text-[10px] text-rose-200">Priority: {task.priority} ({task.severityWeight}x weight)</div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Administrator Quick Actions: Edit or Cancel Absence right from the banner */}
                {isAdmin && (
                  <div className="mt-3 flex items-center space-x-2 pt-2 border-t border-rose-800/80">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                      title="Edit absence details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Absence</span>
                    </button>
                    <button
                      onClick={handleCancelAbsence}
                      disabled={cancelling}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold flex items-center space-x-1.5 border border-rose-500 shadow-sm transition cursor-pointer"
                      title="Cancel absence and mark employee present"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{cancelling ? 'Cancelling...' : 'Cancel Absence (Mark Present)'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-red-800 text-rose-200 hover:text-white transition cursor-pointer"
              title="Dismiss Alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditAbsenceModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          record={recordForModal}
          token={token}
          onSaved={() => {
            onAbsenceUpdated?.();
            onDismiss();
          }}
        />
      )}
    </>
  );
};
