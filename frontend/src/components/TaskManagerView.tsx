import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Users,
  Filter,
  Building2,
  Briefcase,
  Star,
  Layers,
  Calendar,
  CheckSquare,
  Download,
  FileSpreadsheet,
  X,
  UserPlus,
  ArrowRight,
  Sparkles,
  ArrowUpDown,
  Flame,
  Check,
  TrendingUp,
  AlertCircle,
  Send,
  Trash2,
  ShieldCheck,
  Award,
  PlusCircle,
  Plus
} from 'lucide-react';
import { TaskAssignmentCombobox } from './TaskAssignmentCombobox';

interface TaskMember {
  id: number;
  fullName: string;
  employeeCode: string;
}

interface TaskItem {
  id: number;
  customTaskId?: string;
  customId?: string;
  department?: string;
  actionPlanId: number;
  actionPlanTitle: string;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severityWeight: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED';
  teamName?: string;
  assignedToId?: number;
  assignedToName?: string;
  assignedToCode?: string;
  assignedToIds?: number[];
  assignedToMembers?: TaskMember[];
  isMyIndividualTask?: boolean;
  isGroupTask?: boolean;
  submittedAt?: string;
  submittedByName?: string;
  submittedById?: number;
  completedAt?: string;
  completionNote?: string;
  authorizedBy?: string;
  authorizedById?: number;
  authorizedAt?: string;
  qualityRating?: number;
  authorizationNote?: string;
  revisionNote?: string;
  thisWeekPlan?: string;
  totalCompletedSoFar?: string;
}

interface TaskManagerViewProps {
  token: string;
  currentUser: any;
  refreshTrigger: number;
  onTaskUpdated: () => void;
}

export const TaskManagerView: React.FC<TaskManagerViewProps> = ({
  token,
  currentUser,
  refreshTrigger,
  onTaskUpdated
}) => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dedicated Tab Navigation: 'ACTIVE' | 'PENDING_APPROVAL' | 'COMPLETED' | 'ALL'
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING_APPROVAL' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Employee Scope Filter: 'INDIVIDUAL' | 'GROUP'
  const [employeeScope, setEmployeeScope] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');

  // Front Page Department Filter (Both Admin & Employee)
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Closer Deadlines: Sort Toggle & Deadline Scope Filter
  const [closerDeadlinesFirst, setCloserDeadlinesFirst] = useState<boolean>(true);
  const [deadlineFilter, setDeadlineFilter] = useState<'ALL' | 'OVERDUE_TODAY' | 'NEXT_7_DAYS' | 'NEXT_30_DAYS'>('ALL');

  // Authorize & Rate Modal State (Admin)
  const [taskToAuthorize, setTaskToAuthorize] = useState<TaskItem | null>(null);
  const [qualityRating, setQualityRating] = useState<number>(9);
  const [adminAuthNote, setAdminAuthNote] = useState<string>('');
  const [authorizing, setAuthorizing] = useState<boolean>(false);

  // Employee Submission Modal State (Employee)
  const [taskToSubmit, setTaskToSubmit] = useState<TaskItem | null>(null);
  const [employeeSubmitNote, setEmployeeSubmitNote] = useState<string>('');
  const [submittingCompletion, setSubmittingCompletion] = useState<boolean>(false);

  // Export State
  const [exportingTasks, setExportingTasks] = useState<boolean>(false);

  // Dynamic System Groups/Teams State (fetched from backend /api/teams)
  const [systemTeams, setSystemTeams] = useState<any[]>([]);

  // Fetch actual created groups/teams from /api/teams
  useEffect(() => {
    fetch('/api/teams', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setSystemTeams(data);
      })
      .catch(err => console.error('Failed to load teams:', err));
  }, [token, refreshTrigger]);

  // Available Departments dynamically derived from actual created groups (systemTeams) and tasks
  const availableDepts = useMemo(() => {
    const list: string[] = [];
    systemTeams.forEach(t => {
      const name = t.teamName || t.name;
      if (name && !list.includes(name)) list.push(name);
    });
    tasks.forEach(t => {
      const d = t.teamName || t.department;
      if (d && !list.includes(d)) list.push(d);
    });
    return list;
  }, [systemTeams, tasks]);

  // Sequential CBS Task ID generator starting with CBS as default prefix
  const generateNextCbsId = () => {
    let maxCbsNum = 0;
    if (Array.isArray(tasks)) {
      tasks.forEach(t => {
        const idStr = String(t.customTaskId || t.customId || '');
        const match = idStr.match(/CBS[^\d]*(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (!isNaN(num) && num > maxCbsNum) maxCbsNum = num;
        }
      });
    }
    const nextNum = maxCbsNum > 0 ? maxCbsNum + 1 : (tasks && tasks.length > 0 ? tasks.length + 1 : 1);
    return `CBS-${String(nextNum).padStart(2, '0')}`;
  };

  // Manual Task Creation State (Full Template Columns)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskFormCustomId, setTaskFormCustomId] = useState('');
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDept, setTaskFormDept] = useState('');
  const [taskFormCustomDept, setTaskFormCustomDept] = useState('');
  const [taskFormStartDate, setTaskFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskFormDueDate, setTaskFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [taskFormWeekPlan, setTaskFormWeekPlan] = useState('100%');
  const [taskFormCompletedSoFar, setTaskFormCompletedSoFar] = useState('0%');
  const [taskFormStatus, setTaskFormStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');
  const [taskFormPriority, setTaskFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [taskFormAssignedId, setTaskFormAssignedId] = useState<string>('');
  const [taskFormImpact, setTaskFormImpact] = useState('');
  const [taskFormDescription, setTaskFormDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);

  // Fetch live staff for assignment dropdown
  useEffect(() => {
    fetch('/api/attendance/live-status', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAvailableStaff(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token, refreshTrigger]);

  const handleOpenAddTaskModal = () => {
    setTaskFormCustomId(generateNextCbsId());
    setTaskFormTitle('');
    setTaskFormDept(availableDepts.length > 0 ? availableDepts[0] : '__NEW__');
    setTaskFormCustomDept('');
    setTaskFormStartDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setTaskFormDueDate(d.toISOString().split('T')[0]);
    setTaskFormWeekPlan('100%');
    setTaskFormCompletedSoFar('0%');
    setTaskFormStatus('PENDING');
    setTaskFormPriority('MEDIUM');
    setTaskFormAssignedId('');
    setTaskFormImpact('');
    setTaskFormDescription('');
    setShowAddTaskModal(true);
  };

  const handleCreateTaskManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle.trim()) {
      alert("Please enter a deliverable task title.");
      return;
    }

    setCreatingTask(true);
    try {
      const resolvedDept = taskFormDept === '__NEW__' ? (taskFormCustomDept.trim() || 'General') : taskFormDept;
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customId: taskFormCustomId.trim() || `A-${String(tasks.length + 1).padStart(2, '0')}`,
          title: taskFormTitle.trim(),
          department: resolvedDept,
          teamName: resolvedDept,
          startDate: taskFormStartDate,
          dueDate: taskFormDueDate,
          endDate: taskFormDueDate,
          thisWeekPlan: taskFormWeekPlan,
          totalCompletedSoFar: taskFormCompletedSoFar,
          status: taskFormStatus,
          priority: taskFormPriority,
          assignedToId: taskFormAssignedId ? parseInt(taskFormAssignedId) : null,
          impact: taskFormImpact.trim() || null,
          description: taskFormDescription.trim() || null
        })
      });

      if (res.ok) {
        setShowAddTaskModal(false);
        onTaskUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to create task.");
      }
    } catch (err) {
      console.error("Create task error", err);
      alert("Network error while creating task.");
    } finally {
      setCreatingTask(false);
    }
  };

  // Upload Action Plan Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDept, setUploadDept] = useState<string>('');
  const [uploadCustomDept, setUploadCustomDept] = useState<string>('');
  const [planTitle, setPlanTitle] = useState<string>('ModelBank Migration & DLM Cycles');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  // Sync uploadDept when availableDepts changes
  useEffect(() => {
    if (availableDepts.length > 0) {
      if (!uploadDept || (!availableDepts.includes(uploadDept) && uploadDept !== '__NEW__')) {
        setUploadDept(availableDepts[0]);
      }
    } else {
      setUploadDept('__NEW__');
    }
  }, [availableDepts, uploadDept]);

  // Legacy completion note dialog state (Admin quick override)
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Absence Reporting Modal State (Supports Single & Multi-Day Date Ranges)
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceStartDate, setAbsenceStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceEndDate, setAbsenceEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceCategory, setAbsenceCategory] = useState('MEDICAL');
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceSubmitting, setAbsenceSubmitting] = useState(false);
  const [absenceSuccessNotice, setAbsenceSuccessNotice] = useState<string | null>(null);

  // Prevent background page scrolling while any modal is open (so background does NOT scroll!)
  useEffect(() => {
    const isAnyModalOpen = showAddTaskModal || showUploadModal || Boolean(selectedTask) || showAbsenceModal || Boolean(taskToAuthorize) || Boolean(taskToSubmit);
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showAddTaskModal, showUploadModal, selectedTask, showAbsenceModal, taskToAuthorize, taskToSubmit]);

  const getAbsenceDaysCount = () => {
    if (!absenceStartDate || !absenceEndDate) return 1;
    const s = new Date(absenceStartDate);
    const e = new Date(absenceEndDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmitAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbsenceSubmitting(true);
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
          startDate: absenceStartDate,
          endDate: absenceEndDate,
          category: absenceCategory,
          reason: absenceReason
        })
      });

      if (res.ok) {
        setShowAbsenceModal(false);
        setAbsenceReason('');
        setAbsenceSuccessNotice("Absence notice dispatched to administration via instant STOMP broadcast!");
        onTaskUpdated();
        setTimeout(() => setAbsenceSuccessNotice(null), 4000);
      } else {
        alert("Failed to report absence.");
      }
    } catch (e) {
      console.error(e);
      alert("Error reporting absence.");
    } finally {
      setAbsenceSubmitting(false);
    }
  };

  // Admin-Only: Delete Deliverable
  const handleDeleteTask = async (taskId: number, taskTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${taskTitle}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        onTaskUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to delete task: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Error deleting deliverable.");
    }
  };

  // Admin-Only: Clear All Deliverables
  const handleClearAllTasks = async () => {
    if (!window.confirm("Are you sure you want to delete ALL deliverables? This will give you a clean slate to import an action plan.")) {
      return;
    }
    try {
      const res = await fetch('/api/admin/tasks/clear-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks([]);
        onTaskUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to clear deliverables: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to clear deliverables", err);
    }
  };

  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const employeeDept = (currentUser?.teams && currentUser.teams[0]) || availableDepts[0] || 'General';

  const fetchTasks = async () => {
    try {
      const queryParams = isEmployee
        ? `?employeeId=${currentUser.userId}&role=EMPLOYEE`
        : '';
      const res = await fetch(`/api/tasks${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  const handleExecuteUpload = async (useSample: boolean = false) => {
    setUploading(true);
    setUploadResult(null);

    try {
      let bodyData: any;
      let headers: any = { Authorization: `Bearer ${token}` };

      const resolvedPlanTitle = planTitle || (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Core Banking Implementation');
      const finalDept = (uploadDept === '__NEW__' || !uploadDept) ? (uploadCustomDept.trim() || 'General') : uploadDept;

      if (useSample || !selectedFile) {
        const sampleRes = await fetch('/api/action-plans/sample-data');
        const sampleData = await sampleRes.json();
        bodyData = JSON.stringify({
          department: finalDept,
          planTitle: resolvedPlanTitle,
          rawCsv: sampleData.rawCsv
        });
        headers['Content-Type'] = 'application/json';
      } else {
        const isCsv = selectedFile.name.endsWith('.csv');
        if (isCsv) {
          const text = await selectedFile.text();
          bodyData = JSON.stringify({
            department: finalDept,
            planTitle: resolvedPlanTitle,
            rawCsv: text
          });
          headers['Content-Type'] = 'application/json';
        } else {
          bodyData = await selectedFile.arrayBuffer();
          headers['Content-Type'] = 'application/octet-stream';
        }
      }

      const queryParams = `?department=${encodeURIComponent(finalDept)}&planTitle=${encodeURIComponent(resolvedPlanTitle)}`;
      const res = await fetch(`/api/action-plans/upload${queryParams}`, {
        method: 'POST',
        headers,
        body: bodyData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadResult(data);
        onTaskUpdated();
        fetchTasks();
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadResult(null);
        }, 1800);
      } else {
        alert("Failed to upload action plan.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (task: TaskItem, newStatus: string) => {
    if (newStatus === 'COMPLETED' || newStatus === 'PENDING_APPROVAL') {
      if (isEmployee) {
        setTaskToSubmit(task);
        setEmployeeSubmitNote(task.completionNote || '');
        return;
      } else {
        setTaskToAuthorize(task);
        setQualityRating(task.qualityRating || 9);
        setAdminAuthNote(task.authorizationNote || '');
        return;
      }
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, note: task.completionNote || '' })
      });
      if (res.ok) {
        onTaskUpdated();
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin: Authorize Task & Rate Quality (1-10) or Request Revision
  const handleAuthorizeTask = async (approved: boolean) => {
    if (!taskToAuthorize) return;
    setAuthorizing(true);
    try {
      if (approved) {
        const res = await fetch(`/api/tasks/${taskToAuthorize.id}/authorize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            qualityRating,
            authorizationNote: adminAuthNote
          })
        });
        if (res.ok) {
          setTaskToAuthorize(null);
          setAdminAuthNote('');
          onTaskUpdated();
          fetchTasks();
        } else {
          const err = await res.json();
          alert(err.error || "Failed to authorize task.");
        }
      } else {
        const res = await fetch(`/api/tasks/${taskToAuthorize.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            status: 'REVISION_REQUESTED',
            note: adminAuthNote || 'Please review requirements and resubmit.'
          })
        });
        if (res.ok) {
          setTaskToAuthorize(null);
          setAdminAuthNote('');
          onTaskUpdated();
          fetchTasks();
        }
      }
    } catch (e) {
      console.error(e);
      alert("Error processing authorization.");
    } finally {
      setAuthorizing(false);
    }
  };

  // Employee: Submit Task for Admin Authorization & Rating
  const handleSubmitTaskForApproval = async () => {
    if (!taskToSubmit) return;
    setSubmittingCompletion(true);
    try {
      const res = await fetch(`/api/tasks/${taskToSubmit.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'PENDING_APPROVAL',
          note: employeeSubmitNote
        })
      });
      if (res.ok) {
        setTaskToSubmit(null);
        setEmployeeSubmitNote('');
        onTaskUpdated();
        fetchTasks();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit task for review.");
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting task.");
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Export Tasks to Excel (.xlsx) or CSV
  const handleExportTasks = async (scope: string = 'ALL', format: 'xlsx' | 'csv' = 'xlsx') => {
    setExportingTasks(true);
    try {
      const res = await fetch(`/api/tasks/export?format=${format}&status=${scope}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `office_action_tasks_${scope.toLowerCase()}_export.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert(`Failed to export tasks to ${format.toUpperCase()}.`);
      }
    } catch (e) {
      console.error("Export error", e);
      alert("Error exporting tasks.");
    } finally {
      setExportingTasks(false);
    }
  };

  const submitCompletionWithNote = async () => {
    if (!selectedTask) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED', note: completionNote })
      });
      if (res.ok) {
        setSelectedTask(null);
        setCompletionNote('');
        onTaskUpdated();
        fetchTasks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  // Helper: check if task is individually assigned to current employee
  const isMyTask = (task: TaskItem) => {
    if (task.isMyIndividualTask !== undefined) return task.isMyIndividualTask;
    if (task.assignedToIds && currentUser?.userId) {
      return task.assignedToIds.includes(currentUser.userId);
    }
    return task.assignedToId === currentUser?.userId;
  };

  // Helper: calculate days remaining until deadline with timezone safety
  const getDaysUntilDue = (dueDateStr?: string, endDateStr?: string) => {
    const targetStr = dueDateStr || endDateStr;
    if (!targetStr) {
      return { days: null, label: 'No Deadline', urgency: 'NONE' as const, dateDisplay: 'No Deadline' };
    }

    const str = String(targetStr).trim();
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    let targetDate: Date | null = null;
    if (ymdMatch) {
      targetDate = new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
    } else {
      const p = new Date(str);
      if (!isNaN(p.getTime())) {
        targetDate = new Date(p.getFullYear(), p.getMonth(), p.getDate());
      }
    }

    if (!targetDate) {
      return { days: null, label: targetStr, urgency: 'NONE' as const, dateDisplay: targetStr };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const dateDisplay = `${y}-${m}-${d}`;

    if (diffDays < 0) {
      return { days: diffDays, label: `Overdue by ${Math.abs(diffDays)}d`, urgency: 'OVERDUE' as const, dateDisplay };
    } else if (diffDays === 0) {
      return { days: 0, label: 'Due Today', urgency: 'TODAY' as const, dateDisplay };
    } else if (diffDays === 1) {
      return { days: 1, label: 'Due Tomorrow', urgency: 'CRITICAL' as const, dateDisplay };
    } else if (diffDays <= 7) {
      return { days: diffDays, label: `Due in ${diffDays}d`, urgency: 'UPCOMING' as const, dateDisplay };
    } else {
      return { days: diffDays, label: `Due in ${diffDays}d`, urgency: 'LATER' as const, dateDisplay };
    }
  };

  // Counts & Accomplishment Rates for Employee
  const myIndividualTasks = tasks.filter(t => isMyTask(t));
  const groupTasks = tasks.filter(t => t.teamName === employeeDept);

  const myTotalTasks = myIndividualTasks.length;
  const myCompletedTasks = myIndividualTasks.filter(t => t.status === 'COMPLETED').length;
  let myTotalWeight = 0;
  let myCompletedWeight = 0;
  myIndividualTasks.forEach(t => {
    const w = t.severityWeight || 2;
    myTotalWeight += w;
    if (t.status === 'COMPLETED') myCompletedWeight += w;
  });
  const myAccomplishmentRate = myTotalWeight > 0 
    ? Math.round((myCompletedWeight / myTotalWeight) * 1000) / 10 
    : (myTotalTasks > 0 ? Math.round((myCompletedTasks / myTotalTasks) * 1000) / 10 : 0);

  const deptTotalTasks = groupTasks.length;
  const deptCompletedTasks = groupTasks.filter(t => t.status === 'COMPLETED').length;
  let deptTotalWeight = 0;
  let deptCompletedWeight = 0;
  groupTasks.forEach(t => {
    const w = t.severityWeight || 2;
    deptTotalWeight += w;
    if (t.status === 'COMPLETED') deptCompletedWeight += w;
  });
  const deptAccomplishmentRate = deptTotalWeight > 0
    ? Math.round((deptCompletedWeight / deptTotalWeight) * 1000) / 10
    : (deptTotalTasks > 0 ? Math.round((deptCompletedTasks / deptTotalTasks) * 1000) / 10 : 0);


  // Main Tab Counts
  const pendingApprovalCount = tasks.filter(t => t.status === 'PENDING_APPROVAL').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const activeCount = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;

  // Deadline urgency counts
  const overdueCount = tasks.filter(t => t.status !== 'COMPLETED' && (getDaysUntilDue(t.dueDate, t.endDate).days ?? 1) < 0).length;
  const dueTodayCount = tasks.filter(t => t.status !== 'COMPLETED' && (getDaysUntilDue(t.dueDate, t.endDate).days ?? 1) === 0).length;
  const dueNext7DaysCount = tasks.filter(t => t.status !== 'COMPLETED' && (getDaysUntilDue(t.dueDate, t.endDate).days ?? -1) >= 0 && (getDaysUntilDue(t.dueDate, t.endDate).days ?? 99) <= 7).length;

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    // 1. Dedicated Tab Filter: Active vs Pending Authorization vs Completed Archive vs All
    if (activeTab === 'ACTIVE' && (task.status === 'COMPLETED' || task.status === 'PENDING_APPROVAL')) return false;
    if (activeTab === 'PENDING_APPROVAL' && task.status !== 'PENDING_APPROVAL') return false;
    if (activeTab === 'COMPLETED' && task.status !== 'COMPLETED') return false;

    if (filterStatus !== 'ALL' && task.status !== filterStatus) return false;

    if (isEmployee) {
      if (employeeScope === 'INDIVIDUAL' && !isMyTask(task)) return false;
      if (employeeScope === 'GROUP' && task.teamName !== employeeDept) return false;
    } else {
      if (selectedDept !== 'ALL' && task.teamName !== selectedDept) return false;
    }

    if (deadlineFilter !== 'ALL') {
      const dueInfo = getDaysUntilDue(task.dueDate, task.endDate);
      if (dueInfo.days === null) return false;
      if (deadlineFilter === 'OVERDUE_TODAY') {
        if (task.status === 'COMPLETED' || dueInfo.days > 0) return false;
      } else if (deadlineFilter === 'NEXT_7_DAYS') {
        if (task.status === 'COMPLETED' || dueInfo.days > 7) return false;
      } else if (deadlineFilter === 'NEXT_30_DAYS') {
        if (dueInfo.days > 30) return false;
      }
    }

    return true;
  });

  // Sort Tasks: Closer Deadlines First (if enabled)
  const displayTasks = [...filteredTasks].sort((a, b) => {
    if (closerDeadlinesFirst) {
      const aDone = a.status === 'COMPLETED' ? 1 : 0;
      const bDone = b.status === 'COMPLETED' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const aDue = getDaysUntilDue(a.dueDate, a.endDate).days ?? 99999;
      const bDue = getDaysUntilDue(b.dueDate, b.endDate).days ?? 99999;
      if (aDue !== bDue) return aDue - bDue;
    }

    return (b.severityWeight || 1) - (a.severityWeight || 1);
  });

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm space-y-6">
      
      {/* EMPLOYEE GREETING & DEPARTMENT CONTEXT BANNER (VIBRANT BLUE & WHITE THEME) */}
      {isEmployee && (
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white rounded-xl p-4 sm:p-5 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur text-white font-bold text-xs tracking-wide flex items-center space-x-1 border border-white/30 shadow-sm">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{employeeDept} Department</span>
                </span>
                <span className="text-xs text-blue-100 font-mono">
                  {currentUser.employeeCode || 'EMP'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Welcome back, {currentUser.fullName || 'Staff Member'}</span>
              </h2>
              <p className="text-xs text-blue-100">
                Review your individual deliverables and collaborate on {employeeDept} group action items below.
              </p>
            </div>

            {/* Quick Metrics & Accomplishment Rate Cards */}
            <div className="flex flex-wrap items-center gap-3">
              {/* My Task Accomplishment Rate */}
              <div className="bg-white/10 backdrop-blur border border-white/20 p-3 rounded-xl text-center shadow-sm min-w-[150px]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Accomplishment</span>
                </div>
                <div className="text-2xl font-black text-white my-0.5">
                  {myAccomplishmentRate}%
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5 my-1 overflow-hidden">
                  <div
                    className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, myAccomplishmentRate))}%` }}
                  />
                </div>
                <div className="text-[10px] text-blue-100">
                  {myCompletedWeight} / {myTotalWeight} pts ({myCompletedTasks}/{myTotalTasks} done)
                </div>
              </div>

              {/* Department Collective Rate */}
              <div className="bg-white/10 backdrop-blur border border-white/20 p-3 rounded-xl text-center shadow-sm min-w-[140px]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200 flex items-center justify-center space-x-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{employeeDept} Dept</span>
                </div>
                <div className="text-2xl font-black text-white my-0.5">
                  {deptAccomplishmentRate}%
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5 my-1 overflow-hidden">
                  <div
                    className="h-1.5 bg-gradient-to-r from-teal-300 to-blue-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, deptAccomplishmentRate))}%` }}
                  />
                </div>
                <div className="text-[10px] text-blue-100">
                  {deptCompletedWeight} / {deptTotalWeight} pts ({deptCompletedTasks}/{deptTotalTasks} done)
                </div>
              </div>

              {/* Report My Absence Quick Action */}
              <button
                onClick={() => setShowAbsenceModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition cursor-pointer self-stretch justify-center"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Report Absence</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEADLINE URGENCY SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs">
        <button
          onClick={() => { setDeadlineFilter('ALL'); setFilterStatus('ALL'); }}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
            deadlineFilter === 'ALL' && filterStatus === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm font-bold border-blue-600'
              : 'bg-white border-blue-100 text-slate-700 hover:bg-blue-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">All Deliverables</span>
          </div>
          <span className="font-bold text-sm text-slate-900">{tasks.length}</span>
        </button>

        <button
          onClick={() => setDeadlineFilter('OVERDUE_TODAY')}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
            deadlineFilter === 'OVERDUE_TODAY'
              ? 'bg-rose-600 text-white shadow-sm font-bold border-rose-600'
              : 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            <span className="font-semibold">Overdue / Today</span>
          </div>
          <span className="font-bold text-sm text-rose-700 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">
            {overdueCount + dueTodayCount}
          </span>
        </button>

        <button
          onClick={() => setDeadlineFilter('NEXT_7_DAYS')}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
            deadlineFilter === 'NEXT_7_DAYS'
              ? 'bg-amber-600 text-white shadow-sm font-bold border-amber-600'
              : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">Next 7 Days</span>
          </div>
          <span className="font-bold text-sm text-amber-800 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
            {dueNext7DaysCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('COMPLETED')}
          className={`flex items-center justify-between p-2.5 rounded-lg border transition cursor-pointer ${
            filterStatus === 'COMPLETED'
              ? 'bg-emerald-600 text-white shadow-sm font-bold border-emerald-600'
              : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Accomplished</span>
          </div>
          <span className="font-bold text-sm text-emerald-700">
            {tasks.filter(t => t.status === 'COMPLETED').length}
          </span>
        </button>
      </div>

      {/* HEADER & MULTI-DIMENSIONAL CONTROLS (DEPT, CLOSER DEADLINES, STATUS, SCOPE) */}
      <div className="space-y-4 pb-5 border-b border-blue-100">
        
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2.5">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span>{isEmployee ? 'My Work & Department Action Plan' : t('tasks')}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isEmployee
                ? 'Track deliverables by department, filter by closer deadlines, and manage your assignments'
                : 'Action plan deliverables tracked live across departments with closer deadlines urgency sorting'}
            </p>
          </div>

          {/* Admin Actions: Clear All, Export Excel & Upload Action Plan */}
          {!isEmployee && (
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <button
                onClick={handleOpenAddTaskModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/30 transition cursor-pointer"
                title="Create a new deliverable task manually with full template schema"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Task Manually</span>
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleExportTasks(activeTab === 'COMPLETED' ? 'COMPLETED' : activeTab === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'ALL', 'xlsx')}
                  disabled={exportingTasks}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-l-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer shadow-sm"
                  title="Export deliverables to Excel (.xlsx) with all template columns"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{exportingTasks ? 'Exporting...' : 'Export Excel'}</span>
                </button>
                <button
                  onClick={() => handleExportTasks(activeTab === 'COMPLETED' ? 'COMPLETED' : activeTab === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'ALL', 'csv')}
                  disabled={exportingTasks}
                  className="flex items-center space-x-1 px-2.5 py-2 rounded-r-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-y border-r border-emerald-200 text-xs font-bold transition cursor-pointer shadow-sm"
                  title="Export to CSV (.csv)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>
              </div>

              {tasks.length > 0 && (
                <button
                  onClick={handleClearAllTasks}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer shadow-sm"
                  title="Wipe all deliverables to start with a clean slate"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear All</span>
                </button>
              )}

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>{t('uploadPlan') || 'Upload Plan (.xlsx)'}</span>
              </button>
            </div>
          )}
        </div>

        {/* DEDICATED TAB SWITCHER (Active, Pending Authorization, Completed Archive, All) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/70 p-2 rounded-xl border border-blue-200/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('ACTIVE'); setFilterStatus('ALL'); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-blue-100/60'
              }`}
            >
              Active Deliverables ({activeCount})
            </button>
            <button
              onClick={() => { setActiveTab('PENDING_APPROVAL'); setFilterStatus('ALL'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'PENDING_APPROVAL'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-amber-800 hover:bg-amber-100/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Authorization</span>
              {pendingApprovalCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('COMPLETED'); setFilterStatus('ALL'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Completed Tasks ({completedCount})</span>
            </button>
            <button
              onClick={() => { setActiveTab('ALL'); setFilterStatus('ALL'); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              All ({tasks.length})
            </button>
          </div>

          {/* Quick Download Tab Tasks */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleExportTasks(activeTab === 'COMPLETED' ? 'COMPLETED' : activeTab === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'ALL', 'xlsx')}
              disabled={exportingTasks}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-l-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition cursor-pointer shadow-sm"
              title="Export current tab to Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeTab === 'COMPLETED' ? 'Export Completed' : 'Export Tab'}</span>
            </button>
            <button
              onClick={() => handleExportTasks(activeTab === 'COMPLETED' ? 'COMPLETED' : activeTab === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'ALL', 'csv')}
              disabled={exportingTasks}
              className="px-2 py-1 rounded-r-lg bg-white border-y border-r border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-bold transition cursor-pointer shadow-sm"
              title="Export current tab to CSV"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          
          {/* Employee Sub-View Toggle (Individual Tasks vs Group Tasks) */}
          {isEmployee && (
            <div className="flex items-center bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs font-semibold">
              <button
                onClick={() => setEmployeeScope('INDIVIDUAL')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  employeeScope === 'INDIVIDUAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span>My Individual Tasks ({myIndividualTasks.length})</span>
              </button>
              <button
                onClick={() => setEmployeeScope('GROUP')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  employeeScope === 'GROUP'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-200" />
                <span>{employeeDept} Group Tasks ({groupTasks.length})</span>
              </button>
            </div>
          )}

          {/* FRONT PAGE DEPARTMENT FILTER (Admin Only) */}
          {!isEmployee && (
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-xs shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-slate-500 font-semibold hidden sm:inline">Dept:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL">All Departments</option>
                {availableDepts.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CLOSER DEADLINES SORT TOGGLE */}
          <button
            onClick={() => setCloserDeadlinesFirst(!closerDeadlinesFirst)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              closerDeadlinesFirst
                ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Sort deliverables by closest deadline first (overdue & urgent deadlines float to top)"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Closer Deadlines First</span>
            {closerDeadlinesFirst && (
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse ml-0.5" />
            )}
          </button>

          {/* CLOSER DEADLINES SCOPE FILTER PILLS */}
          <div className="flex items-center space-x-1 bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs font-semibold">
            <Calendar className="w-3 h-3 text-blue-600 ml-1.5 mr-0.5" />
            <button
              onClick={() => setDeadlineFilter('ALL')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                deadlineFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              All Dates
            </button>
            <button
              onClick={() => setDeadlineFilter('OVERDUE_TODAY')}
              className={`flex items-center space-x-1 px-2 py-1 rounded font-bold transition cursor-pointer ${
                deadlineFilter === 'OVERDUE_TODAY' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span>Overdue & Today</span>
              {overdueCount + dueTodayCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                  {overdueCount + dueTodayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setDeadlineFilter('NEXT_7_DAYS')}
              className={`flex items-center space-x-1 px-2 py-1 rounded font-bold transition cursor-pointer ${
                deadlineFilter === 'NEXT_7_DAYS' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span>Next 7 Days</span>
              {dueNext7DaysCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                  {dueNext7DaysCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setDeadlineFilter('NEXT_30_DAYS')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                deadlineFilter === 'NEXT_30_DAYS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Next 30 Days
            </button>
          </div>

          {/* STATUS FILTER PILLS */}
          <div className="flex items-center space-x-1 bg-blue-50/80 p-1 rounded-lg border border-blue-200 text-xs font-semibold">
            <Filter className="w-3 h-3 text-blue-600 ml-1.5 mr-0.5" />
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                filterStatus === 'PENDING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('IN_PROGRESS')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                filterStatus === 'IN_PROGRESS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                filterStatus === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Done
            </button>
          </div>

        </div>
      </div>

      {/* TASK CARDS LISTING WITH CLOSER DEADLINE URGENCY & BLUE & WHITE THEME */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">Loading deliverables...</div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400 italic bg-blue-50/30 rounded-xl border border-blue-100">
          No deliverables found matching the active department or deadline filters.
        </div>
      ) : (
        <div className="space-y-4">
          {displayTasks.map((task) => {
            const isCritical = task.priority === 'CRITICAL';
            const isHigh = task.priority === 'HIGH';
            const isMedium = task.priority === 'MEDIUM';
            const isIndividualMine = isMyTask(task);
            const dueInfo = getDaysUntilDue(task.dueDate, task.endDate);
            const isOverdue = task.status !== 'COMPLETED' && dueInfo.urgency === 'OVERDUE';
            const isDueToday = task.status !== 'COMPLETED' && dueInfo.urgency === 'TODAY';

            const assignees = task.assignedToMembers && task.assignedToMembers.length > 0
              ? task.assignedToMembers
              : task.assignedToName
              ? [{ id: task.assignedToId || 0, fullName: task.assignedToName, employeeCode: task.assignedToCode || '' }]
              : [];

            return (
              <div
                key={task.id}
                className={`border rounded-xl p-5 transition space-y-3.5 shadow-sm hover:shadow-md ${
                  isOverdue
                    ? 'border-rose-300 bg-rose-50/30 ring-1 ring-rose-200'
                    : isDueToday
                    ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200'
                    : isIndividualMine
                    ? 'border-blue-300 bg-blue-50/30 ring-1 ring-blue-200'
                    : 'bg-white border-blue-100 hover:border-blue-200'
                }`}
              >
                {/* Top Metadata Row: Task ID, Ownership, Department, Plan, Priority, Urgency & Deadlines */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Custom Task ID (e.g. R-01, A-01) from Excel */}
                    {task.customTaskId && (
                      <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
                        ID: {task.customTaskId}
                      </span>
                    )}

                    {/* Ownership Badge */}
                    {isIndividualMine ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-sm">
                        <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>My Individual Deliverable</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span>👥 {task.teamName || 'Group'} Task</span>
                      </span>
                    )}

                    {/* Department Tag */}
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <Building2 className="w-3 h-3 text-blue-600" />
                      <span>{task.teamName || 'General'}</span>
                    </span>

                    {/* Action Plan Title */}
                    <span className="text-[11px] text-slate-500 font-medium">
                      📁 {task.actionPlanTitle || 'Strategic Plan'}
                    </span>
                  </div>

                  {/* Priority, Urgency Badges & Date Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Dynamic Urgency Badge for Closer Deadlines */}
                    {task.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Accomplished</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse shadow-sm">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>🚨 {dueInfo.label}</span>
                      </span>
                    ) : isDueToday ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse shadow-sm">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>⚠️ Due Today</span>
                      </span>
                    ) : dueInfo.urgency === 'CRITICAL' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-300 shadow-sm">
                        <Clock className="w-3 h-3 text-orange-600" />
                        <span>⏳ Due Tomorrow</span>
                      </span>
                    ) : dueInfo.urgency === 'UPCOMING' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>⏳ {dueInfo.label}</span>
                      </span>
                    ) : null}

                    {/* Priority Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      isCritical
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isHigh
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : isMedium
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {task.priority} ({task.severityWeight}x Weight)
                    </span>

                    {/* This Week Plan Target */}
                    {task.thisWeekPlan && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span>🎯 Week Plan: {task.thisWeekPlan}</span>
                      </span>
                    )}

                    {/* Total Completed So Far */}
                    {task.totalCompletedSoFar && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span>📊 Done: {task.totalCompletedSoFar}</span>
                      </span>
                    )}

                    {/* Start Date */}
                    {task.startDate && (
                      <span className="inline-flex items-center space-x-1 text-xs text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Start: {task.startDate}</span>
                      </span>
                    )}

                    {/* End Date / Due Date */}
                    <span className={`inline-flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded border ${
                      isOverdue
                        ? 'text-rose-700 bg-rose-50 border-rose-200 font-bold'
                        : isDueToday
                        ? 'text-amber-800 bg-amber-50 border-amber-200 font-bold'
                        : 'text-slate-700 bg-blue-50/70 border-blue-200 font-semibold'
                    }`}>
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>End: {task.endDate || task.dueDate}</span>
                    </span>

                    {/* Admin-Only Delete Deliverable Action */}
                    {!isEmployee && (
                      <button
                        onClick={() => handleDeleteTask(task.id, task.title)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition border border-transparent hover:border-rose-200 cursor-pointer ml-1"
                        title="Admin Only: Delete Deliverable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Task Title & Full Scope Description */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                    <span>{task.title}</span>
                  </h3>

                  {task.description && (
                    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg text-xs text-slate-700 leading-relaxed">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Mitigation & Execution Details:
                      </div>
                      <p>{task.description}</p>
                    </div>
                  )}
                </div>

                {/* Assigned Staff Members Row (Supports 1 or Multiple People) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Assigned Team:</span>
                    {assignees.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Unassigned deliverable</span>
                    ) : (
                      assignees.map((member) => {
                        const isMe = currentUser?.userId === member.id;
                        return (
                          <span
                            key={member.id}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isMe
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                : 'bg-blue-50 border-blue-100 text-blue-800'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isMe ? 'bg-white' : 'bg-emerald-500'}`} />
                            <span>{member.fullName}</span>
                            {member.employeeCode && (
                              <span className="text-[10px] opacity-80">({member.employeeCode})</span>
                            )}
                            {isMe && (
                              <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] bg-white text-blue-700 font-bold">
                                You
                              </span>
                            )}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Multi-Person Delegator Combobox (Admin Mode) */}
                  {!isEmployee && (
                    <TaskAssignmentCombobox
                      taskId={task.id}
                      currentAssignedId={task.assignedToId}
                      currentAssignedIds={task.assignedToIds}
                      currentAssignedMembers={task.assignedToMembers}
                      token={token}
                      onAssigned={() => {
                        onTaskUpdated();
                        fetchTasks();
                      }}
                      refreshTrigger={refreshTrigger}
                    />
                  )}
                </div>

                {/* Authorization & Quality Rating Banner (if authorized) */}
                {task.authorizedBy && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 bg-blue-50/70 px-3 py-2 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Authorized By: </span>
                        <span>{task.authorizedBy}</span>
                        {task.qualityRating !== undefined && (
                          <span className="ml-2 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            ⭐ Work Quality: {task.qualityRating}/10
                          </span>
                        )}
                        {task.authorizationNote && (
                          <span className="ml-2 text-slate-600 italic">
                            &bull; "{task.authorizationNote}"
                          </span>
                        )}
                      </div>
                    </div>
                    {!isEmployee && (
                      <button
                        onClick={() => {
                          setTaskToAuthorize(task);
                          setQualityRating(task.qualityRating || 9);
                          setAdminAuthNote(task.authorizationNote || '');
                        }}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        Adjust Quality Rating
                      </button>
                    )}
                  </div>
                )}

                {/* Pending Approval Banner */}
                {task.status === 'PENDING_APPROVAL' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-amber-50/80 border border-amber-300 text-xs">
                    <div className="flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-bold text-amber-900">Submitted for Review: </span>
                        <span className="text-slate-800 font-semibold">{task.submittedByName || task.assignedToName || 'Staff Member'}</span>
                        {task.completionNote && (
                          <p className="text-slate-600 italic mt-0.5 font-medium">"{task.completionNote}"</p>
                        )}
                      </div>
                    </div>
                    {!isEmployee ? (
                      <button
                        onClick={() => {
                          setTaskToAuthorize(task);
                          setQualityRating(task.qualityRating || 9);
                          setAdminAuthNote(task.authorizationNote || '');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm shadow-amber-600/30 flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authorize & Rate Work (1-10)</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-1 rounded border border-amber-200">
                        Awaiting Administrator authorization
                      </span>
                    )}
                  </div>
                )}

                {/* Completion Note Banner (if recorded and not yet authorized) */}
                {task.completionNote && !task.authorizedBy && task.status !== 'PENDING_APPROVAL' && (
                  <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900">Completion Note: </span>
                      <span>"{task.completionNote}"</span>
                      {task.completedAt && (
                        <span className="text-[10px] text-emerald-700 ml-2">
                          &bull; Recorded: {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Row: Interactive Status Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">Current Status:</span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : task.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {task.status === 'PENDING_APPROVAL' ? 'PENDING AUTHORIZATION' : task.status}
                    </span>
                  </div>

                  {/* Status Action Buttons (Admin OR Assigned Employee Only) */}
                  {(!isEmployee || isIndividualMine) ? (
                    <div className="flex items-center space-x-1.5 bg-blue-50/80 p-1 rounded-lg border border-blue-200">
                      <button
                        onClick={() => handleStatusChange(task, 'PENDING')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                          task.status === 'PENDING'
                            ? 'bg-amber-500 text-white font-bold shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleStatusChange(task, 'IN_PROGRESS')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                          task.status === 'IN_PROGRESS'
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'text-slate-600 hover:text-blue-700'
                        }`}
                      >
                        In Progress
                      </button>
                      
                      {isEmployee ? (
                        <button
                          onClick={() => {
                            setTaskToSubmit(task);
                            setEmployeeSubmitNote(task.completionNote || '');
                          }}
                          className={`px-3 py-1 text-xs rounded-md font-bold transition cursor-pointer ${
                            task.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : task.status === 'COMPLETED'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                          }`}
                        >
                          {task.status === 'PENDING_APPROVAL' ? 'Submitted' : task.status === 'COMPLETED' ? 'Completed' : 'Mark Finished'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setTaskToAuthorize(task);
                            setQualityRating(task.qualityRating || 9);
                            setAdminAuthNote(task.authorizationNote || '');
                          }}
                          className={`px-3 py-1 text-xs rounded-md font-bold transition cursor-pointer ${
                            task.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-600 text-white shadow-sm animate-pulse'
                              : task.status === 'COMPLETED'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                          }`}
                        >
                          {task.status === 'PENDING_APPROVAL'
                            ? 'Authorize & Rate'
                            : task.status === 'COMPLETED'
                            ? `Authorized (${task.qualityRating || 8}/10)`
                            : 'Authorize & Complete'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="italic">
                        Colleague Deliverable ({task.assignedToName || 'Department Team'})
                      </span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD ACTION PLAN MODAL (WITH DEPARTMENT SELECTION & AUTO-PROVISIONING) */}
      {!isEmployee && showUploadModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUploadModal(false); }}
        >
          <div className="bg-white border border-blue-100 rounded-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-800" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>Upload Action Plan (Excel / CSV)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Ingests tasks with Start Date, End Date, Task ID, and auto-provisions staff accounts.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Department Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1.5 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Select Responsible Department / Team:</span>
                </label>
                <select
                  value={uploadDept}
                  onChange={(e) => setUploadDept(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2.5 text-xs text-slate-800 font-bold focus:bg-white focus:outline-none focus:border-blue-600 transition"
                >
                  {availableDepts.length === 0 && (
                    <option value="__NEW__">+ Create New Department / Group...</option>
                  )}
                  {availableDepts.map(d => {
                    const matchTeam = systemTeams.find(t => t.teamName === d);
                    const label = matchTeam?.teamNameAm && matchTeam.teamNameAm !== d
                      ? `${d} (${matchTeam.teamNameAm})`
                      : d;
                    return (
                      <option key={d} value={d}>{label}</option>
                    );
                  })}
                  {availableDepts.length > 0 && (
                    <option value="__NEW__">+ New Department...</option>
                  )}
                </select>
                {(uploadDept === '__NEW__' || availableDepts.length === 0) && (
                  <input
                    type="text"
                    value={uploadCustomDept}
                    onChange={(e) => setUploadCustomDept(e.target.value)}
                    placeholder="Enter department name for this action plan..."
                    className="mt-1.5 w-full bg-white border border-blue-400 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  All tasks from this plan and any newly auto-created staff will be assigned to this department.
                </p>
              </div>

              {/* Action Plan Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Action Plan Title:
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g. ModelBank Migration & DLM Cycles"
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Download Official Template Buttons */}
              <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Standard Template (S.No, Tasks, Start Date, End Date, This Week Plan, Status, Total Completed So Far):</span>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href="/api/action-plans/template?format=xlsx"
                    download="action_plan_template.xlsx"
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template (.xlsx)</span>
                  </a>
                  <a
                    href="/api/action-plans/template?format=csv"
                    download="action_plan_template.csv"
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-blue-50 text-emerald-700 text-xs font-semibold border border-blue-200 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template (.csv)</span>
                  </a>
                </div>
              </div>

              {/* Choose File / Test Button */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  3. Select Excel (.xlsx) or CSV (.csv) File:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleExecuteUpload(true)}
                    disabled={uploading}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition cursor-pointer shadow-sm"
                    title="Load the verified CBS Implementation deliverables directly"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Use Sample Plan</span>
                  </button>
                </div>
              </div>

              {/* Auto-Creation Notice */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center space-x-1 text-emerald-900">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automatic User Provisioning:</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  If an assigned person in the Excel file doesn't exist, an account is automatically created using their first name, default password <code className="bg-white px-1 py-0.5 rounded font-bold text-emerald-900 border border-emerald-300">123456</code>, and duplicate name handling with '1' suffix.
                </p>
              </div>

              {/* Upload Result Status */}
              {uploadResult && (
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-xs text-emerald-900 font-semibold">
                  ✅ Successfully ingested {uploadResult.count} deliverables into <strong>{uploadResult.department}</strong>. Auto-created {uploadResult.autoCreatedEmployeesCount} new staff accounts!
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteUpload(false)}
                disabled={uploading}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                {uploading ? (
                  <span>Processing & Ingesting...</span>
                ) : (
                  <>
                    <span>Upload & Process Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION NOTE MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4 text-slate-800">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Deliverable Accomplishment</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Complete: {selectedTask.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Provide optional completion notes, test URLs, or deliverables details to push to the live office ticker.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('completionNotes')}
              </label>
              <textarea
                rows={3}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="e.g. Completed schemas, pushed PR #42, tested in staging environment..."
                className="w-full bg-slate-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCompletionWithNote}
                disabled={updating}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-600/30 cursor-pointer"
              >
                {updating ? "Saving..." : "Submit Completion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT ABSENCE MODAL (DIRECT EMPLOYEE ABSENCE FILING) */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-800">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Report Absence</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Instantly alerts administration and updates attendance status.</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={absenceStartDate}
                    onChange={(e) => {
                      setAbsenceStartDate(e.target.value);
                      if (absenceEndDate < e.target.value) setAbsenceEndDate(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    min={absenceStartDate}
                    value={absenceEndDate}
                    onChange={(e) => setAbsenceEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono transition"
                  />
                </div>
              </div>

              {/* Multi-Day Summary Pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-100 text-xs">
                <span className="text-slate-600 font-medium">Total Duration:</span>
                <span className="font-bold text-rose-700">
                  {getAbsenceDaysCount()} {getAbsenceDaysCount() > 1 ? 'Days (Multi-Day Notice)' : 'Day'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Absence Category
                </label>
                <select
                  value={absenceCategory}
                  onChange={(e) => setAbsenceCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer transition"
                >
                  <option value="MEDICAL">Medical Leave / Sick Leave</option>
                  <option value="EMERGENCY">Family Emergency</option>
                  <option value="OFFSITE">Off-site Customer / Partner Engagement</option>
                  <option value="OTHER">Other / Personal Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason & Mitigation Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Supporting Ge'ez (አማርኛ, ትግርኛ) and Qubee diacritics..."
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
                  disabled={absenceSubmitting}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-600/30 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{absenceSubmitting ? "Submitting..." : "Submit Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN AUTHORIZE & QUALITY RATING (1-10) MODAL */}
      {!isEmployee && taskToAuthorize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-800">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Authorize Deliverable & Rate Quality</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Evaluate completion and assign rating (1 to 10) for performance metrics</p>
                </div>
              </div>
              <button
                onClick={() => setTaskToAuthorize(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Info Summary */}
            <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-900 text-sm">{taskToAuthorize.title}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-blue-800">Dept: {taskToAuthorize.teamName || 'General'}</span>
                <span>&bull;</span>
                <span>Assigned To: <strong className="text-slate-800">{taskToAuthorize.assignedToName || 'Staff'}</strong></span>
                {taskToAuthorize.dueDate && (
                  <>
                    <span>&bull;</span>
                    <span className="font-mono text-slate-500">Deadline: {taskToAuthorize.dueDate}</span>
                  </>
                )}
              </div>
              {taskToAuthorize.completionNote && (
                <div className="pt-1.5 border-t border-blue-100/80 text-xs text-slate-700">
                  <span className="font-bold text-slate-800">Staff Submission Note: </span>
                  <span className="italic">"{taskToAuthorize.completionNote}"</span>
                </div>
              )}
            </div>

            {/* Quality Rating (1 to 10) Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Work Quality Rating (1 to 10):
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                  {qualityRating === 10 ? '⭐ 10/10 Exceptional' :
                   qualityRating === 9 ? '⭐ 9/10 Outstanding' :
                   qualityRating === 8 ? '⭐ 8/10 Very Good' :
                   qualityRating === 7 ? '⭐ 7/10 Good' :
                   qualityRating === 6 ? '⭐ 6/10 Satisfactory' :
                   qualityRating === 5 ? '5/10 Average' :
                   `${qualityRating}/10 Needs Improvement`}
                </span>
              </div>

              {/* 1 to 10 Grid Buttons */}
              <div className="grid grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQualityRating(num)}
                    className={`py-2 rounded-lg text-center font-bold text-xs transition cursor-pointer border ${
                      qualityRating === num
                        ? num >= 9
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                          : num >= 7
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                          : num >= 5
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                          : 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-blue-50 border-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                ⚡ This score directly weights the points earned by the employee in the Performance Leaderboard & Hall of Fame.
              </p>
            </div>

            {/* Admin Authorization / Feedback Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Review Notes & Feedback (Optional):
              </label>
              <textarea
                rows={2}
                value={adminAuthNote}
                onChange={(e) => setAdminAuthNote(e.target.value)}
                placeholder="e.g. Great job adhering to ModelBank architecture guidelines and on-time delivery..."
                className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleAuthorizeTask(false)}
                disabled={authorizing}
                className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                title="Send task back to employee for revisions"
              >
                Request Revisions
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setTaskToAuthorize(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAuthorizeTask(true)}
                  disabled={authorizing}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{authorizing ? 'Saving...' : `Authorize & Approve (${qualityRating}/10)`}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EMPLOYEE SUBMIT FOR COMPLETION MODAL */}
      {isEmployee && taskToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-800">
            
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Deliverable for Review</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Sends an instant review message to the Administrator</p>
                </div>
              </div>
              <button
                onClick={() => setTaskToSubmit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 text-xs">{taskToSubmit.title}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Deadline: {taskToSubmit.dueDate || taskToSubmit.endDate || 'No Deadline'} &bull; Weight: {taskToSubmit.severityWeight}x
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Accomplishment Details & Notes for Admin:
              </label>
              <textarea
                rows={3}
                required
                value={employeeSubmitNote}
                onChange={(e) => setEmployeeSubmitNote(e.target.value)}
                placeholder="Explain what was completed, link to documentation, or mention CBS deliverables..."
                className="w-full bg-slate-50 border border-blue-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[11px] text-amber-900 leading-relaxed font-medium">
              ℹ️ Once submitted, the Administrator will be alerted via private message to review your work and assign a quality rating from 1 to 10.
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTaskToSubmit(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTaskForApproval}
                disabled={submittingCompletion}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/30 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingCompletion ? "Submitting..." : "Submit for Authorization"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD TASK MANUALLY MODAL (FULL TEMPLATE COLUMNS) */}
      {!isEmployee && showAddTaskModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddTaskModal(false); }}
        >
          <div className="bg-white border border-blue-100 rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 my-auto">
            
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-blue-100 shrink-0 bg-white">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">New Action Plan Deliverable (Template Schema)</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    Manually register a deliverable matching the full master action plan template columns.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body (Smooth touch scroll, isolated from background) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <form id="create-manual-task-form" onSubmit={handleCreateTaskManually} className="space-y-4">
              
              {/* Row 1: S.No + Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    S.No / Deliverable ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={taskFormCustomId}
                    onChange={(e) => setTaskFormCustomId(e.target.value)}
                    placeholder="e.g. CBS-01, CBS-02, 1.1"
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: S.No</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department / Team <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={taskFormDept}
                    onChange={(e) => setTaskFormDept(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  >
                    {availableDepts.length === 0 && (
                      <option value="__NEW__">+ Create New Department / Group...</option>
                    )}
                    {availableDepts.map(d => {
                      const matchTeam = systemTeams.find(t => t.teamName === d);
                      const label = matchTeam?.teamNameAm && matchTeam.teamNameAm !== d
                        ? `${d} (${matchTeam.teamNameAm})`
                        : d;
                      return (
                        <option key={d} value={d}>{label}</option>
                      );
                    })}
                    {availableDepts.length > 0 && (
                      <option value="__NEW__">+ New Department...</option>
                    )}
                  </select>
                  {taskFormDept === '__NEW__' && (
                    <input
                      type="text"
                      required
                      value={taskFormCustomDept}
                      onChange={(e) => setTaskFormCustomDept(e.target.value)}
                      placeholder="Enter new department name..."
                      className="mt-1.5 w-full bg-white border border-blue-400 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  )}
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Department</span>
                </div>
              </div>

              {/* Row 2: Deliverable Tasks Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tasks / Deliverable Title <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={taskFormTitle}
                  onChange={(e) => setTaskFormTitle(e.target.value)}
                  placeholder="e.g. Prepare the test case for 3rd party integration and interface of the bank software..."
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition leading-relaxed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Tasks</span>
              </div>

              {/* Row 3: Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={taskFormStartDate}
                    onChange={(e) => setTaskFormStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Start Date</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date (Due Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={taskFormDueDate}
                    onChange={(e) => setTaskFormDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: End Date</span>
                </div>
              </div>

              {/* Row 4: This Week Plan + Status + Total Completed So Far */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    This Week Plan
                  </label>
                  <input
                    type="text"
                    value={taskFormWeekPlan}
                    onChange={(e) => setTaskFormWeekPlan(e.target.value)}
                    placeholder="e.g. 10%, 50%, 1.0"
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: This Week Plan</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={taskFormStatus}
                    onChange={(e) => setTaskFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="PENDING">⏳ PENDING (Not Started)</option>
                    <option value="IN_PROGRESS">⚡ IN_PROGRESS (Active)</option>
                    <option value="COMPLETED">✅ COMPLETED</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Status</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Completed So Far
                  </label>
                  <input
                    type="text"
                    value={taskFormCompletedSoFar}
                    onChange={(e) => setTaskFormCompletedSoFar(e.target.value)}
                    placeholder="e.g. 0%, 88%, 100%"
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Total Completed So Far</span>
                </div>
              </div>

              {/* Row 5: Priority & Assigned Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority / Severity Weight
                  </label>
                  <select
                    value={taskFormPriority}
                    onChange={(e) => setTaskFormPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="CRITICAL">🔴 CRITICAL (4x Weight)</option>
                    <option value="HIGH">🟠 HIGH (3x Weight)</option>
                    <option value="MEDIUM">🔵 MEDIUM (2x Weight)</option>
                    <option value="LOW">⚪ LOW (1x Weight)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Weights calculate leaderboard & completion rates</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign Staff Member
                  </label>
                  <select
                    value={taskFormAssignedId}
                    onChange={(e) => setTaskFormAssignedId(e.target.value)}
                    className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="">-- Unassigned (Department Pool) --</option>
                    {availableStaff.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode}) {emp.status === 'ABSENT' ? '🔴 Absent' : '🟢 Present'}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Assigned Staff / Owner</span>
                </div>
              </div>

              {/* Row 6: Status / Impact Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status / Interface Impact Notes (Optional)
                </label>
                <input
                  type="text"
                  value={taskFormImpact}
                  onChange={(e) => setTaskFormImpact(e.target.value)}
                  placeholder="e.g. 190+ 3rd party integration and interface of bank software"
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Template Column: Impact / Status Description</span>
              </div>

              {/* Row 7: Description / Next Steps */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Mitigation / Next Steps (Optional)
                </label>
                <textarea
                  rows={2}
                  value={taskFormDescription}
                  onChange={(e) => setTaskFormDescription(e.target.value)}
                  placeholder="Optional details, instructions, acceptance criteria, or mitigation plans..."
                  className="w-full bg-slate-50 border border-blue-200 rounded-lg p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition leading-relaxed"
                />
              </div>

              </form>
            </div>

            {/* Modal Footer (Fixed at bottom, always accessible) */}
            <div className="flex items-center justify-end space-x-2 p-3 sm:p-4 border-t border-slate-100 bg-slate-50/90 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-manual-task-form"
                disabled={creatingTask}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{creatingTask ? "Creating Deliverable..." : "Create Deliverable Task"}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
