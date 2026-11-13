import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Clock,
  Send,
  X,
  Target,
  BarChart3,
  ShieldCheck,
  Check
} from 'lucide-react';
import { MultiDayPicker, MultiDaySelection } from './MultiDayPicker';

interface PerformanceData {
  employee: {
    employeeId: number;
    employeeCode: string;
    fullName: string;
    teamName: string;
    period: string;
    totalTasks: number;
    completedTasks: number;
    totalWeight: number;
    completedWeight: number;
    unweightedTaskRate: number;
    weightedTaskRate: number;
    recordedAbsentDays: number;
    totalWorkingDays: number;
    absenceRate: number;
    overallScore: number;
    todayAttendanceStatus: string;
  };
  department: {
    teamName: string;
    totalTasks: number;
    completedTasks: number;
    totalWeight: number;
    completedWeight: number;
    weightedRate: number;
    unweightedRate: number;
  };
  absences: Array<{
    id: number;
    attendanceDate: string;
    status: string;
    absenceCategory?: string;
    reason?: string;
  }>;
  period: string;
}

interface EmployeePerformanceViewProps {
  token: string;
  currentUser: any;
  refreshTrigger: number;
  onAbsenceReported: () => void;
}

export const EmployeePerformanceView: React.FC<EmployeePerformanceViewProps> = ({
  token,
  currentUser,
  refreshTrigger,
  onAbsenceReported
}) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Absence Reporting Modal State (Supports Single & Multi-Day Date Ranges)
  const today = new Date().toISOString().split('T')[0];
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedDates, setSelectedDates] = useState<string[]>([today]);
  const [daysCount, setDaysCount] = useState(1);
  const [category, setCategory] = useState('MEDICAL');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const getDaysCount = () => daysCount;

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/my-performance?period=${period.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch performance data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [refreshTrigger, period]);

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
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
        setStatusMessage(`Absence successfully reported for ${getDaysCount()} day(s). Logged in real time.`);
        onAbsenceReported();
        fetchPerformance();
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        alert("Failed to report absence.");
      }
    } catch (e) {
      console.error(e);
      alert("Error reporting absence.");
    } finally {
      setSubmitting(false);
    }
  };

  const emp = data?.employee;
  const dept = data?.department;
  const rate = emp?.weightedTaskRate ?? 0;
  const isHighPerformer = rate >= 80;
  const isModerate = rate >= 50 && rate < 80;

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm space-y-6">
      
      {/* Header with Title and Period Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-blue-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              My Task Accomplishment & Performance
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Track your personal deliverable accomplishment rate, severity-weighted points, and report absences.
          </p>
        </div>

        {/* Period Selector Tabs: Day, Week, Month, Year, All */}
        <div className="flex items-center bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs self-start md:self-auto font-semibold">
          {(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                period === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              {p === 'DAY' ? 'Today' : p === 'WEEK' ? 'This Week' : p === 'MONTH' ? 'This Month' : p === 'YEAR' ? 'This Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center space-x-2 font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading your accomplishment stats...</div>
      ) : (
        <div className="space-y-6">
          
          {/* Main Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: My Task Accomplishment Rate */}
            <div className={`p-5 rounded-xl border relative overflow-hidden shadow-sm ${
              isHighPerformer
                ? 'bg-gradient-to-br from-emerald-50/60 to-white border-emerald-200'
                : isModerate
                ? 'bg-gradient-to-br from-blue-50/60 to-white border-blue-200'
                : 'bg-gradient-to-br from-amber-50/60 to-white border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span>My Accomplishment Rate</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                  {period}
                </span>
              </div>

              <div className="flex items-baseline space-x-2 my-2">
                <span className={`text-4xl font-black tracking-tight ${
                  isHighPerformer ? 'text-emerald-600' : isModerate ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {rate}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Weighted Score</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 my-3 overflow-hidden border border-slate-200/60">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ${
                    isHighPerformer
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : isModerate
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                <span>Delivered Points:</span>
                <span className="font-bold text-slate-900">
                  {emp?.completedWeight || 0} / {emp?.totalWeight || 0} pts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>Completed Tasks:</span>
                <span className="font-semibold text-slate-800">
                  {emp?.completedTasks || 0} / {emp?.totalTasks || 0} tasks
                </span>
              </div>
            </div>

            {/* Card 2: Department Benchmark */}
            <div className="bg-white border border-indigo-100 p-5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>{dept?.teamName || 'Department'} Benchmark</span>
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 my-2">
                  <span className="text-3xl font-black text-indigo-700">
                    {dept?.weightedRate ?? 0}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Dept Average</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mt-2 font-medium">
                  Overall collective performance across all deliverables in your department for the selected period.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Dept Deliverables:</span>
                  <span className="font-bold text-slate-800">
                    {dept?.completedTasks ?? 0} / {dept?.totalTasks ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Dept Points:</span>
                  <span className="font-bold text-slate-800">
                    {dept?.completedWeight ?? 0} / {dept?.totalWeight ?? 0} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Attendance & Report Absence Action */}
            <div className="bg-white border border-blue-100 p-5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Attendance & Absence</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{emp?.todayAttendanceStatus || 'PRESENT'}</span>
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 my-2">
                  <span className="text-3xl font-black text-slate-900">
                    {emp?.recordedAbsentDays || 0}
                  </span>
                  <span className="text-xs text-slate-500">Days Absent ({period})</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mt-1 font-medium">
                  Absence records are factored into reliability score (currently {Math.max(0, 100 - (emp?.absenceRate || 0))}%).
                </p>
              </div>

              {/* Prominent Report Absence Button */}
              <button
                onClick={() => setShowAbsenceModal(true)}
                className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Report My Absence</span>
              </button>
            </div>

          </div>

          {/* Absence History Section */}
          <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>My Filed Absence Records</span>
              </h3>
              <button
                onClick={() => setShowAbsenceModal(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
              >
                + File Notice
              </button>
            </div>

            {(!data?.absences || data.absences.length === 0) ? (
              <div className="py-6 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-blue-100">
                No absences recorded for your account. You have a clean attendance record!
              </div>
            ) : (
              <div className="space-y-2">
                {data.absences.map((ab) => (
                  <div
                    key={ab.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white border border-blue-100 text-xs gap-2 shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold text-[11px]">
                        {ab.attendanceDate}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold text-[10px]">
                        {ab.absenceCategory || 'UNSPECIFIED'}
                      </span>
                      <span className="text-slate-700 font-medium">
                        {ab.reason || 'No specific reason provided'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 italic self-end sm:self-auto">
                      Status: Logged
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Report Absence Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Report Absence</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Notifies administration with real-time operational alerts.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAbsenceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Absence Reason Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer transition"
                >
                  <option value="MEDICAL">Medical Leave / Doctor Appointment</option>
                  <option value="EMERGENCY">Family Emergency</option>
                  <option value="OFFSITE">Off-site Client Engagement</option>
                  <option value="OTHER">Other / Personal Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Detailed Explanation
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter details supporting Ge'ez (አማርኛ, ትግርኛ) and Qubee..."
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/30 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting..." : "Submit Absence Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
