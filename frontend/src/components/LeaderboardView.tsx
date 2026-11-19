import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Award,
  TrendingUp,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Target,
  ShieldAlert,
  BarChart3,
  Calendar,
  Building2,
  Filter,
  FileSpreadsheet,
  Crown,
  Star,
  Medal,
  Sparkles,
  Eye,
  X,
  Check,
  RotateCcw,
  UserCheck,
  Flame
} from 'lucide-react';

interface AbsentRecord {
  id: number;
  attendanceDate: string;
  status: string;
  absenceCategory?: string;
  reason?: string;
  filedBy?: string;
  filedAt?: string;
}

interface LeaderboardItem {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  teamName: string;
  period?: string;
  totalTasks: number;
  completedTasks: number;
  pendingApprovalTasks?: number;
  overdueTasks?: number;
  overduePenalty?: number;
  avgQualityRating?: number;
  totalWeight: number;
  completedWeight: number;
  unweightedTaskRate: number;
  weightedTaskRate: number;
  recordedAbsentDays: number;
  totalWorkingDays: number;
  absenceRate: number;
  reliabilityRate?: number;
  overallScore: number;
  todayAttendanceStatus: string;
  taskRank: number;
  absenceRank: number;
  absentRecords?: AbsentRecord[];
  absentDates?: string[];
}

interface AwardItem {
  category: 'week' | 'month' | 'year';
  label: string;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  teamName: string;
  weightedTaskRate: number;
  completedTasks: number;
  totalTasks: number;
  absenceRate: number;
  reliabilityRate: number;
  overallScore: number;
  note: string;
  nominatedBy: string;
  nominatedAt: string;
  isNominated: boolean;
}

interface AwardsData {
  week: AwardItem | null;
  month: AwardItem | null;
  year: AwardItem | null;
}

interface LeaderboardViewProps {
  token: string;
  refreshTrigger: number;
  currentUser?: any;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  token,
  refreshTrigger,
  currentUser
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TASK_RATE' | 'ABSENCE_RATE'>('TASK_RATE');

  // Filter States: Day, Week, Month, Year, All
  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [teamsList, setTeamsList] = useState<string[]>([]);

  // Dynamically load active created departments/teams from /api/teams
  useEffect(() => {
    fetch('/api/teams', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const list = data.map((t: any) => t.teamName || t.name).filter(Boolean);
          setTeamsList(list);
        }
      })
      .catch(err => console.error('Failed to load teams for leaderboard:', err));
  }, [token, refreshTrigger]);

  // Export State
  const [exporting, setExporting] = useState(false);

  // Awards State (Employee of Week, Month, Year)
  const [awards, setAwards] = useState<AwardsData | null>(null);
  const [awardsLoading, setAwardsLoading] = useState(false);

  // Admin Award Nomination Modal State
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateCategory, setNominateCategory] = useState<'week' | 'month' | 'year'>('week');
  const [nominateEmpId, setNominateEmpId] = useState<number>(1);
  const [nominateNote, setNominateNote] = useState('');
  const [nominating, setNominating] = useState(false);

  // Absence History Modal State
  const [selectedAbsenceEmployee, setSelectedAbsenceEmployee] = useState<LeaderboardItem | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/leaderboard?period=${selectedPeriod.toLowerCase()}&team=${selectedTeam}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAwards = async () => {
    try {
      setAwardsLoading(true);
      const res = await fetch('/api/analytics/awards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAwards(data);
      }
    } catch (err) {
      console.error("Failed to fetch awards", err);
    } finally {
      setAwardsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger, selectedPeriod, selectedTeam]);

  useEffect(() => {
    fetchAwards();
  }, [refreshTrigger]);

  // Robust Authenticated Export (Excel & CSV)
  const handleExport = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setExporting(true);
    try {
      const url = `/api/analytics/export?period=${selectedPeriod.toLowerCase()}&team=${selectedTeam}&format=${format}&token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        let errMessage = 'Export failed';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch (_) {}
        alert(errMessage);
        return;
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `office_performance_${selectedPeriod.toLowerCase()}_${selectedTeam}.${format}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error", err);
      // Direct window fallback with query token
      window.open(
        `/api/analytics/export?period=${selectedPeriod.toLowerCase()}&team=${selectedTeam}&format=${format}&token=${encodeURIComponent(token)}`,
        '_blank'
      );
    } finally {
      setExporting(false);
    }
  };

  // Submit Admin Nomination for Award
  const handleSubmitNomination = async (e: React.FormEvent) => {
    e.preventDefault();
    setNominating(true);
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: nominateCategory,
          employeeId: nominateEmpId,
          note: nominateNote
        })
      });
      if (res.ok) {
        setShowNominateModal(false);
        setNominateNote('');
        fetchAwards();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`Failed to nominate: ${d.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Nomination error", err);
    } finally {
      setNominating(false);
    }
  };

  // Reset Award to Auto-Compute
  const handleResetAward = async (cat: 'week' | 'month' | 'year') => {
    if (!window.confirm(`Reset ${cat} award to automatic performance calculation?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/awards/${cat}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAwards();
      }
    } catch (err) {
      console.error("Reset award error", err);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (activeTab === 'TASK_RATE') {
      return b.weightedTaskRate - a.weightedTaskRate;
    } else {
      // In Absenteeism Watchlist, sort by recordedAbsentDays descending, then absenceRate
      if (b.recordedAbsentDays !== a.recordedAbsentDays) {
        return b.recordedAbsentDays - a.recordedAbsentDays;
      }
      return b.absenceRate - a.absenceRate;
    }
  });

  // Calculate Aggregated Metrics for selected period
  const totalTasks = items.reduce((acc, i) => acc + i.totalTasks, 0);
  const completedTasks = items.reduce((acc, i) => acc + i.completedTasks, 0);
  const totalWeight = items.reduce((acc, i) => acc + i.totalWeight, 0);
  const completedWeight = items.reduce((acc, i) => acc + i.completedWeight, 0);

  const teamWeightedRate = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 1000) / 10 : 0;
  const totalAbsentDays = items.reduce((acc, i) => acc + i.recordedAbsentDays, 0);
  const activeTeamSize = Math.max(1, items.length);
  const teamAbsenteeismRate = Math.round(
    (totalAbsentDays / (activeTeamSize * (selectedPeriod === 'DAY' ? 1 : selectedPeriod === 'WEEK' ? 5 : selectedPeriod === 'MONTH' ? 22 : selectedPeriod === 'YEAR' ? 240 : 20))) * 1000
  ) / 10;

  return (
    <div className="space-y-6">

      {/* =========================================================================
          SECTION 1: HALL OF FAME - EMPLOYEE OF THE WEEK, MONTH & YEAR
          ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-blue-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-800/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center space-x-2">
                <span>Hall of Fame & Performance Awards</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-blue-200">
                Recognizing stellar accomplishments, deliverable momentum, and reliable attendance
              </p>
            </div>
          </div>

          {/* Admin Nomination Action */}
          <button
            onClick={() => {
              setNominateCategory('week');
              setShowNominateModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950" />
            <span>Nominate / Spotlight</span>
          </button>
        </div>

        {/* 3 Award Cards Grid (Week, Month, Year) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* AWARD 1: EMPLOYEE OF THE WEEK */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4.5 space-y-3 hover:border-amber-400/50 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-amber-400 text-slate-950 shadow-sm">
                  <Star className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                    Weekly Spotlight
                  </span>
                  <h3 className="text-sm font-bold text-white">Employee of the Week</h3>
                </div>
              </div>
              {awards?.week?.isNominated ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                  Admin Spotlight
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                  Top Task Rate
                </span>
              )}
            </div>

            {awards?.week ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h4 className="text-base font-black text-white">{awards.week.fullName}</h4>
                    <span className="text-xs text-blue-200 font-medium">
                      {awards.week.teamName} &bull; <span className="font-mono text-[11px] opacity-80">{awards.week.employeeCode}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-amber-300 font-mono">
                      {awards.week.weightedTaskRate}%
                    </span>
                    <span className="text-[10px] text-blue-200 block font-semibold">Accomplished</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-blue-300 block">Deliverables Done</span>
                    <span className="font-bold text-white">{awards.week.completedTasks} / {awards.week.totalTasks}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-blue-300 block">Reliability Score</span>
                    <span className="font-bold text-emerald-300">
                      {awards.week.reliabilityRate || Math.max(0, 100 - awards.week.absenceRate)}%
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-blue-100 italic bg-white/5 p-2 rounded border border-white/10 line-clamp-2">
                  "{awards.week.note}"
                </p>

                {awards.week.isNominated && (
                  <div className="flex items-center justify-between pt-1 text-[10px] text-blue-300">
                    <span>By: {awards.week.nominatedBy}</span>
                    <button
                      onClick={() => handleResetAward('week')}
                      className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-blue-200 italic py-4">Calculating top weekly performer...</div>
            )}
          </div>

          {/* AWARD 2: EMPLOYEE OF THE MONTH */}
          <div className="bg-white/10 backdrop-blur-md border border-amber-400/30 rounded-xl p-4.5 space-y-3 hover:border-amber-400 transition shadow-lg relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-amber-400 text-slate-950 shadow-sm">
                  <Crown className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                    Monthly Champion
                  </span>
                  <h3 className="text-sm font-bold text-white">Employee of the Month</h3>
                </div>
              </div>
              {awards?.month?.isNominated ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                  Admin Spotlight
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
                  Gold Trophy
                </span>
              )}
            </div>

            {awards?.month ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h4 className="text-base font-black text-white">{awards.month.fullName}</h4>
                    <span className="text-xs text-blue-200 font-medium">
                      {awards.month.teamName} &bull; <span className="font-mono text-[11px] opacity-80">{awards.month.employeeCode}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-amber-300 font-mono">
                      {awards.month.overallScore}
                    </span>
                    <span className="text-[10px] text-amber-200 block font-semibold">Overall Index</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-blue-300 block">Task Rate %</span>
                    <span className="font-bold text-white">{awards.month.weightedTaskRate}%</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-blue-300 block">Attendance Rate</span>
                    <span className="font-bold text-emerald-300">
                      {awards.month.reliabilityRate || Math.max(0, 100 - awards.month.absenceRate)}%
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-blue-100 italic bg-white/5 p-2 rounded border border-white/10 line-clamp-2">
                  "{awards.month.note}"
                </p>

                {awards.month.isNominated && (
                  <div className="flex items-center justify-between pt-1 text-[10px] text-blue-300">
                    <span>By: {awards.month.nominatedBy}</span>
                    <button
                      onClick={() => handleResetAward('month')}
                      className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-blue-200 italic py-4">Calculating monthly champion...</div>
            )}
          </div>

          {/* AWARD 3: EMPLOYEE OF THE YEAR */}
          <div className="bg-white/10 backdrop-blur-md border border-cyan-400/30 rounded-xl p-4.5 space-y-3 hover:border-cyan-400 transition shadow-lg relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-cyan-400 text-slate-950 shadow-sm">
                  <Award className="w-4 h-4 fill-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 block">
                    Annual Laureate
                  </span>
                  <h3 className="text-sm font-bold text-white">Employee of the Year</h3>
                </div>
              </div>
              {awards?.year?.isNominated ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                  Admin Spotlight
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-semibold">
                  Platinum Shield
                </span>
              )}
            </div>

            {awards?.year ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h4 className="text-base font-black text-white">{awards.year.fullName}</h4>
                    <span className="text-xs text-blue-200 font-medium">
                      {awards.year.teamName} &bull; <span className="font-mono text-[11px] opacity-80">{awards.year.employeeCode}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-cyan-300 font-mono">
                      {awards.year.overallScore}
                    </span>
                    <span className="text-[10px] text-cyan-200 block font-semibold">Annual Index</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-blue-300 block">Accomplishment</span>
                    <span className="font-bold text-white">{awards.year.weightedTaskRate}%</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-blue-300 block">Attendance</span>
                    <span className="font-bold text-emerald-300">
                      {awards.year.reliabilityRate || Math.max(0, 100 - awards.year.absenceRate)}%
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-blue-100 italic bg-white/5 p-2 rounded border border-white/10 line-clamp-2">
                  "{awards.year.note}"
                </p>

                {awards.year.isNominated && (
                  <div className="flex items-center justify-between pt-1 text-[10px] text-blue-300">
                    <span>By: {awards.year.nominatedBy}</span>
                    <button
                      onClick={() => handleResetAward('year')}
                      className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-blue-200 italic py-4">Calculating annual laureate...</div>
            )}
          </div>

        </div>
      </div>

      {/* =========================================================================
          SECTION 2: AGGREGATED KPI CARDS (PERIOD METRICS)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Team Accomplishment Rate */}
        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Accomplishment ({selectedPeriod})
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{teamWeightedRate}%</span>
              <span className="text-[10px] text-blue-600 font-bold">(weighted)</span>
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{completedTasks}/{totalTasks} tasks done</span>
          </div>
        </div>

        {/* KPI 2: Team Absenteeism Rate */}
        <div className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Absenteeism ({selectedPeriod})
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{teamAbsenteeismRate}%</span>
              <span className="text-[10px] text-rose-600 font-bold">rate</span>
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">{totalAbsentDays} absent records</span>
          </div>
        </div>

        {/* KPI 3: Active Team Members */}
        <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Filtered Staff</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{activeTeamSize}</span>
              <span className="text-[10px] text-emerald-600 font-bold">members</span>
            </div>
            <span className="text-[10px] text-slate-500 block">{selectedTeam === 'ALL' ? 'Across All Teams' : selectedTeam}</span>
          </div>
        </div>

        {/* KPI 4: Delivered Weight Points */}
        <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Delivered Points</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{completedWeight}</span>
              <span className="text-[10px] text-slate-500 font-medium">/ {totalWeight} pts</span>
            </div>
            <span className="text-[10px] text-amber-700 block font-bold">Critical=4x, High=3x, Med=2x</span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          SECTION 3: MAIN LEADERBOARD & ABSENTEEISM WATCHLIST TABLE
          ========================================================================= */}
      <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm space-y-5">
        
        {/* Top Header & Multi-Dimensional Filters (Period: Day, Week, Year + Department) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-blue-100 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <span>{t('leaderboard')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                  {selectedPeriod === 'DAY' ? 'Today' : selectedPeriod === 'WEEK' ? 'This Week' : selectedPeriod === 'MONTH' ? 'This Month' : selectedPeriod === 'YEAR' ? 'This Year' : 'All Time'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Filtered by time period and department with severity-weighted task points and absence tracking
              </p>
            </div>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* PERIOD FILTER TABS (Day, Week, Month, Year, All) */}
            <div className="flex bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs font-semibold">
              <button
                onClick={() => setSelectedPeriod('DAY')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  selectedPeriod === 'DAY' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="Filter by Today"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Day</span>
              </button>
              <button
                onClick={() => setSelectedPeriod('WEEK')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  selectedPeriod === 'WEEK' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="Filter by This Week"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Week</span>
              </button>
              <button
                onClick={() => setSelectedPeriod('MONTH')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  selectedPeriod === 'MONTH' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="Filter by This Month"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                onClick={() => setSelectedPeriod('YEAR')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition cursor-pointer ${
                  selectedPeriod === 'YEAR' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="Filter by This Year"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Year</span>
              </button>
              <button
                onClick={() => setSelectedPeriod('ALL')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  selectedPeriod === 'ALL' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
                }`}
                title="All Recorded Time"
              >
                <span>All</span>
              </button>
            </div>

            {/* DEPARTMENT FILTER */}
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-xs">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {teamsList.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            {/* EXPORT BUTTONS (EXCEL & CSV - FIXED WITH AUTH HEADERS + BLOB DOWNLOAD) */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleExport('xlsx')}
                disabled={exporting}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                title="Download multi-sheet Excel file (.xlsx) with filtered data"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
                title="Download CSV file"
              >
                <Download className="w-3 h-3" />
                <span>CSV</span>
              </button>
            </div>

          </div>
        </div>

        {/* View Toggle: Task Accomplishment vs Absenteeism Watchlist */}
        <div className="flex items-center justify-between">
          <div className="flex bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('TASK_RATE')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'TASK_RATE' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Task Accomplishment</span>
            </button>
            <button
              onClick={() => setActiveTab('ABSENCE_RATE')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md transition cursor-pointer ${
                activeTab === 'ABSENCE_RATE' ? 'bg-rose-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Absenteeism Watchlist</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Period: <span className="text-blue-700 font-bold">{selectedPeriod}</span> &bull; Dept: <span className="text-emerald-700 font-bold">{selectedTeam}</span>
          </div>
        </div>

        {/* TABLE CONTENT */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Calculating real-time analytics for {selectedPeriod}...</div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm italic bg-blue-50/30 rounded-xl border border-blue-100">
            No employee metrics found for the selected timeframe ({selectedPeriod}) and department ({selectedTeam}).
          </div>
        ) : activeTab === 'TASK_RATE' ? (
          /* =========================================================================
             TAB 1: TASK ACCOMPLISHMENT LEADERBOARD TABLE
             ========================================================================= */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-blue-50/80 text-xs uppercase tracking-wider text-blue-950 font-bold border-b border-blue-200">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Rank</th>
                  <th className="px-4 py-3">Staff Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Status Today</th>
                  <th className="px-4 py-3 text-right">Tasks Done</th>
                  <th className="px-4 py-3 text-right">Quality (1-10)</th>
                  <th className="px-4 py-3 text-right">Overdue</th>
                  <th className="px-4 py-3 text-right">Accomplishment</th>
                  <th className="px-4 py-3 text-right">Absent Days</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Overall Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {sortedItems.map((item, index) => {
                  const rankNum = index + 1;
                  const isGold = rankNum === 1;
                  const isSilver = rankNum === 2;
                  const isBronze = rankNum === 3;

                  return (
                    <tr
                      key={item.employeeId}
                      className="hover:bg-blue-50/40 transition font-medium"
                    >
                      {/* Rank Column with Badges */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isGold
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'
                                : isSilver
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : isBronze
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : 'bg-slate-50 text-slate-600'
                            }`}
                          >
                            {rankNum}
                          </span>
                        </div>
                      </td>

                      {/* Employee Name & Code */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{item.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.employeeCode}</div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                          {item.teamName}
                        </span>
                      </td>

                      {/* Status Today */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.todayAttendanceStatus === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${item.todayAttendanceStatus === 'PRESENT' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{item.todayAttendanceStatus}</span>
                        </span>
                      </td>

                      {/* Tasks Done */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs">
                        <span className="font-bold text-slate-900">{item.completedTasks}</span> / {item.totalTasks}
                      </td>

                      {/* Quality Rating (1 to 10) */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <span>⭐ {item.avgQualityRating ? item.avgQualityRating : 8}/10</span>
                        </span>
                      </td>

                      {/* Overdue Penalty */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs">
                        {item.overdueTasks ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            -{item.overdueTasks} pts
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">0</span>
                        )}
                      </td>

                      {/* Accomplishment Rate */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 hidden sm:block overflow-hidden border border-slate-200/60">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, item.weightedTaskRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900 font-mono text-xs">{item.weightedTaskRate}%</span>
                        </div>
                      </td>

                      {/* Recorded Absent Days (Clickable to view dates) */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs text-rose-700 font-bold">
                        <button
                          onClick={() => setSelectedAbsenceEmployee(item)}
                          className="hover:underline hover:text-rose-900 cursor-pointer"
                          title="Click to view absent dates"
                        >
                          {item.recordedAbsentDays} d
                        </button>
                      </td>

                      {/* Absence % */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs text-rose-700 font-bold">
                        {item.absenceRate}%
                      </td>

                      {/* Overall Composite Score */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-sm text-emerald-700 font-mono">
                        {item.overallScore}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* =========================================================================
             TAB 2: ABSENTEEISM WATCHLIST TABLE (CUSTOM REDESIGNED)
             Avoids 3 columns: Raw Tasks, Weighted Rate, Overall Score
             Strictly focused on absenteeism with clickable absent days to view dates
             ========================================================================= */
          <div className="overflow-x-auto space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-medium">
                  Showing absenteeism tracking for <strong className="text-slate-800">{selectedPeriod}</strong>. Click on any employee's <strong>Recorded Days</strong> button to view exact absence dates, categories, and reasons.
                </span>
              </div>
            </div>

            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-rose-50/80 text-xs uppercase tracking-wider text-rose-950 font-bold border-b border-rose-200">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Watchlist Rank</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Status Today</th>
                  <th className="px-4 py-3 text-center">Recorded Absent Days</th>
                  <th className="px-4 py-3 text-right">Absence Rate</th>
                  <th className="px-4 py-3 text-right">Attendance Reliability</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {sortedItems.map((item, index) => {
                  const rankNum = index + 1;
                  const hasAbsences = item.recordedAbsentDays > 0;
                  const reliability = item.reliabilityRate !== undefined
                    ? item.reliabilityRate
                    : Math.max(0, 100 - item.absenceRate);

                  return (
                    <tr
                      key={item.employeeId}
                      className={`hover:bg-rose-50/30 transition font-medium ${hasAbsences ? 'bg-rose-50/15' : ''}`}
                    >
                      {/* Absence Watchlist Rank */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              rankNum <= 3 && hasAbsences
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {rankNum}
                          </span>
                        </div>
                      </td>

                      {/* Employee Name & Code */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{item.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.employeeCode}</div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                          {item.teamName}
                        </span>
                      </td>

                      {/* Status Today */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.todayAttendanceStatus === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${item.todayAttendanceStatus === 'PRESENT' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>{item.todayAttendanceStatus}</span>
                        </span>
                      </td>

                      {/* RECORDED ABSENT DAYS (CLICKABLE BUTTON PILL) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAbsenceEmployee(item)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm ${
                            hasAbsences
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                          title="Click to view detailed dates of absence"
                        >
                          <Calendar className={`w-3.5 h-3.5 ${hasAbsences ? 'text-rose-600' : 'text-emerald-600'}`} />
                          <span>{item.recordedAbsentDays} {item.recordedAbsentDays === 1 ? 'Day' : 'Days'}</span>
                          <span className="text-[10px] opacity-75 underline ml-0.5">view dates</span>
                        </button>
                      </td>

                      {/* ABSENCE RATE % */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 hidden sm:block overflow-hidden border border-slate-200/60">
                            <div
                              className="bg-rose-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, item.absenceRate)}%` }}
                            />
                          </div>
                          <span className={`font-bold font-mono text-xs ${hasAbsences ? 'text-rose-700' : 'text-slate-500'}`}>
                            {item.absenceRate}%
                          </span>
                        </div>
                      </td>

                      {/* ATTENDANCE RELIABILITY % */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono ${
                          reliability >= 95
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : reliability >= 80
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{reliability}%</span>
                        </span>
                      </td>

                      {/* ACTION: VIEW ABSENCE HISTORY BUTTON */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAbsenceEmployee(item)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3 h-3 text-rose-600" />
                          <span>View History</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* =========================================================================
          MODAL 1: VIEW SPECIFIC ABSENT DAYS DETAILS
          ========================================================================= */}
      {selectedAbsenceEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-800 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <span>Absence History: {selectedAbsenceEmployee.fullName}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedAbsenceEmployee.employeeCode} &bull; {selectedAbsenceEmployee.teamName} &bull; Timeframe: {selectedPeriod}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAbsenceEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric Summary Bar */}
            <div className="grid grid-cols-3 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Recorded Absent Days</span>
                <span className="text-xl font-black text-rose-600 font-mono">
                  {selectedAbsenceEmployee.recordedAbsentDays}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Absence Rate</span>
                <span className="text-xl font-black text-slate-800 font-mono">
                  {selectedAbsenceEmployee.absenceRate}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Today's Status</span>
                <span className={`text-sm font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                  selectedAbsenceEmployee.todayAttendanceStatus === 'PRESENT'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedAbsenceEmployee.todayAttendanceStatus}
                </span>
              </div>
            </div>

            {/* List of Specific Absent Dates */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Detailed Absent Dates Breakdown ({selectedAbsenceEmployee.absentRecords?.length || 0} dates)
              </h4>

              {(!selectedAbsenceEmployee.absentRecords || selectedAbsenceEmployee.absentRecords.length === 0) ? (
                <div className="text-center py-8 bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Perfect Attendance Recorded!</p>
                  <p className="text-xs text-emerald-700">
                    No absent dates found for {selectedAbsenceEmployee.fullName} in the selected period ({selectedPeriod}).
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedAbsenceEmployee.absentRecords.map((rec) => {
                    const d = new Date(rec.attendanceDate);
                    const weekday = !isNaN(d.getTime())
                      ? d.toLocaleDateString('en-US', { weekday: 'long' })
                      : '';

                    return (
                      <div
                        key={rec.id || rec.attendanceDate}
                        className="bg-white border border-rose-100 rounded-xl p-3 shadow-sm hover:border-rose-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-center min-w-[3.5rem]">
                            <span className="text-[10px] font-bold uppercase block text-rose-500">
                              {weekday ? weekday.substring(0, 3) : 'Date'}
                            </span>
                            <span className="font-bold font-mono text-xs text-rose-900">
                              {rec.attendanceDate.substring(5)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-slate-900 font-mono">
                                {rec.attendanceDate}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {rec.absenceCategory || 'ABSENT'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {rec.reason || 'No detailed reason specified'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-400 font-medium self-end sm:self-auto">
                          <span>Recorded by: </span>
                          <strong className="text-slate-700">{rec.filedBy || 'Self-Reported'}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedAbsenceEmployee(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADMIN NOMINATE EMPLOYEE OF WEEK / MONTH / YEAR
          ========================================================================= */}
      {showNominateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-800">
            
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Nominate Performance Award
                </h3>
              </div>
              <button
                onClick={() => setShowNominateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNomination} className="space-y-3.5">
              
              {/* Award Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Award Category:
                </label>
                <select
                  value={nominateCategory}
                  onChange={(e) => setNominateCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
                >
                  <option value="week">Employee of the Week (⭐)</option>
                  <option value="month">Employee of the Month (👑)</option>
                  <option value="year">Employee of the Year (💎)</option>
                </select>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Staff Member:
                </label>
                <select
                  value={nominateEmpId}
                  onChange={(e) => setNominateEmpId(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
                >
                  {items.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeCode}) - {emp.teamName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commendation Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commendation / Citation Note:
                </label>
                <textarea
                  value={nominateNote}
                  onChange={(e) => setNominateNote(e.target.value)}
                  placeholder="e.g. Outstanding execution during core platform migration, zero unexcused absences, and exceptional team leadership."
                  rows={3}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNominateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={nominating}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {nominating ? 'Bestowing...' : 'Bestow Award'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
