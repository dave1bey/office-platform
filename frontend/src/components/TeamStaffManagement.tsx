import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  FolderPlus,
  Shield,
  ShieldOff,
  Check,
  Globe,
  Search,
  Layers,
  Mail,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Clock,
  Calendar,
  Zap,
  AlertCircle,
  Send
} from 'lucide-react';
import { MultiDayPicker, MultiDaySelection } from './MultiDayPicker';

interface TeamItem {
  id: number;
  teamName: string;
  teamNameAm?: string;
  teamNameTi?: string;
  teamNameOm?: string;
  description?: string;
  members: { id: number; fullName: string; employeeCode: string }[];
}

interface EmployeeItem {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  preferredLang: string;
  teams: string[];
  isTemporaryAdmin?: boolean;
  temporaryAdminUntil?: string | null;
  temporaryAdminReason?: string | null;
}

interface TeamStaffManagementProps {
  token: string;
  refreshTrigger: number;
  onDataChanged: () => void;
}

export const TeamStaffManagement: React.FC<TeamStaffManagementProps> = ({
  token,
  refreshTrigger,
  onDataChanged
}) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<'EMPLOYEES' | 'TEAMS'>('EMPLOYEES');
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [newLang, setNewLang] = useState('en');
  const [selectedTeamsForUser, setSelectedTeamsForUser] = useState<string[]>([]);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Create Team Modal State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamNameEn, setTeamNameEn] = useState('');
  const [teamNameAm, setTeamNameAm] = useState('');
  const [teamNameTi, setTeamNameTi] = useState('');
  const [teamNameOm, setTeamNameOm] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [selectedMembersForTeam, setSelectedMembersForTeam] = useState<number[]>([]);
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Delete Modals State
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeItem | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamItem | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  // Temporary Admin Modal State
  const [tempAdminEmp, setTempAdminEmp] = useState<EmployeeItem | null>(null);
  const [tempAdminDuration, setTempAdminDuration] = useState<'DAY' | 'WEEK' | 'CUSTOM'>('DAY');
  const [tempAdminCustomDate, setTempAdminCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [tempAdminReason, setTempAdminReason] = useState<string>('');
  const [submittingTempAdmin, setSubmittingTempAdmin] = useState(false);

  // Admin Mark Absent Modal State (Single or Multi-Day for Any Employee)
  const [showAdminAbsenceModal, setShowAdminAbsenceModal] = useState(false);
  const [absenceTargetEmpId, setAbsenceTargetEmpId] = useState<number | null>(null);
  const [adminAbsenceStartDate, setAdminAbsenceStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminAbsenceEndDate, setAdminAbsenceEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminSelectedDates, setAdminSelectedDates] = useState<string[]>([new Date().toISOString().split('T')[0]]);
  const [adminAbsenceDaysCount, setAdminAbsenceDaysCount] = useState(1);
  const [adminAbsenceCategory, setAdminAbsenceCategory] = useState('MEDICAL');
  const [adminAbsenceReason, setAdminAbsenceReason] = useState('');
  const [submittingAdminAbsence, setSubmittingAdminAbsence] = useState(false);

  const openAdminAbsenceModal = (emp: EmployeeItem | null) => {
    if (emp) {
      setAbsenceTargetEmpId(emp.id);
    } else {
      const firstNonAdmin = employees.find(e => e.id !== 1) || employees[0];
      setAbsenceTargetEmpId(firstNonAdmin ? firstNonAdmin.id : 1);
    }
    const today = new Date().toISOString().split('T')[0];
    setAdminAbsenceStartDate(today);
    setAdminAbsenceEndDate(today);
    setAdminSelectedDates([today]);
    setAdminAbsenceDaysCount(1);
    setAdminAbsenceCategory('MEDICAL');
    setAdminAbsenceReason('');
    setShowAdminAbsenceModal(true);
  };

  const getAdminAbsenceDaysCount = () => adminAbsenceDaysCount;

  const handleAdminRecordAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceTargetEmpId) return;
    setSubmittingAdminAbsence(true);
    try {
      const res = await fetch('/api/attendance/absence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: absenceTargetEmpId,
          startDate: adminAbsenceStartDate,
          endDate: adminAbsenceEndDate,
          dates: adminSelectedDates,
          category: adminAbsenceCategory,
          reason: adminAbsenceReason
        })
      });

      if (res.ok) {
        setShowAdminAbsenceModal(false);
        setAdminAbsenceReason('');
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record absence');
      }
    } catch (e) {
      console.error(e);
      alert('Error recording absence');
    } finally {
      setSubmittingAdminAbsence(false);
    }
  };

  const fetchData = async () => {
    try {
      const [empRes, teamRes] = await Promise.all([
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (empRes.ok && teamRes.ok) {
        const empData = await empRes.json();
        const teamData = await teamRes.json();
        setEmployees(empData);
        setTeams(teamData);
        if (!newCode) {
          setNewCode(`EMP-00${empData.length + 1}`);
        }
      }
    } catch (err) {
      console.error("Failed to load staff/team data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeCode: newCode,
          fullName: newName,
          email: newEmail,
          role: newRole,
          preferredLang: newLang,
          teams: selectedTeamsForUser
        })
      });

      if (res.ok) {
        setShowUserModal(false);
        setNewName('');
        setNewEmail('');
        setSelectedTeamsForUser([]);
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (err) {
      console.error("Error creating user", err);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTeam(true);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teamName: teamNameEn,
          teamNameAm: teamNameAm || teamNameEn,
          teamNameTi: teamNameTi || teamNameEn,
          teamNameOm: teamNameOm || teamNameEn,
          description: teamDesc,
          memberIds: selectedMembersForTeam
        })
      });

      if (res.ok) {
        setShowTeamModal(false);
        setTeamNameEn('');
        setTeamNameAm('');
        setTeamNameTi('');
        setTeamNameOm('');
        setTeamDesc('');
        setSelectedMembersForTeam([]);
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create team');
      }
    } catch (err) {
      console.error("Error creating team", err);
    } finally {
      setSubmittingTeam(false);
    }
  };

  const executeDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setDeletingEmployee(true);
    try {
      const res = await fetch(`/api/admin/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEmployeeToDelete(null);
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete employee');
      }
    } catch (e) {
      console.error("Error deleting employee", e);
      alert('Error deleting employee');
    } finally {
      setDeletingEmployee(false);
    }
  };

  const executeDeleteTeam = async () => {
    if (!teamToDelete) return;
    setDeletingTeam(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTeamToDelete(null);
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete department');
      }
    } catch (e) {
      console.error("Error deleting department", e);
      alert('Error deleting department');
    } finally {
      setDeletingTeam(false);
    }
  };

  const handleGrantTempAdmin = async () => {
    if (!tempAdminEmp) return;
    setSubmittingTempAdmin(true);
    try {
      const res = await fetch('/api/admin/temporary-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: tempAdminEmp.id,
          durationType: tempAdminDuration,
          customDate: tempAdminCustomDate,
          reason: tempAdminReason
        })
      });
      if (res.ok) {
        setTempAdminEmp(null);
        setTempAdminReason('');
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to grant temporary admin');
      }
    } catch (e) {
      console.error("Error granting temporary admin", e);
      alert('Error granting temporary admin');
    } finally {
      setSubmittingTempAdmin(false);
    }
  };

  const handleRevokeTempAdmin = async (emp: EmployeeItem) => {
    if (!window.confirm(`Revoke temporary admin privileges for ${emp.fullName}? Their access will return to Staff.`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/temporary-admin/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employeeId: emp.id })
      });
      if (res.ok) {
        onDataChanged();
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to revoke temporary admin');
      }
    } catch (e) {
      console.error("Error revoking temporary admin", e);
    }
  };

  const toggleTeamForUser = (teamName: string) => {
    setSelectedTeamsForUser(prev =>
      prev.includes(teamName) ? prev.filter(t => t !== teamName) : [...prev, teamName]
    );
  };

  const toggleMemberForTeam = (memberId: number) => {
    setSelectedMembersForTeam(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.teams && emp.teams.some(t => t.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm space-y-6">
      
      {/* Top Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-blue-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Staff & Department Management</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create employees, delegate temporary administrator access, manage departments, or reassign groups
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Section Toggle */}
          <div className="flex bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSection('EMPLOYEES')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeSection === 'EMPLOYEES' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Employees ({employees.length})
            </button>
            <button
              onClick={() => setActiveSection('TEAMS')}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                activeSection === 'TEAMS' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Departments & Groups ({teams.length})
            </button>
          </div>

          {/* Action Button */}
          {activeSection === 'EMPLOYEES' ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openAdminAbsenceModal(null)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/20 transition cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Mark Staff Absent</span>
              </button>
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: EMPLOYEES LIST WITH TEMPORARY ADMIN DELEGATION & DELETE */}
      {activeSection === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, ID, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-blue-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-blue-50/80 text-blue-950 uppercase tracking-wider font-bold border-b border-blue-200">
                <tr>
                  <th className="p-3 rounded-l-lg">Employee</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role / Status</th>
                  <th className="p-3">Preferred Lang</th>
                  <th className="p-3">Assigned Teams / Groups</th>
                  <th className="p-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {filteredEmployees.map((emp) => {
                  const isRootAdmin = emp.id === 1 || emp.email === 'admin@office.lan';
                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                          <span>{emp.fullName}</span>
                          {emp.isTemporaryAdmin && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Acting Admin" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{emp.employeeCode}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {emp.email}
                      </td>
                      <td className="p-3">
                        {emp.isTemporaryAdmin ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-sm animate-pulse">
                              <Shield className="w-3 h-3 text-amber-600" />
                              <span>⚡ Acting Admin</span>
                            </span>
                            {emp.temporaryAdminUntil && (
                              <div className="text-[10px] text-amber-700 font-mono font-medium">
                                Until: {new Date(emp.temporaryAdminUntil).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            emp.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : emp.role === 'MANAGER'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {emp.role}
                          </span>
                        )}
                      </td>
                      <td className="p-3 uppercase font-semibold text-slate-700">
                        {emp.preferredLang}
                      </td>
                      <td className="p-3">
                        {emp.teams && emp.teams.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {emp.teams.map((tName, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] text-blue-700 font-semibold">
                                {tName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No assigned team</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center justify-end space-x-2">
                          {isRootAdmin ? (
                            <span className="text-[10px] text-slate-500 font-semibold px-2 py-1 rounded bg-slate-100 border border-slate-200">
                              Primary Admin
                            </span>
                          ) : (
                            <>
                              {/* Temporary Admin Delegation / Revoke Button */}
                              {emp.isTemporaryAdmin ? (
                                <button
                                  onClick={() => handleRevokeTempAdmin(emp)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition cursor-pointer"
                                  title={`Revoke Acting Admin for ${emp.fullName}`}
                                >
                                  <ShieldOff className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Revoke Admin</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setTempAdminEmp(emp)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer"
                                  title={`Make ${emp.fullName} Temporary Admin for 1 Day, 1 Week, or Custom Date`}
                                >
                                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Make Temp Admin</span>
                                </button>
                              )}

                              {/* Mark Employee Absent (Single or Multi-Day) */}
                              <button
                                onClick={() => openAdminAbsenceModal(emp)}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                                title={`Mark ${emp.fullName} absent for today or date range`}
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Absent</span>
                              </button>

                              {/* Delete Employee Button */}
                              <button
                                onClick={() => setEmployeeToDelete(emp)}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                                title={`Delete employee ${emp.fullName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: TEAMS & GROUPS LIST WITH DELETE CAPABILITY */}
      {activeSection === 'TEAMS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t.teamName}</h3>
                  <div className="text-xs text-blue-600 font-semibold space-x-1.5 mt-0.5">
                    {t.teamNameAm && <span>{t.teamNameAm}</span>}
                    {t.teamNameTi && <span>&bull; {t.teamNameTi}</span>}
                    {t.teamNameOm && <span>&bull; {t.teamNameOm}</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {t.members.length} members
                  </span>
                  <button
                    onClick={() => setTeamToDelete(t)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                    title={`Delete department ${t.teamName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {t.description && (
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{t.description}</p>
              )}

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Assigned Members:</span>
                {t.members.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No members assigned yet</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {t.members.map((m) => (
                      <span key={m.id} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-800 rounded text-[11px] font-medium">
                        {m.fullName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: DELEGATE TEMPORARY ADMIN */}
      {tempAdminEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2.5 text-amber-600">
                <Shield className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delegate Temporary Admin Access</h3>
                  <p className="text-xs text-slate-500 font-medium">Promote staff member to acting administrator</p>
                </div>
              </div>
              <button
                onClick={() => setTempAdminEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Employee Info */}
            <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 text-sm">{tempAdminEmp.fullName}</div>
                <div className="text-xs text-slate-500 font-mono">{tempAdminEmp.employeeCode} &bull; {tempAdminEmp.email}</div>
              </div>
              <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">
                {tempAdminEmp.teams?.join(', ') || 'General Staff'}
              </span>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Choose Delegation Period:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTempAdminDuration('DAY')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    tempAdminDuration === 'DAY'
                      ? 'bg-amber-50 border-amber-400 text-slate-900 ring-1 ring-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-amber-700 font-bold text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>1 Day</span>
                  </div>
                  <div className="text-[11px] text-slate-500">24-hour pass</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTempAdminDuration('WEEK')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    tempAdminDuration === 'WEEK'
                      ? 'bg-blue-50 border-blue-400 text-slate-900 ring-1 ring-blue-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-blue-700 font-bold text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>1 Week</span>
                  </div>
                  <div className="text-[11px] text-slate-500">7-day coverage</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTempAdminDuration('CUSTOM')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    tempAdminDuration === 'CUSTOM'
                      ? 'bg-emerald-50 border-emerald-400 text-slate-900 ring-1 ring-emerald-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs mb-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Custom</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Set exact date</div>
                </button>
              </div>
            </div>

            {/* Custom Date Input (shown if CUSTOM selected) */}
            {tempAdminDuration === 'CUSTOM' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Select Expiration Date:
                </label>
                <input
                  type="date"
                  value={tempAdminCustomDate}
                  onChange={(e) => setTempAdminCustomDate(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Reason / Delegation Note */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Delegation Reason / Note (Optional):
              </label>
              <input
                type="text"
                value={tempAdminReason}
                onChange={(e) => setTempAdminReason(e.target.value)}
                placeholder="e.g. Acting team lead while main admin is on leave"
                className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400 transition"
              />
            </div>

            {/* Safety Information Box */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium">
              ⚡ <strong>What this means:</strong> {tempAdminEmp.fullName} will be temporarily elevated to Administrator status with access to upload action plans, delegate deliverables, review office leaderboard analytics, and manage staff. When expired, their role will automatically revert back to Staff.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTempAdminEmp(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrantTempAdmin}
                disabled={submittingTempAdmin}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm shadow-amber-600/30 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{submittingTempAdmin ? 'Granting...' : 'Grant Temporary Admin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE EMPLOYEE */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2.5 text-rose-600">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Delete Staff Member</h3>
              </div>
              <button
                onClick={() => setEmployeeToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium">
              <p>
                Are you sure you want to permanently delete the employee account for:
              </p>
              <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 text-sm">{employeeToDelete.fullName}</div>
                <div className="text-slate-500 font-mono">{employeeToDelete.employeeCode} &bull; {employeeToDelete.email}</div>
                <div className="text-blue-700 font-semibold">Depts: {employeeToDelete.teams?.join(', ') || 'None'}</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800 text-[11px] leading-relaxed">
                ⚠️ This action cannot be undone. Their active task co-assignments and attendance history will be cleanly unlinked.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteEmployee}
                disabled={deletingEmployee}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingEmployee ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE DEPARTMENT */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2.5 text-rose-600">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Delete Department</h3>
              </div>
              <button
                onClick={() => setTeamToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium">
              <p>
                Are you sure you want to delete the department:
              </p>
              <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 text-base">{teamToDelete.teamName}</div>
                {teamToDelete.teamNameAm && (
                  <div className="text-xs text-blue-700 font-semibold">{teamToDelete.teamNameAm} &bull; {teamToDelete.teamNameTi} &bull; {teamToDelete.teamNameOm}</div>
                )}
                <div className="text-slate-500 text-[11px]">{teamToDelete.members.length} currently assigned staff members</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                ⚠️ Employees in this department will remain active in the system, but will be unassigned from this department. Deliverables will be transferred to General.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteTeam}
                disabled={deletingTeam}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingTeam ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE USER & ASSIGN TO TEAMS */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Employee</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Add staff identity and immediately assign to functional teams</p>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="EMPLOYEE">Staff Employee</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Almaz Ayana"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="almaz@office.lan"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Language</label>
                  <select
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="en">English (EN)</option>
                    <option value="am">Amharic / አማርኛ (AM)</option>
                    <option value="ti">Tigrinya / ትግርኛ (TI)</option>
                    <option value="om">Afaan Oromoo (OM)</option>
                  </select>
                </div>
              </div>

              {/* Assign to Teams Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assign to Specific Teams / Groups:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto bg-slate-50 p-2.5 rounded-lg border border-blue-200">
                  {teams.map((t) => {
                    const isChecked = selectedTeamsForUser.includes(t.teamName);
                    return (
                      <label key={t.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTeamForUser(t.teamName)}
                          className="rounded bg-white border-blue-300 text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">{t.teamName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  {submittingUser ? "Creating..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE GROUP & ASSIGN USERS */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Team / Group</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Define team names in all 4 languages and select members</p>

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Name (English)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Infrastructure"
                    value={teamNameEn}
                    onChange={(e) => setTeamNameEn(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ስም (Amharic)</label>
                  <input
                    type="text"
                    placeholder="የመሰረተ ልማት ቡድን"
                    value={teamNameAm}
                    onChange={(e) => setTeamNameAm(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ስም (Tigrinya)</label>
                  <input
                    type="text"
                    placeholder="ናይ መሰረተ ልምዓት ጋንታ"
                    value={teamNameTi}
                    onChange={(e) => setTeamNameTi(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Maqaa (Afaan Oromoo)</label>
                  <input
                    type="text"
                    placeholder="Garee Bu'uura Misoomaa"
                    value={teamNameOm}
                    onChange={(e) => setTeamNameOm(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Team roles and scope..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 placeholder-slate-400"
                />
              </div>

              {/* Assign Initial Members Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Members to Add to this Group ({selectedMembersForTeam.length} selected):
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-lg border border-blue-200">
                  {employees.map((emp) => {
                    const isChecked = selectedMembersForTeam.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMemberForTeam(emp.id)}
                          className="rounded bg-white border-blue-300 text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">{emp.fullName} ({emp.employeeCode})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTeam}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/30 cursor-pointer"
                >
                  {submittingTeam ? "Creating..." : "Save Group with Users"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MARK ABSENT MODAL (MARK ANY EMPLOYEE ABSENT FOR 1 OR MULTIPLE DAYS) */}
      {showAdminAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Employee Absence</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Admin-authorized absence with real-time operational alerts.</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminAbsenceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminRecordAbsence} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Employee
                </label>
                <select
                  value={absenceTargetEmpId || ''}
                  onChange={(e) => setAbsenceTargetEmpId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                  required
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) {emp.teams && emp.teams[0] ? `[${emp.teams[0]}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <MultiDayPicker
                initialStartDate={adminAbsenceStartDate}
                initialEndDate={adminAbsenceEndDate}
                initialDates={adminSelectedDates}
                onChange={(sel: MultiDaySelection) => {
                  setAdminAbsenceStartDate(sel.startDate);
                  setAdminAbsenceEndDate(sel.endDate);
                  setAdminSelectedDates(sel.dates);
                  setAdminAbsenceDaysCount(sel.daysCount);
                }}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Absence Category
                </label>
                <select
                  value={adminAbsenceCategory}
                  onChange={(e) => setAdminAbsenceCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="MEDICAL">Medical Leave / Sick Leave</option>
                  <option value="ANNUAL_LEAVE">Annual Leave / Vacation</option>
                  <option value="EMERGENCY">Family Emergency</option>
                  <option value="OFFSITE">Off-site Client Engagement</option>
                  <option value="DISCIPLINARY">Administrative / Disciplinary Leave</option>
                  <option value="OTHER">Other / Personal Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrative Reason / Explanation
                </label>
                <textarea
                  rows={2}
                  required
                  value={adminAbsenceReason}
                  onChange={(e) => setAdminAbsenceReason(e.target.value)}
                  placeholder="Reason for recording absence on behalf of employee..."
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminAbsenceModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdminAbsence}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/30 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingAdminAbsence ? "Recording..." : "Record Absence"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
