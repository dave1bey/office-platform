import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserCheck, Check, Users, X, Save } from 'lucide-react';

interface StaffStatus {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  role: string;
  teams: string[];
  statusIndicator: 'GREEN' | 'RED' | 'GRAY';
  status: string;
}

interface TaskAssignmentComboboxProps {
  taskId: number;
  currentAssignedId?: number;
  currentAssignedIds?: number[];
  currentAssignedMembers?: { id: number; fullName: string; employeeCode: string }[];
  token: string;
  onAssigned: () => void;
  refreshTrigger: number;
}

export const TaskAssignmentCombobox: React.FC<TaskAssignmentComboboxProps> = ({
  taskId,
  currentAssignedId,
  currentAssignedIds,
  currentAssignedMembers,
  token,
  onAssigned,
  refreshTrigger
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [staffList, setStaffList] = useState<StaffStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Sync initial selected IDs
  useEffect(() => {
    if (currentAssignedIds && currentAssignedIds.length > 0) {
      setSelectedIds(currentAssignedIds);
    } else if (currentAssignedId) {
      setSelectedIds([currentAssignedId]);
    } else {
      setSelectedIds([]);
    }
  }, [currentAssignedId, currentAssignedIds]);

  // Fetch live staff statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch('/api/attendance/live-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStaffList(data);
        }
      } catch (err) {
        console.error("Failed to fetch live employee status", err);
      }
    };
    fetchStatuses();
  }, [refreshTrigger, token]);

  const toggleStaff = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveAssignments = async () => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ employeeIds: selectedIds })
      });
      if (res.ok) {
        onAssigned();
        setOpen(false);
      }
    } catch (err) {
      console.error("Failed to assign task", err);
    } finally {
      setAssigning(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const q = query.toLowerCase();
    const teamMatch = s.teams ? s.teams.some(team => team.toLowerCase().includes(q)) : false;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.employeeCode.toLowerCase().includes(q) ||
      teamMatch
    );
  });

  const selectedStaffMembers = staffList.filter(s => selectedIds.includes(s.id));

  return (
    <div className="relative inline-block text-left w-full sm:w-64">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-semibold text-slate-800 shadow-sm transition cursor-pointer"
      >
        <div className="flex items-center space-x-2 truncate">
          {selectedStaffMembers.length > 1 ? (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                {selectedStaffMembers.length} Staff
              </span>
              <span className="truncate text-slate-800 font-semibold">
                {selectedStaffMembers.map(s => s.fullName.split(' ')[0]).join(', ')}
              </span>
            </div>
          ) : selectedStaffMembers.length === 1 ? (
            <>
              {/* Live status dot */}
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  selectedStaffMembers[0].statusIndicator === 'GREEN'
                    ? 'bg-emerald-500 shadow-emerald-500/50 shadow'
                    : selectedStaffMembers[0].statusIndicator === 'RED'
                    ? 'bg-rose-500 shadow-rose-500/50 shadow'
                    : 'bg-slate-400'
                }`}
                title={`Status: ${selectedStaffMembers[0].status}`}
              />
              <span className="truncate text-slate-800 font-semibold">{selectedStaffMembers[0].fullName}</span>
            </>
          ) : (
            <span className="text-slate-400 italic">Unassigned (Click to delegate)</span>
          )}
        </div>
        <Users className="w-3.5 h-3.5 text-blue-600 ml-1.5 flex-shrink-0" />
      </button>

      {open && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-xl shadow-2xl bg-white border border-blue-200 ring-1 ring-blue-500/10 z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Assign Multiple Staff</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Selected Staff Badges */}
          {selectedStaffMembers.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto bg-blue-50/60 p-1.5 rounded-lg border border-blue-100">
              {selectedStaffMembers.map(s => (
                <span
                  key={s.id}
                  className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold"
                >
                  <span className="truncate max-w-[100px]">{s.fullName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStaff(s.id);
                    }}
                    className="hover:text-rose-600 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Live Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={t('searchStaff') || 'Search staff or team...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-blue-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
              autoFocus
            />
          </div>

          {/* Employee list with live status indicators and checkboxes */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredStaff.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No matching staff found</div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedIds.includes(staff.id);

                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold'
                        : 'hover:bg-blue-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded bg-white border-blue-300 text-blue-600 focus:ring-0"
                      />

                      {/* Live Indicator (Green=Present, Red=Absent, Gray=Unrecorded) */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          staff.statusIndicator === 'GREEN'
                            ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                            : staff.statusIndicator === 'RED'
                            ? 'bg-rose-500 ring-4 ring-rose-500/20'
                            : 'bg-slate-400'
                        }`}
                        title={`Status: ${staff.status}`}
                      />

                      <div className="truncate">
                        <div className="font-semibold text-slate-900 truncate">{staff.fullName}</div>
                        <div className="text-[10px] text-slate-500">
                          {staff.employeeCode} &bull; {staff.teams?.join(', ') || 'General'}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer action bar */}
          <div className="flex items-center justify-between pt-2 border-t border-blue-100">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={handleSaveAssignments}
              disabled={assigning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/30 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{assigning ? 'Saving...' : `Save (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
