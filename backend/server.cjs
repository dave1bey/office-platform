/**
 * Standalone Zero-Install Full-Stack Server
 * Port: 8080
 * Serves:
 * 1. The Real Production-Built React 18 / Vite PWA Frontend (c:\Users\HP\H\frontend\dist)
 * 2. All REST APIs (/api/auth, /api/tasks, /api/attendance, /api/analytics, /api/action-plans)
 * 3. Real-Time STOMP WebSocket Broker (/ws-attendance)
 * 4. Multi-sheet UTF-8 Ge'ez Excel Exporter
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const net = require('net');
const zlib = require('zlib');
const os = require('os');
const { exec } = require('child_process');

let PORT = process.env.PORT ? parseInt(process.env.PORT) : 8090;
const DIST_DIR = path.resolve(__dirname, '..', 'frontend', 'dist');

// Timezone-safe local calendar date helper (YYYY-MM-DD) avoiding UTC day-shift
function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// In-Memory Database Seed
const teams = [
  { id: 1, teamName: "Development", teamNameAm: "የልማት ቡድን", teamNameTi: "ናይ ምዕባለ ጋንታ", teamNameOm: "Garee Misoomaa" },
  { id: 2, teamName: "Quality Assurance", teamNameAm: "የጥራት ማረጋገጫ", teamNameTi: "ምርግጋጽ ጽሬት", teamNameOm: "Mirkaneessa Qulqullinaa" },
  { id: 3, teamName: "Operations", teamNameAm: "ኦፕሬሽን", teamNameTi: "ኦፕሬሽን", teamNameOm: "Hojii Gaggeessituu" }
];

const employees = [
  { id: 1, employeeCode: "EMP-001", fullName: "Admin User", email: "admin@office.lan", password: "password123", role: "ADMIN", preferredLang: "en", teams: ["Development"] },
  { id: 2, employeeCode: "EMP-002", fullName: "Abebe Bikila", email: "abebe@office.lan", password: "password123", role: "EMPLOYEE", originalRole: "EMPLOYEE", isTemporaryAdmin: false, temporaryAdminUntil: null, preferredLang: "am", teams: ["Development"] },
  { id: 3, employeeCode: "EMP-003", fullName: "Hagos Berhe", email: "hagos@office.lan", password: "password123", role: "EMPLOYEE", originalRole: "EMPLOYEE", isTemporaryAdmin: false, temporaryAdminUntil: null, preferredLang: "ti", teams: ["Development"] },
  { id: 4, employeeCode: "EMP-004", fullName: "Tolassa Chala", email: "tolassa@office.lan", password: "password123", role: "EMPLOYEE", originalRole: "EMPLOYEE", isTemporaryAdmin: false, temporaryAdminUntil: null, preferredLang: "om", teams: ["Quality Assurance"] },
  { id: 5, employeeCode: "EMP-005", fullName: "Sara Tesfaye", email: "sara@office.lan", password: "password123", role: "EMPLOYEE", originalRole: "EMPLOYEE", isTemporaryAdmin: false, temporaryAdminUntil: null, preferredLang: "am", teams: ["Operations"] }
];

let today = getLocalDateString();

let attendanceRecords = [
  { id: 1, employeeId: 3, attendanceDate: today, checkIn: new Date().toISOString(), status: "PRESENT" },
  { id: 2, employeeId: 4, attendanceDate: today, checkIn: new Date().toISOString(), status: "PRESENT" }
];

// Clean slate for deliverables: all mock task data removed as requested
let tasks = [];

// Hall of Fame Awards Store (Employee of the Week, Month, Year)
let customAwards = {
  week: null,
  month: null,
  year: null
};

// Active WebSocket Clients & Subscriptions
const wsClients = new Set();
let latestAbsenceAlert = null;

// Communication Messages Store
let messages = [
  {
    id: 1,
    senderId: 1,
    senderName: "Admin User",
    senderRole: "ADMIN",
    recipientType: "ALL",
    recipientId: null,
    recipientName: "All Staff",
    content: "Welcome to the new operational platform. Please review your Q4 action items and report any planned absences ahead of time.",
    createdAt: new Date().toISOString()
  }
];

function broadcastStompMessage(topic, payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);

  for (const client of wsClients) {
    try {
      if (!client.isRawWs || !client.socket || client.socket.destroyed) continue;

      let subId = null;
      if (client.subscriptions && client.subscriptions.has(topic)) {
        subId = client.subscriptions.get(topic);
      } else if (client.subscriptions) {
        // If subscribed with wildcard or prefix
        for (const [subTopic, id] of client.subscriptions.entries()) {
          if (subTopic === topic || (subTopic.endsWith('/**') && topic.startsWith(subTopic.slice(0, -3)))) {
            subId = id;
            break;
          }
        }
      }

      // Dispatch to clients that explicitly subscribed to this topic
      if (subId !== null) {
        const frame = `MESSAGE\ndestination:${topic}\ncontent-type:application/json\nsubscription:${subId}\nmessage-id:${Date.now()}-${Math.floor(Math.random() * 100000)}\ncontent-length:${Buffer.byteLength(body)}\n\n${body}\0`;
        sendWsFrame(client.socket, frame);
      }
    } catch (e) {
      console.error("Error broadcasting STOMP frame", e.message);
    }
  }
}

// Helper: Calculate array of YYYY-MM-DD dates in a date range (UTC-safe)
function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const todayStr = getLocalDateString();
  const startStr = startDateStr || todayStr;
  const endStr = endDateStr || startStr;

  const startMatch = String(startStr).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const endMatch = String(endStr).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

  if (!startMatch || !endMatch) {
    return [startStr];
  }

  const startUtc = Date.UTC(parseInt(startMatch[1]), parseInt(startMatch[2]) - 1, parseInt(startMatch[3]));
  const endUtc = Date.UTC(parseInt(endMatch[1]), parseInt(endMatch[2]) - 1, parseInt(endMatch[3]));

  if (startUtc > endUtc) {
    return [startStr];
  }

  let curUtc = startUtc;
  while (curUtc <= endUtc) {
    const d = new Date(curUtc);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    curUtc += 24 * 60 * 60 * 1000;
  }
  return dates;
}

// Calculate Leaderboard with Weighted Accomplishment Rate and Date Filtering (Day, Week, Year, All)
function syncTemporaryAdminStatus(emp) {
  if (!emp) return emp;
  if (emp.id === 1) {
    emp.role = 'ADMIN';
    return emp;
  }
  if (emp.temporaryAdminUntil) {
    const expiry = new Date(emp.temporaryAdminUntil).getTime();
    if (Date.now() > expiry) {
      // Automatically expired
      emp.role = emp.originalRole || 'EMPLOYEE';
      emp.temporaryAdminUntil = null;
      emp.temporaryAdminGrantedAt = null;
      emp.isTemporaryAdmin = false;
      emp.temporaryAdminReason = null;
    } else {
      emp.role = 'ADMIN';
      emp.isTemporaryAdmin = true;
    }
  } else {
    emp.role = emp.originalRole || 'EMPLOYEE';
    emp.isTemporaryAdmin = false;
  }
  return emp;
}

function computeLeaderboard(period = 'all', teamFilter = 'ALL') {
  employees.forEach(syncTemporaryAdminStatus);
  const now = new Date();
  const todayStr = getLocalDateString(now);

  // Week bounds: Monday to Sunday in local calendar
  const dayOfWeek = now.getDay() || 7;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
  const startOfWeekStr = getLocalDateString(startOfWeek);
  const endOfWeekStr = getLocalDateString(endOfWeek);

  // Month bounds: 1st of month to last day of month in local calendar
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfMonthStr = getLocalDateString(startOfMonth);
  const endOfMonthStr = getLocalDateString(endOfMonth);

  // Year bounds
  const currentYearStr = String(now.getFullYear());
  const startOfYearStr = `${currentYearStr}-01-01`;
  const endOfYearStr = `${currentYearStr}-12-31`;

  // Determine working days baseline for absence rate calculation
  let workingDays = 20;
  if (period === 'day') workingDays = 1;
  else if (period === 'week') workingDays = 5;
  else if (period === 'month') workingDays = 22;
  else if (period === 'year') workingDays = 240;

  // Filter tasks by period (supports range overlap: taskStart <= periodEnd && taskEnd >= periodStart)
  const filterTaskByPeriod = (t) => {
    if (period === 'all') return true;
    const taskStart = t.startDate || t.dueDate || t.endDate;
    const taskEnd = t.endDate || t.dueDate || t.startDate;
    if (!taskStart && !taskEnd) return true;
    const s = taskStart || taskEnd;
    const e = taskEnd || taskStart;

    if (period === 'day') {
      return (s <= todayStr && e >= todayStr) || t.dueDate === todayStr || t.startDate === todayStr || t.endDate === todayStr;
    }
    if (period === 'week') {
      return (s <= endOfWeekStr && e >= startOfWeekStr);
    }
    if (period === 'month') {
      return (s <= endOfMonthStr && e >= startOfMonthStr);
    }
    if (period === 'year') {
      return (s <= endOfYearStr && e >= startOfYearStr);
    }
    return true;
  };

  // Filter attendance records by period
  const filterAttendanceByPeriod = (r) => {
    if (period === 'all') return true;
    const attDate = r.attendanceDate;
    if (!attDate) return true;
    if (period === 'day') {
      return attDate === todayStr;
    }
    if (period === 'week') {
      return (attDate >= startOfWeekStr && attDate <= endOfWeekStr);
    }
    if (period === 'month') {
      return (attDate >= startOfMonthStr && attDate <= endOfMonthStr);
    }
    if (period === 'year') {
      return attDate.startsWith(currentYearStr);
    }
    return true;
  };

  // Filter target employees by team
  const targetEmployees = (teamFilter && teamFilter !== 'ALL')
    ? employees.filter(e => e.teams && e.teams.includes(teamFilter))
    : employees;

  const results = targetEmployees.map((emp) => {
    const empTasks = tasks.filter(t => 
      ((t.assignedToIds && t.assignedToIds.includes(emp.id)) || t.assignedToId === emp.id) &&
      filterTaskByPeriod(t)
    );
    const totalTasks = empTasks.length;
    const completedTasks = empTasks.filter(t => t.status === 'COMPLETED').length;

    let totalWeight = 0;
    let completedWeight = 0;
    for (const t of empTasks) {
      const w = t.severityWeight || 2;
      totalWeight += w;
      if (t.status === 'COMPLETED') completedWeight += w;
    }

    const unweightedTaskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;
    const weightedTaskRate = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 1000) / 10 : 0;

    const empAtt = attendanceRecords.filter(r => r.employeeId === emp.id && filterAttendanceByPeriod(r));
    const absentRecords = empAtt.filter(r => r.status === 'ABSENT').map(r => ({
      id: r.id,
      attendanceDate: r.attendanceDate,
      status: r.status,
      absenceCategory: r.absenceCategory || 'UNEXCUSED',
      reason: r.reason || 'No detailed reason specified',
      filedBy: r.filedBy || 'Self-Reported',
      filedAt: r.filedAt || null
    })).sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
    const absentDays = absentRecords.length;
    const absenceRate = Math.round((absentDays / workingDays) * 1000) / 10;
    const reliability = Math.max(0, 100 - absenceRate);
    const overallScore = Math.round(((0.70 * weightedTaskRate) + (0.30 * reliability)) * 10) / 10;

    // Default-Present Model: Assume PRESENT unless explicitly marked ABSENT for today
    const todayRec = attendanceRecords.find(r => r.employeeId === emp.id && r.attendanceDate === todayStr);
    const todayStatus = (todayRec && todayRec.status === 'ABSENT') ? "ABSENT" : "PRESENT";

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      teamName: emp.teams[0] || "General",
      period,
      totalTasks,
      completedTasks,
      totalWeight,
      completedWeight,
      unweightedTaskRate,
      weightedTaskRate,
      recordedAbsentDays: absentDays,
      totalWorkingDays: workingDays,
      absenceRate,
      reliabilityRate: Math.round(reliability * 10) / 10,
      overallScore,
      todayAttendanceStatus: todayStatus,
      absentRecords,
      absentDates: absentRecords.map(r => r.attendanceDate),
      taskRank: 1,
      absenceRank: 1
    };
  }).sort((a, b) => b.weightedTaskRate - a.weightedTaskRate).map((item, idx) => {
    item.taskRank = idx + 1;
    return item;
  });

  // Calculate absenceRank based on recordedAbsentDays descending (or absenceRate descending)
  const byAbsence = [...results].sort((a, b) => b.recordedAbsentDays - a.recordedAbsentDays || b.absenceRate - a.absenceRate);
  byAbsence.forEach((item, idx) => {
    const found = results.find(r => r.employeeId === item.employeeId);
    if (found) found.absenceRank = idx + 1;
  });

  return results;
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  const json = (data, code = 200) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  const readBody = (callback) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { callback(data ? JSON.parse(data) : {}); }
      catch (e) { callback({}); }
    });
  };

  // SockJS Handshake
  if (pathname.includes('/ws-attendance/info')) {
    json({
      websocket: true,
      origins: ["*:*"],
      cookie_needed: false,
      entropy: Math.floor(Math.random() * 2147483647)
    });
    return;
  }

  // System: Network & Mobile Access Info (for Android and iOS app installation)
  if (pathname === '/api/system/network-info' && req.method === 'GET') {
    const ifaces = os.networkInterfaces();
    const addresses = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          addresses.push({ iface: name, ip: addr.address, url: `http://${addr.address}:${PORT}/` });
        }
      }
    }
    json({
      port: PORT,
      localUrl: `http://localhost:${PORT}/`,
      networkUrls: addresses,
      primaryLanUrl: addresses[0] ? addresses[0].url : `http://localhost:${PORT}/`
    });
    return;
  }

  // --- REST APIS ---

  // Helper: Retrieve authenticated user and sync acting admin status (supports Header and Query token)
  const getRequester = () => {
    let token = '';
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (authHeader) {
      token = authHeader.trim();
    } else if (parsedUrl.query && parsedUrl.query.token) {
      token = String(parsedUrl.query.token).replace(/^Bearer\s+/i, '').trim();
    }

    if (token.startsWith('demo_jwt_token_')) {
      const id = parseInt(token.replace('demo_jwt_token_', ''));
      const found = employees.find(e => e.id === id);
      if (found) {
        syncTemporaryAdminStatus(found);
        return found;
      }
    }
    return null;
  };

  // Security Guard: Protect all /api/admin/* routes
  if (pathname.startsWith('/api/admin/')) {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required." }, 403);
      return;
    }
  }

  // Teams: List All with Members
  if (pathname === '/api/teams' && req.method === 'GET') {
    const teamsWithMembers = teams.map(t => {
      const members = employees.filter(e => e.teams && e.teams.includes(t.teamName));
      return {
        ...t,
        members: members.map(m => ({ id: m.id, fullName: m.fullName, employeeCode: m.employeeCode }))
      };
    });
    json(teamsWithMembers);
    return;
  }

  // Admin: Create Group / Team with Users Assigned to it
  if (pathname === '/api/admin/teams' && req.method === 'POST') {
    readBody(body => {
      const teamName = (body.teamName || '').trim();
      if (!teamName) {
        json({ error: "Team name is required" }, 400);
        return;
      }

      const newTeam = {
        id: teams.length + 1,
        teamName,
        teamNameAm: body.teamNameAm || teamName,
        teamNameTi: body.teamNameTi || teamName,
        teamNameOm: body.teamNameOm || teamName,
        description: body.description || ""
      };

      teams.push(newTeam);

      // Assign selected employees to this team
      const memberIds = Array.isArray(body.memberIds) ? body.memberIds.map(Number) : [];
      employees.forEach(emp => {
        if (memberIds.includes(emp.id)) {
          if (!emp.teams) emp.teams = [];
          if (!emp.teams.includes(teamName)) emp.teams.push(teamName);
        }
      });

      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'TEAM_CREATED',
        title: 'New Team Created',
        message: `Admin created team '${teamName}' with ${memberIds.length} members`,
        employeeName: 'Admin User',
        severity: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      json({ success: true, team: newTeam });
    });
    return;
  }

  // Admin: Delete Department / Team
  if ((pathname.startsWith('/api/admin/teams/') || pathname.startsWith('/api/teams/')) && req.method === 'DELETE') {
    const idOrName = pathname.replace(/^\/api\/(admin\/)?teams\//, '').trim();
    const teamId = parseInt(idOrName);

    let teamIndex = -1;
    if (!isNaN(teamId)) {
      teamIndex = teams.findIndex(t => t.id === teamId);
    }
    if (teamIndex === -1) {
      const decodedName = decodeURIComponent(idOrName).toLowerCase();
      teamIndex = teams.findIndex(t => t.teamName.toLowerCase() === decodedName);
    }

    if (teamIndex === -1) {
      json({ error: "Department not found" }, 404);
      return;
    }

    const teamToDelete = teams[teamIndex];
    const teamName = teamToDelete.teamName;

    // Remove team from teams list
    teams.splice(teamIndex, 1);

    // Remove team from all employees.teams lists
    employees.forEach(emp => {
      if (emp.teams && Array.isArray(emp.teams)) {
        emp.teams = emp.teams.filter(t => t !== teamName);
      }
    });

    // Re-assign tasks that belonged to this department to 'General'
    tasks.forEach(t => {
      if (t.teamName === teamName) {
        t.teamName = 'General';
      }
    });

    broadcastStompMessage('/topic/admin/live-feed', {
      id: String(Date.now()),
      eventType: 'TEAM_DELETED',
      title: 'Department Removed',
      message: `Admin deleted department '${teamName}'`,
      employeeName: 'Admin User',
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    });

    broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });

    json({ success: true, message: `Department '${teamName}' deleted successfully.` });
    return;
  }

  // Employees: List All
  if (pathname === '/api/employees' && req.method === 'GET') {
    employees.forEach(syncTemporaryAdminStatus);
    json(employees);
    return;
  }

  // Admin: Grant Temporary Admin Privileges (for Day, Week, or Custom Date)
  if (pathname === '/api/admin/temporary-admin' && req.method === 'POST') {
    readBody(body => {
      const empId = parseInt(body.employeeId);
      const durationType = (body.durationType || 'DAY').toUpperCase(); // 'DAY', 'WEEK', 'CUSTOM'
      const customDateStr = body.customDate; // 'YYYY-MM-DD'
      const reason = (body.reason || '').trim();

      const emp = employees.find(e => e.id === empId);
      if (!emp) {
        json({ error: "Employee not found" }, 404);
        return;
      }

      // Calculate expiration date
      let untilDate;
      const now = new Date();
      if (durationType === 'DAY') {
        // 24 hours from now
        untilDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (durationType === 'WEEK') {
        // 7 days from now
        untilDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (durationType === 'CUSTOM' && customDateStr) {
        // Specific custom date at 23:59:59 UTC
        const parts = customDateStr.split('-');
        if (parts.length === 3) {
          untilDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59));
        } else {
          untilDate = new Date(customDateStr);
        }
      } else {
        untilDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      if (isNaN(untilDate.getTime()) || untilDate <= now) {
        json({ error: "Invalid expiration date. Date must be in the future." }, 400);
        return;
      }

      emp.originalRole = emp.originalRole || (emp.role === 'ADMIN' ? 'EMPLOYEE' : emp.role);
      emp.role = 'ADMIN';
      emp.isTemporaryAdmin = true;
      emp.temporaryAdminUntil = untilDate.toISOString();
      emp.temporaryAdminGrantedAt = now.toISOString();
      emp.temporaryAdminReason = reason;

      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'TEMPORARY_ADMIN_GRANTED',
        title: 'Temporary Admin Delegated',
        message: `Admin granted Temporary Admin access to ${emp.fullName} (${emp.employeeCode}) until ${untilDate.toLocaleDateString()}${reason ? ` - "${reason}"` : ''}`,
        employeeName: 'Admin User',
        severity: 'SUCCESS',
        timestamp: now.toISOString()
      });

      broadcastStompMessage(`/topic/employee/${emp.id}`, {
        type: 'TEMPORARY_ADMIN_GRANTED',
        until: emp.temporaryAdminUntil,
        reason
      });

      broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });

      json({
        success: true,
        message: `Granted Temporary Admin to ${emp.fullName} until ${untilDate.toLocaleDateString()}`,
        employee: emp
      });
    });
    return;
  }

  // Admin: Revoke Temporary Admin Privileges
  if (pathname === '/api/admin/temporary-admin/revoke' && req.method === 'POST') {
    readBody(body => {
      const empId = parseInt(body.employeeId);
      const emp = employees.find(e => e.id === empId);
      if (!emp) {
        json({ error: "Employee not found" }, 404);
        return;
      }

      emp.role = emp.originalRole || 'EMPLOYEE';
      emp.isTemporaryAdmin = false;
      emp.temporaryAdminUntil = null;
      emp.temporaryAdminGrantedAt = null;
      emp.temporaryAdminReason = null;

      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'TEMPORARY_ADMIN_REVOKED',
        title: 'Temporary Admin Revoked',
        message: `Admin revoked Temporary Admin access for ${emp.fullName} (${emp.employeeCode})`,
        employeeName: 'Admin User',
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });

      broadcastStompMessage(`/topic/employee/${emp.id}`, {
        type: 'TEMPORARY_ADMIN_REVOKED'
      });

      broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });

      json({
        success: true,
        message: `Revoked Temporary Admin from ${emp.fullName}. Role returned to ${emp.role}.`,
        employee: emp
      });
    });
    return;
  }

  // Admin: Create User and Assign to Specific Groups/Teams
  if (pathname === '/api/admin/employees' && req.method === 'POST') {
    readBody(body => {
      const fullName = (body.fullName || '').trim();
      const email = (body.email || '').trim();
      if (!fullName || !email) {
        json({ error: "Full name and email are required" }, 400);
        return;
      }

      const empCode = body.employeeCode || `EMP-00${employees.length + 1}`;
      const assignedTeams = Array.isArray(body.teams) ? body.teams : (body.teams ? [body.teams] : []);

      const newEmp = {
        id: employees.length + 1,
        employeeCode: empCode,
        fullName,
        email,
        role: body.role || "EMPLOYEE",
        preferredLang: body.preferredLang || "en",
        teams: assignedTeams
      };

      employees.push(newEmp);

      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'EMPLOYEE_CREATED',
        title: 'New Staff Added',
        message: `Admin created staff '${fullName}' (${empCode}) assigned to: ${assignedTeams.join(', ') || 'No group'}`,
        employeeName: 'Admin User',
        severity: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      json({ success: true, employee: newEmp });
    });
    return;
  }

  // Admin: Delete Employee
  if ((pathname.startsWith('/api/admin/employees/') || pathname.startsWith('/api/employees/')) && req.method === 'DELETE') {
    const idStr = pathname.replace(/^\/api\/(admin\/)?employees\//, '').trim();
    const empId = parseInt(idStr);

    if (isNaN(empId)) {
      json({ error: "Invalid employee ID" }, 400);
      return;
    }

    const empIndex = employees.findIndex(e => e.id === empId);
    if (empIndex === -1) {
      json({ error: "Employee not found" }, 404);
      return;
    }

    const empToDelete = employees[empIndex];

    // Protect primary Admin
    if (empToDelete.id === 1 || (empToDelete.role === 'ADMIN' && empToDelete.email === 'admin@office.lan')) {
      json({ error: "Cannot delete the primary Administrator account." }, 400);
      return;
    }

    // Remove employee from array
    employees.splice(empIndex, 1);

    // Remove employee's attendance records
    attendanceRecords = attendanceRecords.filter(r => r.employeeId !== empId);

    // Clean up task assignments
    tasks.forEach(t => {
      if (t.assignedToIds && t.assignedToIds.includes(empId)) {
        t.assignedToIds = t.assignedToIds.filter(id => id !== empId);
      }
      if (t.assignedToMembers) {
        t.assignedToMembers = t.assignedToMembers.filter(m => m.id !== empId);
      }
      if (t.assignedToId === empId) {
        if (t.assignedToMembers && t.assignedToMembers.length > 0) {
          t.assignedToId = t.assignedToMembers[0].id;
          t.assignedToName = t.assignedToMembers.map(m => m.fullName).join(', ');
          t.assignedToCode = t.assignedToMembers.map(m => m.employeeCode).join(', ');
        } else {
          t.assignedToId = null;
          t.assignedToName = null;
          t.assignedToCode = null;
        }
      }
    });

    broadcastStompMessage('/topic/admin/live-feed', {
      id: String(Date.now()),
      eventType: 'EMPLOYEE_DELETED',
      title: 'Staff Member Removed',
      message: `Admin deleted staff member '${empToDelete.fullName}' (${empToDelete.employeeCode})`,
      employeeName: 'Admin User',
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    });

    broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });

    json({ success: true, message: `Staff member '${empToDelete.fullName}' deleted successfully.` });
    return;
  }

  // Auth: Login - Strictly authenticate user identity & password (prevent unauthorized account access)
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    readBody(body => {
      const identifier = (body.email || body.username || '').trim().toLowerCase();
      const enteredPassword = String(body.password || '').trim();

      if (!identifier) {
        json({ error: "Please enter your corporate email address or Employee Code." }, 400);
        return;
      }
      if (!enteredPassword) {
        json({ error: "Please enter your account password." }, 400);
        return;
      }

      // Strictly find matching user by email or employeeCode
      const emp = employees.find(e =>
        e.email.toLowerCase() === identifier ||
        e.employeeCode.toLowerCase() === identifier
      );

      if (!emp) {
        json({ error: "Authentication Failed: No account found matching '" + identifier + "'. Please check your email or employee code." }, 401);
        return;
      }

      const validPassword = emp.password || "password123";
      if (enteredPassword !== validPassword) {
        json({ error: "Authentication Failed: Incorrect password for " + emp.fullName + " (" + emp.email + "). Access denied." }, 401);
        return;
      }

      syncTemporaryAdminStatus(emp);
      json({
        token: "demo_jwt_token_" + emp.id,
        userId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        email: emp.email,
        role: emp.role,
        isTemporaryAdmin: Boolean(emp.isTemporaryAdmin),
        temporaryAdminUntil: emp.temporaryAdminUntil || null,
        temporaryAdminReason: emp.temporaryAdminReason || null,
        preferredLang: emp.preferredLang,
        teams: emp.teams || []
      });
    });
    return;
  }

  // Auth: Change Password (Self-Service Security)
  if (pathname === '/api/auth/change-password' && req.method === 'POST') {
    const requester = getRequester();
    if (!requester) {
      json({ error: "Authentication required to change password." }, 401);
      return;
    }
    readBody(body => {
      const currentPassword = String(body.currentPassword || '').trim();
      const newPassword = String(body.newPassword || '').trim();

      if (!newPassword || newPassword.length < 4) {
        json({ error: "New password must be at least 4 characters long." }, 400);
        return;
      }

      const expected = requester.password || "password123";
      if (currentPassword !== expected) {
        json({ error: "Current password does not match. Verification failed." }, 403);
        return;
      }

      requester.password = newPassword;
      json({ success: true, message: "Password updated successfully. Your account is now strictly secured." });
    });
    return;
  }

  // Auth: Current User
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const requester = getRequester();
    if (!requester) {
      json({ error: "Unauthorized: Please log in with your corporate credentials." }, 401);
      return;
    }
    syncTemporaryAdminStatus(requester);
    json({
      userId: requester.id,
      employeeCode: requester.employeeCode,
      fullName: requester.fullName,
      email: requester.email,
      role: requester.role,
      isTemporaryAdmin: Boolean(requester.isTemporaryAdmin),
      temporaryAdminUntil: requester.temporaryAdminUntil || null,
      temporaryAdminReason: requester.temporaryAdminReason || null,
      preferredLang: requester.preferredLang,
      teams: requester.teams || []
    });
    return;
  }

  // Attendance: Live Status (Default-Present Model: Assume PRESENT unless marked ABSENT)
  if (pathname === '/api/attendance/live-status' && req.method === 'GET') {
    const list = employees.map(emp => {
      const rec = attendanceRecords.find(r => r.employeeId === emp.id && r.attendanceDate === today);
      const isAbsent = rec && rec.status === 'ABSENT';
      const statusIndicator = isAbsent ? "RED" : "GREEN";
      const status = isAbsent ? "ABSENT" : "PRESENT";

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        email: emp.email,
        role: emp.role,
        preferredLang: emp.preferredLang,
        teams: emp.teams,
        statusIndicator,
        status,
        absenceReason: isAbsent ? rec.reason : null
      };
    });
    json(list);
    return;
  }

  // Attendance: Check-In
  if (pathname === '/api/attendance/check-in' && req.method === 'POST') {
    const emp = employees[0];
    const existing = attendanceRecords.find(r => r.employeeId === emp.id && r.attendanceDate === today);
    if (!existing) {
      attendanceRecords.push({
        id: attendanceRecords.length + 1,
        employeeId: emp.id,
        attendanceDate: today,
        checkIn: new Date().toISOString(),
        status: "PRESENT"
      });
    }

    broadcastStompMessage('/topic/admin/attendance', { employeeId: emp.id, status: 'PRESENT' });
    broadcastStompMessage('/topic/admin/live-feed', {
      id: String(Date.now()),
      eventType: 'CHECK_IN',
      title: 'Employee Checked In',
      message: `${emp.fullName} marked as PRESENT`,
      employeeName: emp.fullName,
      severity: 'SUCCESS',
      timestamp: new Date().toISOString()
    });

    json({ success: true, status: 'PRESENT' });
    return;
  }

  // Attendance: Check-Out
  if (pathname === '/api/attendance/check-out' && req.method === 'POST') {
    json({ success: true, status: 'CHECKED_OUT' });
    return;
  }

  // Attendance: File Absence Notice (Multi-Day Support for Employees & Admin delegation for any employee)
  if ((pathname === '/api/attendance/absence' || pathname === '/api/admin/attendance/absence') && req.method === 'POST') {
    readBody(body => {
      const requester = getRequester();
      let targetEmpId = body.employeeId ? parseInt(body.employeeId) : null;

      // Role authorization:
      // If employee: can ONLY file absence for themselves!
      // If admin: can mark absence for ANY employee in the company!
      if (requester && requester.role === 'EMPLOYEE') {
        targetEmpId = requester.id;
      }

      let emp = employees.find(e => e.id === targetEmpId);
      if (!emp && body.employeeName) {
        emp = employees.find(e => e.fullName === body.employeeName);
      }
      if (!emp) {
        if (requester) emp = requester;
        else emp = employees[2]; // fallback to Hagos Berhe
      }

      let dates = [];
      if (Array.isArray(body.dates) && body.dates.length > 0) {
        dates = [...new Set(body.dates.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())))].map(d => d.trim()).sort();
      } else {
        dates = getDatesInRange(body.startDate || body.date, body.endDate || body.date);
      }
      if (dates.length === 0) {
        dates = [today];
      }
      const category = body.category || "MEDICAL";
      const reason = body.reason || "";
      const isAdminFiling = requester && requester.role === 'ADMIN';

      // Record absence for each date in range
      dates.forEach(d => {
        attendanceRecords = attendanceRecords.filter(r => !(r.employeeId === emp.id && r.attendanceDate === d));
        attendanceRecords.push({
          id: attendanceRecords.length + 1,
          employeeId: emp.id,
          attendanceDate: d,
          status: "ABSENT",
          absenceCategory: category,
          reason,
          filedBy: isAdminFiling ? `Administrator (${requester.fullName})` : emp.fullName,
          filedAt: new Date().toISOString()
        });
      });

      // Operational Impact Analysis: deliverables at risk within this date range
      const tasksAtRisk = tasks.filter(t => {
        const isMine = (t.assignedToIds && t.assignedToIds.includes(emp.id)) || t.assignedToId === emp.id;
        const taskDate = t.dueDate || t.endDate;
        return isMine && dates.includes(taskDate) && t.status !== 'COMPLETED';
      });

      const alertPayload = {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        absenceDate: dates[0], // backward compatibility
        daysCount: dates.length,
        dates,
        category,
        reason,
        tasksAtRisk,
        filedBy: isAdminFiling ? `Administrator (${requester.fullName})` : emp.fullName,
        isAdminAction: isAdminFiling,
        timestamp: new Date().toISOString()
      };

      latestAbsenceAlert = alertPayload;

      // Broadcast STOMP alerts (<200ms)
      broadcastStompMessage('/topic/admin/absences', alertPayload);
      broadcastStompMessage('/topic/absences', alertPayload);
      broadcastStompMessage('/topic/admin/attendance', { employeeId: emp.id, status: 'ABSENT', dates });
      broadcastStompMessage(`/topic/employee/${emp.id}`, { type: 'ABSENCE_RECORDED', alert: alertPayload });
      broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });
      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'ABSENCE',
        title: dates.length > 1
          ? (isAdminFiling ? `Admin Marked Multi-Day Absence: ${emp.fullName} (${dates.length} days)` : `Multi-Day Absence: ${emp.fullName} (${dates.length} days)`)
          : (isAdminFiling ? `Admin Marked Absent: ${emp.fullName}` : `Absence Filed: ${emp.fullName}`),
        message: `${dates[0]}${dates.length > 1 ? ` to ${dates[dates.length - 1]}` : ''} - ${reason || category} (${tasksAtRisk.length} deliverables at risk)${isAdminFiling ? ' [Action by Admin]' : ''}`,
        employeeName: emp.fullName,
        severity: 'CRITICAL',
        timestamp: new Date().toISOString()
      });

      json(alertPayload);
    });
    return;
  }

  // Admin: Clear / Delete Absence for Employee
  if (pathname === '/api/admin/attendance/clear' && req.method === 'POST') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required." }, 403);
      return;
    }
    readBody(body => {
      const empId = parseInt(body.employeeId);
      const emp = employees.find(e => e.id === empId);
      if (!emp) {
        json({ error: "Employee not found" }, 404);
        return;
      }
      let dates = [];
      if (Array.isArray(body.dates) && body.dates.length > 0) {
        dates = [...new Set(body.dates.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())))].map(d => d.trim()).sort();
      } else {
        dates = getDatesInRange(body.startDate || body.date, body.endDate || body.date);
      }
      if (dates.length === 0) {
        dates = [today];
      }
      dates.forEach(d => {
        attendanceRecords = attendanceRecords.filter(r => !(r.employeeId === emp.id && r.attendanceDate === d));
      });
      broadcastStompMessage('/topic/admin/attendance', { employeeId: emp.id, status: 'PRESENT', dates });
      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'ATTENDANCE_UPDATE',
        title: `Absence Cleared: ${emp.fullName}`,
        message: `Admin cleared absence records for ${emp.fullName} (${dates.length} days). Status set to Present.`,
        employeeName: emp.fullName,
        severity: 'SUCCESS',
        timestamp: new Date().toISOString()
      });
      json({ success: true, message: `Absence cleared for ${emp.fullName} (${dates.length} days).` });
    });
    return;
  }

  // Get Latest Absence Alert (for sync fallback)
  if (pathname === '/api/attendance/latest-alert' && req.method === 'GET') {
    json(latestAbsenceAlert || {});
    return;
  }

  // Tasks: List (For Employee: Own individual tasks first, then department group tasks only)
  if (pathname === '/api/tasks' && req.method === 'GET') {
    const requester = getRequester();
    const empIdParam = parsedUrl.query.employeeId ? parseInt(parsedUrl.query.employeeId) : null;
    const userRole = parsedUrl.query.role || "";

    const isEmp = (requester && requester.role === 'EMPLOYEE') || userRole === 'EMPLOYEE';
    const targetEmpId = (requester && requester.role === 'EMPLOYEE') ? requester.id : empIdParam;

    if (isEmp && targetEmpId) {
      const emp = employees.find(e => e.id === targetEmpId);
      const empTeams = emp && emp.teams ? emp.teams : [];

      // Strictly filter: ONLY assigned to this employee OR assigned to employee's department
      const filtered = tasks
        .filter(t => {
          const isMine = (t.assignedToIds && t.assignedToIds.includes(targetEmpId)) || t.assignedToId === targetEmpId;
          const isMyTeam = t.teamName && empTeams.includes(t.teamName);
          return isMine || isMyTeam;
        })
        .map(t => {
          const isMine = (t.assignedToIds && t.assignedToIds.includes(targetEmpId)) || t.assignedToId === targetEmpId;
          const isGroup = Boolean(t.teamName && empTeams.includes(t.teamName));
          return {
            ...t,
            isMyIndividualTask: isMine,
            isGroupTask: isGroup
          };
        });

      // Sort: Own individual tasks first, then by severity weight descending
      filtered.sort((a, b) => {
        const aMine = a.isMyIndividualTask ? 0 : 1;
        const bMine = b.isMyIndividualTask ? 0 : 1;
        if (aMine !== bMine) return aMine - bMine;
        return (b.severityWeight || 1) - (a.severityWeight || 1);
      });

      json(filtered);
      return;
    }

    json(tasks);
    return;
  }

  // Messages: Get Messages for Admin or Employee
  if (pathname === '/api/messages' && req.method === 'GET') {
    const requester = getRequester();
    let empId = parsedUrl.query.employeeId ? parseInt(parsedUrl.query.employeeId) : null;
    let role = parsedUrl.query.role || "ADMIN";

    if (requester) {
      empId = requester.id;
      role = requester.role;
    }

    if (role === 'ADMIN') {
      json(messages);
      return;
    }

    const emp = employees.find(e => e.id === empId);
    const empTeams = emp && emp.teams ? emp.teams : [];

    const employeeMessages = messages.filter(m => {
      if (m.recipientType === 'ALL') return true;
      if (m.recipientType === 'EMPLOYEE' && m.recipientId === empId) return true;
      if (m.recipientType === 'TEAM' && empTeams.includes(m.recipientName)) return true;
      if (m.senderId === empId) return true;
      return false;
    });

    json(employeeMessages);
    return;
  }

  // Messages: Send Message (Admin to Employee/Team/All, or Employee to Admin)
  if (pathname === '/api/messages' && req.method === 'POST') {
    const requester = getRequester();
    readBody(body => {
      const content = (body.content || '').trim();
      if (!content) {
        json({ error: "Message content cannot be empty" }, 400);
        return;
      }

      const senderId = requester ? requester.id : (body.senderId ? parseInt(body.senderId) : 1);
      const senderName = requester ? requester.fullName : (body.senderName || (senderId === 1 ? "Admin User" : "Staff Member"));
      const senderRole = requester ? requester.role : (body.senderRole || (senderId === 1 ? "ADMIN" : "EMPLOYEE"));

      let recipientType = body.recipientType || (senderRole === 'EMPLOYEE' ? 'EMPLOYEE' : 'ALL');
      let recipientId = body.recipientId ? parseInt(body.recipientId) : null;
      let recipientName = body.recipientName || "All Staff";

      if (senderRole === 'EMPLOYEE') {
        recipientId = 1;
        recipientName = "Administrator";
        recipientType = 'EMPLOYEE';
      }

      const newMsg = {
        id: messages.length + 1,
        senderId,
        senderName,
        senderRole,
        recipientType,
        recipientId,
        recipientName,
        content,
        createdAt: new Date().toISOString()
      };

      messages.unshift(newMsg);

      broadcastStompMessage('/topic/messages', newMsg);
      if (recipientId) {
        broadcastStompMessage(`/topic/employee/${recipientId}`, { type: 'NEW_MESSAGE', message: newMsg });
      }
      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'MESSAGE',
        title: `Message from ${newMsg.senderName}`,
        message: `To ${newMsg.recipientName}: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
        employeeName: newMsg.senderName,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });

      json({ success: true, message: newMsg });
    });
    return;
  }

  // Tasks: Calendar View (Filtered for Employees to their tasks + their department)
  if (pathname === '/api/tasks/calendar' && req.method === 'GET') {
    const requester = getRequester();
    if (requester && requester.role === 'EMPLOYEE') {
      const empTeams = requester.teams || [];
      const employeeTasks = tasks.filter(t => {
        const isMine = (t.assignedToIds && t.assignedToIds.includes(requester.id)) || t.assignedToId === requester.id;
        const isMyTeam = t.teamName && empTeams.includes(t.teamName);
        return isMine || isMyTeam;
      });
      json(employeeTasks);
      return;
    }
    json(tasks);
    return;
  }

  // Tasks: Update Status & Completion Notes (Employee input -> Admin live)
  const taskStatusMatch = pathname.match(/\/api\/tasks\/(\d+)\/status/);
  if (taskStatusMatch && req.method === 'PATCH') {
    const taskId = parseInt(taskStatusMatch[1]);
    const requester = getRequester();
    if (!requester) {
      json({ error: "Authentication required" }, 401);
      return;
    }
    readBody(body => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        json({ error: "Task not found" }, 404);
        return;
      }

      // Role check: If requester is an employee, they can ONLY update tasks assigned to them!
      if (requester.role === 'EMPLOYEE') {
        const isMine = (task.assignedToIds && task.assignedToIds.includes(requester.id)) || task.assignedToId === requester.id;
        if (!isMine) {
          json({ error: "Access Denied: You can only update tasks assigned to you." }, 403);
          return;
        }
      }

      task.status = body.status;
      if (body.note) task.completionNote = body.note;
      if (body.status === 'COMPLETED') task.completedAt = new Date().toISOString();

      broadcastStompMessage('/topic/tasks/updates', {
        taskId: task.id,
        title: task.title,
        status: task.status,
        empId: task.assignedToId,
        timestamp: new Date().toISOString()
      });

      broadcastStompMessage('/topic/admin/tasks', task);
      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'TASK_UPDATE',
        title: `Task ${task.status}`,
        message: `${task.assignedToName || 'Staff'} marked '${task.title}' as ${task.status} ${task.completionNote ? `("${task.completionNote}")` : ''}`,
        employeeName: task.assignedToName || 'Staff',
        severity: task.status === 'COMPLETED' ? 'SUCCESS' : 'INFO',
        timestamp: new Date().toISOString()
      });

      json(task);
    });
    return;
  }

  // Tasks: Delete Deliverable (Admin Only - Employees Strictly Forbidden)
  const taskDeleteMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (taskDeleteMatch && req.method === 'DELETE') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Only administrators can delete tasks." }, 403);
      return;
    }
    const taskId = parseInt(taskDeleteMatch[1]);
    const taskIdx = tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) {
      json({ error: "Task not found" }, 404);
      return;
    }
    const deletedTask = tasks[taskIdx];
    tasks.splice(taskIdx, 1);

    broadcastStompMessage('/topic/tasks/updates', {
      action: 'TASK_DELETED',
      taskId: deletedTask.id
    });
    broadcastStompMessage('/topic/admin/live-feed', {
      id: String(Date.now()),
      eventType: 'TASK_DELETED',
      title: 'Task Deleted',
      message: `Admin deleted deliverable '${deletedTask.title}'`,
      employeeName: requester.fullName || 'Admin User',
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    });

    json({ success: true, message: `Task '${deletedTask.title}' deleted successfully.` });
    return;
  }

  // Tasks: Clear All Deliverables (Admin Only)
  if ((pathname === '/api/admin/tasks/clear-all' || pathname === '/api/tasks/clear-all') && (req.method === 'DELETE' || req.method === 'POST')) {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Only administrators can clear all tasks." }, 403);
      return;
    }
    const count = tasks.length;
    tasks = [];

    broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });
    broadcastStompMessage('/topic/admin/live-feed', {
      id: String(Date.now()),
      eventType: 'TASKS_CLEARED',
      title: 'All Deliverables Cleared',
      message: `Admin cleared all ${count} tasks. Ready for action plan upload.`,
      employeeName: requester.fullName || 'Admin User',
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    });

    json({ success: true, message: `Cleared all ${count} tasks.` });
    return;
  }

  // Tasks: Assign Task to Single or Multiple Employees
  const taskAssignMatch = pathname.match(/\/api\/tasks\/(\d+)\/assign/);
  if (taskAssignMatch && req.method === 'POST') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required to assign tasks." }, 403);
      return;
    }
    const taskId = parseInt(taskAssignMatch[1]);
    readBody(body => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        json({ error: "Task not found" }, 404);
        return;
      }

      let empIds = [];
      if (Array.isArray(body.employeeIds)) {
        empIds = body.employeeIds.map(Number).filter(Boolean);
      } else if (body.employeeId !== undefined && body.employeeId !== null) {
        empIds = [Number(body.employeeId)];
      }

      const assignedEmps = employees.filter(e => empIds.includes(e.id));
      task.assignedToIds = assignedEmps.map(e => e.id);
      task.assignedToMembers = assignedEmps.map(e => ({
        id: e.id,
        fullName: e.fullName,
        employeeCode: e.employeeCode
      }));

      if (assignedEmps.length > 0) {
        task.assignedToId = assignedEmps[0].id;
        task.assignedToName = assignedEmps.map(e => e.fullName).join(', ');
        task.assignedToCode = assignedEmps.map(e => e.employeeCode).join(', ');
      } else {
        task.assignedToId = null;
        task.assignedToName = null;
        task.assignedToCode = null;
      }

      // Notify each assigned employee via their personal STOMP topic
      assignedEmps.forEach(emp => {
        broadcastStompMessage(`/topic/employee/${emp.id}`, {
          taskId: task.id,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority
        });
      });

      broadcastStompMessage('/topic/tasks/updates', task);
      broadcastStompMessage('/topic/admin/tasks', task);
      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: `'${task.title}' assigned to: ${assignedEmps.map(e => e.fullName).join(', ') || 'Unassigned'}`,
        employeeName: assignedEmps.map(e => e.fullName).join(', ') || 'Unassigned',
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });

      json(task);
    });
    return;
  }

  // Helper: Extract person names from 'Responsible' column
  function extractResponsibleNames(responsibleStr) {
    if (!responsibleStr) return [];
    let text = String(responsibleStr);
    // If text has dash like "Dagnu- Action plan...", take before dash
    if (text.includes('-')) {
      text = text.split('-')[0];
    }
    text = text.replace(/\s+and\s+/gi, ', ').replace(/\s+&\s+/g, ', ');
    return text.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }

  // Non-person keywords in Excel assignee/owner fields to ignore
  const NON_PERSON_KEYWORDS = ['team', 'system', 'project', 'bank', 'cbe', 'inlaks', 'dept', 'department', 'unit', 'committee', 'branch', 'core'];

  // Helper: Resolve or Auto-Create Employee
  function resolveOrCreateEmployee(rawName, department) {
    let cleanName = rawName.trim().replace(/^["']|["']$/g, '');
    if (!cleanName) return null;

    // Check if name is generic organization/team rather than a person
    const lowerWords = cleanName.toLowerCase().split(/[\s,\-_/]+/);
    if (lowerWords.some(w => NON_PERSON_KEYWORDS.includes(w))) {
      return null;
    }

    const firstName = cleanName.split(/\s+/)[0];

    // Check existing
    let existing = employees.find(e =>
      e.fullName.toLowerCase() === cleanName.toLowerCase() ||
      e.fullName.toLowerCase().startsWith(firstName.toLowerCase() + ' ') ||
      e.fullName.toLowerCase() === firstName.toLowerCase() ||
      e.email.toLowerCase().startsWith(firstName.toLowerCase() + '@')
    );

    if (existing) {
      if (!existing.teams) existing.teams = [];
      if (!existing.teams.includes(department)) existing.teams.push(department);
      return { employee: existing, isNew: false };
    }

    // Auto-create user with their first name and password 123456 (with '1' suffix for duplicate names)
    let baseUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let candidateEmail = `${baseUsername}@office.lan`;
    let candidateFullName = cleanName;

    let counter = 1;
    while (employees.some(e => e.email.toLowerCase() === candidateEmail.toLowerCase())) {
      candidateEmail = `${baseUsername}${counter}@office.lan`;
      candidateFullName = `${cleanName} ${counter}`;
      counter++;
    }

    const newEmp = {
      id: employees.length + 1,
      employeeCode: `EMP-00${employees.length + 1}`,
      fullName: candidateFullName,
      email: candidateEmail,
      role: "EMPLOYEE",
      password: "123456",
      preferredLang: "en",
      teams: [department]
    };

    employees.push(newEmp);

    broadcastStompMessage('/topic/admin/live-feed', {
      id: String(Date.now()),
      eventType: 'EMPLOYEE_CREATED',
      title: 'Staff Auto-Provisioned',
      message: `User '${newEmp.fullName}' (${newEmp.email}) auto-created with password 123456 for ${department}`,
      employeeName: newEmp.fullName,
      severity: 'SUCCESS',
      timestamp: new Date().toISOString()
    });

    return { employee: newEmp, isNew: true };
  }

  // Helper: Normalize Date String (handles Excel numeric serial dates like 46064/46337, text dates like "Nov o6,2026", and ISO strings)
  function normalizeDateStr(raw, defaultDate = today) {
    if (!raw) return defaultDate;
    let s = String(raw).trim();
    if (!s) return defaultDate;

    // Fix OCR/typo like "Nov o6,2026" with letter 'o' instead of zero
    s = s.replace(/([A-Za-z]+)\s+o(\d+)/i, '$1 0$2');

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD/MM/YYYY or DD-MM-YYYY format (e.g. 09-11-2026 or 09/11/2026)
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const p1 = parseInt(ddmmyyyy[1], 10);
      const p2 = parseInt(ddmmyyyy[2], 10);
      const yr = ddmmyyyy[3];
      if (p1 <= 31 && p2 <= 12) {
        return `${yr}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
    }

    // If Excel numeric serial date number (e.g. 46064, 46304, 46335, 46337, 46340)
    const num = parseFloat(s);
    if (!isNaN(num) && /^\d+(\.\d+)?$/.test(s) && num >= 20000 && num <= 70000) {
      const utcDays = Math.floor(num - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try parsing standard date string
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return defaultDate;
  }

  // Helper: Robust XLSX buffer parser (handles arbitrary attribute orders r/s/t, rich text, inline strings)
  function parseXlsxBuffer(buf) {
    let offset = 0;
    let sharedStringsXml = null;
    let sheetXml = null;

    while (offset < buf.length - 30) {
      const sig = buf.readUInt32LE(offset);
      if (sig !== 0x04034b50) break;
      const comp = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const name = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const rawData = buf.slice(dataStart, dataStart + compSize);
      let data;
      if (comp === 0) data = rawData;
      else if (comp === 8) data = zlib.inflateRawSync(rawData);

      if (name.includes('sharedStrings.xml') && data) sharedStringsXml = data.toString('utf8');
      if (name.includes('sheet1.xml') && data) sheetXml = data.toString('utf8');
      offset = dataStart + compSize;
    }

    const strings = [];
    if (sharedStringsXml) {
      const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
      let match;
      while ((match = siRegex.exec(sharedStringsXml)) !== null) {
        const siContent = match[1];
        const tMatches = [...siContent.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)];
        let text = tMatches.map(m => m[1]).join('');
        text = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        strings.push(text);
      }
    }

    const rows = [];
    if (sheetXml) {
      const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
      let rMatch;
      while ((rMatch = rowRegex.exec(sheetXml)) !== null) {
        const rowContent = rMatch[2];
        const row = {};

        const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let cMatch;
        while ((cMatch = cellRegex.exec(rowContent)) !== null) {
          const attrs = cMatch[1];
          const innerContent = cMatch[2] || '';

          const rAttrMatch = attrs.match(/\br="([A-Za-z]+)\d+"/);
          if (!rAttrMatch) continue;
          const colLetter = rAttrMatch[1].toUpperCase();

          const tAttrMatch = attrs.match(/\bt="([^"]+)"/);
          const cellType = tAttrMatch ? tAttrMatch[1] : '';

          let cellVal = '';
          const vMatch = innerContent.match(/<v>([\s\S]*?)<\/v>/);
          if (vMatch) {
            cellVal = vMatch[1];
          } else {
            const isMatch = innerContent.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
            if (isMatch) cellVal = isMatch[1];
          }

          if (cellType === 's') {
            const strIdx = parseInt(cellVal);
            row[colLetter] = (!isNaN(strIdx) && strings[strIdx] !== undefined) ? strings[strIdx] : '';
          } else if (cellType === 'b') {
            row[colLetter] = cellVal === '1' ? 'TRUE' : 'FALSE';
          } else {
            row[colLetter] = cellVal || '';
          }
        }
        rows.push(row);
      }
    }
    return rows;
  }

  // Helper: Parse CSV text
  function parseCsvText(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const rows = [];
    for (const line of lines) {
      const cols = parseLine(line);
      const row = {};
      cols.forEach((val, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        row[colLetter] = val;
      });
      rows.push(row);
    }
    return rows;
  }

  // Action Plans: Download Template (.xlsx or .csv)
  if (pathname === '/api/action-plans/template' && req.method === 'GET') {
    const format = (parsedUrl.query.format || 'xlsx').toLowerCase();
    if (format === 'csv') {
      const csvPath = path.resolve(__dirname, '..', 'sample_action_plan.csv');
      if (fs.existsSync(csvPath)) {
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="action_plan_template.csv"'
        });
        res.end(fs.readFileSync(csvPath));
        return;
      }
    } else {
      const xlsxPath = path.resolve(__dirname, '..', 'sample_action_plan.xlsx');
      if (fs.existsSync(xlsxPath)) {
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="action_plan_template.xlsx"'
        });
        res.end(fs.readFileSync(xlsxPath));
        return;
      }
    }
  }

  // Action Plans: Get Sample Data for 1-click test
  if (pathname === '/api/action-plans/sample-data' && req.method === 'GET') {
    const csvPath = path.resolve(__dirname, '..', 'sample_action_plan.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      json({ rawCsv: content, department: "Development" });
      return;
    }
  }

  // Action Plans: Upload & Ingest Excel / CSV with Department Selection & User Auto-Creation
  if (pathname === '/api/action-plans/upload' && req.method === 'POST') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required to upload action plans." }, 403);
      return;
    }
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      let department = (parsedUrl.query && parsedUrl.query.department) || "Development";
      let planTitle = (parsedUrl.query && parsedUrl.query.planTitle) || "Imported Action Plan";
      let rawRows = [];

      // Check if uploaded as JSON
      const firstChar = buffer.toString('utf8', 0, 50).trim();
      if (firstChar.startsWith('{')) {
        try {
          const body = JSON.parse(buffer.toString('utf8'));
          if (body.department) department = body.department;
          if (body.planTitle) planTitle = body.planTitle;
          if (body.rawCsv) {
            rawRows = parseCsvText(body.rawCsv);
          }
        } catch (e) {}
      }

      // If not JSON CSV, check if file is XLSX (starts with PK\x03\x04) or CSV text
      if (!rawRows || rawRows.length === 0) {
        if (buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50) {
          try {
            rawRows = parseXlsxBuffer(buffer);
          } catch (e) {
            console.error("XLSX parse error", e);
          }
        } else {
          // Treat as CSV text
          const text = buffer.toString('utf8');
          rawRows = parseCsvText(text);
        }
      }

      // If still empty, fall back to sample CSV
      if (!rawRows || rawRows.length === 0) {
        const sampleCsvPath = path.resolve(__dirname, '..', 'sample_action_plan.csv');
        if (fs.existsSync(sampleCsvPath)) {
          rawRows = parseCsvText(fs.readFileSync(sampleCsvPath, 'utf8'));
        }
      }

      // Ensure department exists in teams registry
      if (department && !teams.some(t => t.teamName.toLowerCase() === department.toLowerCase())) {
        teams.push({
          id: teams.length + 1,
          teamName: department,
          teamNameAm: department,
          teamNameTi: department,
          teamNameOm: department,
          description: `Action plan team for ${planTitle}`
        });
      }

      // Map columns dynamically from header row (supports both S.No/Tasks/This Week Plan and legacy ID/Impact/Mitigation)
      let colMap = {
        id: 'A',
        title: 'B',
        start: 'C',
        end: 'D',
        weekPlan: 'E',
        status: 'F',
        totalCompleted: 'G',
        impact: null,
        description: null,
        responsible: null,
        owner: null,
        due: null
      };

      if (rawRows.length > 0) {
        const header = rawRows[0];
        for (const [col, val] of Object.entries(header)) {
          const v = String(val).toLowerCase().trim();
          if (v === 's.no' || v === 's. no' || v === 'sno' || v === 'no' || v === 'id' || v.includes('task id')) {
            colMap.id = col;
          } else if (v === 'tasks' || v === 'task' || v.includes('task') || v.includes('title') || v.includes('action log') || v.includes('description risk')) {
            colMap.title = col;
          } else if (v.includes('start')) {
            colMap.start = col;
          } else if (v.includes('end')) {
            colMap.end = col;
          } else if (v.includes('due')) {
            colMap.due = col;
          } else if (v.includes('week') || v.includes('plan')) {
            colMap.weekPlan = col;
          } else if (v.includes('completed') || v.includes('so far') || v.includes('progress')) {
            colMap.totalCompleted = col;
          } else if (v.includes('status')) {
            colMap.status = col;
          } else if (v.includes('responsible') || v.includes('assigned')) {
            colMap.responsible = col;
          } else if (v.includes('owner')) {
            colMap.owner = col;
          } else if (v.includes('impact') || v.includes('priority') || v.includes('severity')) {
            colMap.impact = col;
          } else if (v.includes('mitigation') || v.includes('next step') || v.includes('description')) {
            colMap.description = col;
          }
        }
      }

      let newTasksCreated = [];
      let autoCreatedEmployeesCount = 0;

      // Filter out subheader rows (like ",,,,,,So Far") and empty rows
      const dataRows = rawRows.slice(1).filter(row => {
        const title = (row[colMap.title] || '').trim();
        const id = (row[colMap.id] || '').trim();
        if (!title && !id) return false;
        if (!title && (row[colMap.totalCompleted] || '').toLowerCase().includes('so far')) return false;
        return true;
      });

      // Find any prevailing start/end dates across the sheet for fallback if milestone has blank dates
      let sheetDefaultStart = today;
      let sheetDefaultEnd = today;
      for (const row of dataRows) {
        const sRaw = colMap.start ? row[colMap.start] : '';
        const eRaw = colMap.end ? row[colMap.end] : '';
        if (sRaw && sheetDefaultStart === today) {
          const norm = normalizeDateStr(sRaw, '');
          if (norm) sheetDefaultStart = norm;
        }
        if (eRaw && sheetDefaultEnd === today) {
          const norm = normalizeDateStr(eRaw, '');
          if (norm) sheetDefaultEnd = norm;
        }
        if (sheetDefaultStart !== today && sheetDefaultEnd !== today) break;
      }
      if (sheetDefaultEnd === today && sheetDefaultStart !== today) sheetDefaultEnd = sheetDefaultStart;

      dataRows.forEach((row, idx) => {
        let customId = (row[colMap.id] || `A-0${idx + 1}`).trim();
        // Clean floating point formatting e.g. "1.1000000000000001" -> "1.1"
        if (/^\d+\.\d+$/.test(customId)) {
          const flt = parseFloat(customId);
          if (!isNaN(flt)) {
            customId = String(Number(flt.toFixed(4)));
          }
        }

        const taskTitle = (row[colMap.title] || `Deliverable ${customId}`).trim();
        const rawWeekPlan = colMap.weekPlan ? (row[colMap.weekPlan] || '').trim() : '';
        const rawCompleted = colMap.totalCompleted ? (row[colMap.totalCompleted] || '').trim() : '';
        const rawStatus = colMap.status ? (row[colMap.status] || '').trim() : '';

        // Determine Priority & Severity Weight:
        const rawImpact = (row[colMap.impact] || '').toUpperCase();
        let priority = "MEDIUM";
        let severityWeight = 2;

        if (rawImpact.includes("CRIT")) { priority = "CRITICAL"; severityWeight = 4; }
        else if (rawImpact.includes("HIGH")) { priority = "HIGH"; severityWeight = 3; }
        else if (rawImpact.includes("MED")) { priority = "MEDIUM"; severityWeight = 2; }
        else if (rawImpact.includes("LOW")) { priority = "LOW"; severityWeight = 1; }
        else if (rawWeekPlan) {
          const planNum = parseFloat(rawWeekPlan);
          if (planNum >= 10 || planNum >= 1.0) { priority = "CRITICAL"; severityWeight = 4; }
          else if (planNum >= 5 || planNum >= 0.25) { priority = "HIGH"; severityWeight = 3; }
          else if (planNum >= 1 || planNum >= 0.05) { priority = "MEDIUM"; severityWeight = 2; }
          else { priority = "LOW"; severityWeight = 1; }
        }

        // Determine Task Status:
        let status = "PENDING";
        const compNum = parseFloat(rawCompleted);
        const isCompletedPercent = compNum >= 100 || compNum === 1.0;
        const isCompletedStatus = rawStatus.toLowerCase().includes('comp') || rawStatus.toLowerCase().includes('done') || rawStatus.toLowerCase().includes('finish');
        const isInProgressStatus = rawStatus.toLowerCase().includes('prog') || rawStatus.toLowerCase().includes('wip') || rawStatus.toLowerCase().includes('open');

        if (isCompletedPercent || isCompletedStatus) {
          status = "COMPLETED";
        } else if ((!isNaN(compNum) && compNum > 0) || isInProgressStatus) {
          status = "IN_PROGRESS";
        }

        // Standardize percentages for display
        const planNum = parseFloat(rawWeekPlan);
        const normalizedWeekPlan = (!isNaN(planNum) && planNum <= 1 && planNum > 0 && !rawWeekPlan.includes('%'))
          ? `${Math.round(planNum * 100)}%`
          : (rawWeekPlan ? `${rawWeekPlan}${rawWeekPlan.includes('%') ? '' : '%'}` : null);

        const normalizedCompleted = (!isNaN(compNum) && compNum <= 1 && compNum > 0 && !rawCompleted.includes('%'))
          ? `${Math.round(compNum * 100)}%`
          : (rawCompleted ? `${rawCompleted}${rawCompleted.includes('%') ? '' : '%'}` : null);

        // Build description / milestone info:
        let descParts = [];
        if (colMap.description && row[colMap.description]) {
          descParts.push(row[colMap.description].trim());
        }
        if (rawStatus && !isCompletedStatus && !isInProgressStatus) {
          descParts.push(`Status / Notes: ${rawStatus}`);
        }
        if (normalizedWeekPlan) {
          descParts.push(`This Week Plan: ${normalizedWeekPlan}`);
        }
        if (normalizedCompleted) {
          descParts.push(`Total Completed So Far: ${normalizedCompleted}`);
        }
        const desc = descParts.join(' | ');

        // Date resolution (normalize Excel serial numbers or text dates, fallback to sheet default):
        const startDate = normalizeDateStr(colMap.start ? row[colMap.start] : '', sheetDefaultStart);
        const endDate = normalizeDateStr(colMap.end ? row[colMap.end] : '', sheetDefaultEnd);
        const dueDate = normalizeDateStr(colMap.due ? row[colMap.due] : '', endDate);

        // Assigned employees:
        const respStr = (colMap.responsible && row[colMap.responsible]) || (colMap.owner && row[colMap.owner]) || '';
        const names = extractResponsibleNames(respStr);
        let assignedEmps = [];

        if (names.length > 0) {
          for (const n of names) {
            const res = resolveOrCreateEmployee(n, department);
            if (res && res.employee) {
              if (res.isNew) autoCreatedEmployeesCount++;
              if (!assignedEmps.some(e => e.id === res.employee.id)) {
                assignedEmps.push(res.employee);
              }
            }
          }
        }

        // If no specific employee names in Excel, automatically assign to the responsible department's staff:
        if (assignedEmps.length === 0) {
          const deptMembers = employees.filter(e => e.teams && e.teams.includes(department));
          if (deptMembers.length > 0) {
            assignedEmps = deptMembers;
          }
        }

        const newTask = {
          id: tasks.length + 1,
          customTaskId: customId,
          actionPlanId: 2,
          actionPlanTitle: planTitle,
          title: taskTitle,
          description: desc,
          startDate,
          endDate,
          dueDate,
          priority,
          severityWeight,
          status,
          teamName: department,
          thisWeekPlan: normalizedWeekPlan,
          totalCompletedSoFar: normalizedCompleted,
          assignedToIds: assignedEmps.map(e => e.id),
          assignedToMembers: assignedEmps.map(e => ({ id: e.id, fullName: e.fullName, employeeCode: e.employeeCode })),
          assignedToId: assignedEmps[0]?.id || null,
          assignedToName: assignedEmps.map(e => e.fullName).join(', ') || null,
          assignedToCode: assignedEmps.map(e => e.employeeCode).join(', ') || null
        };

        tasks.push(newTask);
        newTasksCreated.push(newTask);
      });

      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'PLAN_INGESTED',
        title: 'Action Plan Uploaded',
        message: `Parsed ${newTasksCreated.length} deliverables for department '${department}'. Auto-created ${autoCreatedEmployeesCount} new employees.`,
        employeeName: 'Admin User',
        severity: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });

      json({
        success: true,
        count: newTasksCreated.length,
        department,
        autoCreatedEmployeesCount,
        tasks: newTasksCreated
      });
    });
    return;
  }

  // Helper: Generate dynamic multi-sheet XLSX report
  function generateExcelReport(leaderboardRows, attendanceRows) {
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Performance Leaderboard" sheetId="1" r:id="rId1"/>
    <sheet name="Attendance & Absence Log" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

    const strings = [];
    const stringMap = new Map();
    function getStrIdx(s) {
      const str = String(s ?? '');
      if (stringMap.has(str)) return stringMap.get(str);
      const idx = strings.length;
      strings.push(str);
      stringMap.set(str, idx);
      return idx;
    }

    function buildSheetXml(rows) {
      let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`;
      rows.forEach((row, rIdx) => {
        const rNum = rIdx + 1;
        xml += `<row r="${rNum}">`;
        row.forEach((val, cIdx) => {
          const colLetter = String.fromCharCode(65 + cIdx);
          const strIdx = getStrIdx(val);
          xml += `<c r="${colLetter}${rNum}" t="s"><v>${strIdx}</v></c>`;
        });
        xml += `</row>`;
      });
      xml += `</sheetData></worksheet>`;
      return xml;
    }

    const sheet1Xml = buildSheetXml(leaderboardRows);
    const sheet2Xml = buildSheetXml(attendanceRows);

    let sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`;
    strings.forEach(s => {
      const escaped = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      sharedStringsXml += `<si><t>${escaped}</t></si>`;
    });
    sharedStringsXml += `</sst>`;

    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      crcTable[n] = c;
    }
    function crc32(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
      return (crc ^ -1) >>> 0;
    }

    const files = [
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
      { name: 'xl/worksheets/sheet2.xml', content: sheet2Xml },
      { name: 'xl/sharedStrings.xml', content: sharedStringsXml }
    ];

    const fileEntries = [];
    let offset = 0;
    for (const f of files) {
      const data = Buffer.from(f.content, 'utf8');
      const nameBuf = Buffer.from(f.name, 'utf8');
      const crc = crc32(data);
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0x0800, 6);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(data.length, 18);
      localHeader.writeUInt32LE(data.length, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);
      fileEntries.push({ nameBuf, data, localHeader, crc, offset, length: data.length });
      offset += localHeader.length + nameBuf.length + data.length;
    }

    const cdEntries = [];
    let cdSize = 0;
    for (const entry of fileEntries) {
      const cdHeader = Buffer.alloc(46);
      cdHeader.writeUInt32LE(0x02014b50, 0);
      cdHeader.writeUInt16LE(20, 4);
      cdHeader.writeUInt16LE(20, 6);
      cdHeader.writeUInt16LE(0x0800, 8);
      cdHeader.writeUInt32LE(entry.crc, 16);
      cdHeader.writeUInt32LE(entry.length, 20);
      cdHeader.writeUInt32LE(entry.length, 24);
      cdHeader.writeUInt16LE(entry.nameBuf.length, 28);
      cdHeader.writeUInt16LE(0, 30);
      cdHeader.writeUInt16LE(0, 32);
      cdHeader.writeUInt16LE(0, 34);
      cdHeader.writeUInt16LE(0, 36);
      cdHeader.writeUInt32LE(0, 38);
      cdHeader.writeUInt32LE(entry.offset, 42);
      cdEntries.push(cdHeader, entry.nameBuf);
      cdSize += cdHeader.length + entry.nameBuf.length;
    }

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(fileEntries.length, 8);
    eocd.writeUInt16LE(fileEntries.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(offset, 16);

    const chunks = [];
    for (const entry of fileEntries) {
      chunks.push(entry.localHeader, entry.nameBuf, entry.data);
    }
    chunks.push(...cdEntries, eocd);
    return Buffer.concat(chunks);
  }

  // Analytics: Leaderboard (Admin sees full company; Employee sees only their own accomplishment rate)
  if (pathname === '/api/analytics/leaderboard' && req.method === 'GET') {
    const requester = getRequester();
    if (!requester) {
      json({ error: "Authentication required" }, 401);
      return;
    }
    const period = (parsedUrl.query.period || 'all').toLowerCase();
    const team = parsedUrl.query.team || 'ALL';

    if (requester.role === 'ADMIN') {
      json(computeLeaderboard(period, team));
      return;
    }

    // Role is EMPLOYEE: strictly return ONLY the employee's own accomplishment rate
    const allStats = computeLeaderboard(period, team);
    const myStats = allStats.filter(item => item.employeeId === requester.id);
    json(myStats);
    return;
  }

  // Analytics: Dedicated Employee Task Accomplishment Rate & Absence Profile
  if (pathname === '/api/analytics/my-performance' && req.method === 'GET') {
    const requester = getRequester();
    if (!requester) {
      json({ error: "Authentication required" }, 401);
      return;
    }

    const period = (parsedUrl.query.period || 'all').toLowerCase();
    const allStats = computeLeaderboard(period, 'ALL');
    let workingDays = 20;
    if (period === 'day') workingDays = 1;
    else if (period === 'week') workingDays = 5;
    else if (period === 'month') workingDays = 22;
    else if (period === 'year') workingDays = 240;

    const myStats = allStats.find(item => item.employeeId === requester.id) || {
      employeeId: requester.id,
      employeeCode: requester.employeeCode,
      fullName: requester.fullName,
      teamName: requester.teams ? requester.teams[0] : "General",
      period,
      totalTasks: 0,
      completedTasks: 0,
      totalWeight: 0,
      completedWeight: 0,
      unweightedTaskRate: 0,
      weightedTaskRate: 0,
      recordedAbsentDays: 0,
      totalWorkingDays: workingDays,
      absenceRate: 0,
      overallScore: 0,
      todayAttendanceStatus: "PRESENT"
    };

    // Calculate Department Benchmark for same period
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
    const startOfWeekStr = getLocalDateString(startOfWeek);
    const endOfWeekStr = getLocalDateString(endOfWeek);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfMonthStr = getLocalDateString(startOfMonth);
    const endOfMonthStr = getLocalDateString(endOfMonth);

    const currentYearStr = String(now.getFullYear());
    const startOfYearStr = `${currentYearStr}-01-01`;
    const endOfYearStr = `${currentYearStr}-12-31`;

    const filterTask = (t) => {
      if (period === 'all') return true;
      const taskStart = t.startDate || t.dueDate || t.endDate;
      const taskEnd = t.endDate || t.dueDate || t.startDate;
      if (!taskStart && !taskEnd) return true;
      const s = taskStart || taskEnd;
      const e = taskEnd || taskStart;

      if (period === 'day') return (s <= todayStr && e >= todayStr) || t.dueDate === todayStr || t.startDate === todayStr || t.endDate === todayStr;
      if (period === 'week') return (s <= endOfWeekStr && e >= startOfWeekStr);
      if (period === 'month') return (s <= endOfMonthStr && e >= startOfMonthStr);
      if (period === 'year') return (s <= endOfYearStr && e >= startOfYearStr);
      return true;
    };

    const filterAtt = (r) => {
      if (period === 'all') return true;
      const attDate = r.attendanceDate;
      if (!attDate) return true;
      if (period === 'day') return attDate === todayStr;
      if (period === 'week') return (attDate >= startOfWeekStr && attDate <= endOfWeekStr);
      if (period === 'month') return (attDate >= startOfMonthStr && attDate <= endOfMonthStr);
      if (period === 'year') return attDate.startsWith(currentYearStr);
      return true;
    };

    const deptName = requester.teams && requester.teams[0] || 'Development';
    const deptTasks = tasks.filter(t => t.teamName === deptName && filterTask(t));
    const deptTotalTasks = deptTasks.length;
    const deptCompletedTasks = deptTasks.filter(t => t.status === 'COMPLETED').length;
    let deptTotalWeight = 0;
    let deptCompletedWeight = 0;
    for (const t of deptTasks) {
      const w = t.severityWeight || 2;
      deptTotalWeight += w;
      if (t.status === 'COMPLETED') deptCompletedWeight += w;
    }
    const deptWeightedRate = deptTotalWeight > 0 ? Math.round((deptCompletedWeight / deptTotalWeight) * 1000) / 10 : 0;
    const deptUnweightedRate = deptTotalTasks > 0 ? Math.round((deptCompletedTasks / deptTotalTasks) * 1000) / 10 : 0;

    // Filter employee's absence records for this period (or all when period=all)
    const myAbsences = attendanceRecords.filter(r => r.employeeId === requester.id && r.status === 'ABSENT' && filterAtt(r));

    json({
      employee: myStats,
      department: {
        teamName: deptName,
        totalTasks: deptTotalTasks,
        completedTasks: deptCompletedTasks,
        totalWeight: deptTotalWeight,
        completedWeight: deptCompletedWeight,
        weightedRate: deptWeightedRate,
        unweightedRate: deptUnweightedRate
      },
      absences: myAbsences,
      period
    });
    return;
  }

  // Analytics: Export Excel File Filtered by Day, Week, Year & Department
  if (pathname === '/api/analytics/export' && req.method === 'GET') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required to export reports." }, 403);
      return;
    }
    const period = (parsedUrl.query.period || 'all').toLowerCase();
    const team = parsedUrl.query.team || 'ALL';
    const format = (parsedUrl.query.format || 'xlsx').toLowerCase();

    const data = computeLeaderboard(period, team);
    
    // Sheet 1: Leaderboard
    const lbRows = [
      ['Rank', 'Employee Code', 'Full Name', 'Department', 'Completed Tasks', 'Total Tasks', 'Delivered Points', 'Total Weight', 'Weighted Rate %', 'Raw Rate %', 'Absent Days', 'Absence %', 'Overall Score']
    ];
    data.forEach((item, idx) => {
      lbRows.push([
        String(idx + 1),
        item.employeeCode,
        item.fullName,
        item.teamName,
        String(item.completedTasks),
        String(item.totalTasks),
        String(item.completedWeight),
        String(item.totalWeight),
        item.weightedTaskRate + '%',
        item.unweightedTaskRate + '%',
        String(item.recordedAbsentDays),
        item.absenceRate + '%',
        String(item.overallScore)
      ]);
    });

    // Sheet 2: Attendance records
    const attRows = [
      ['Date', 'Employee Code', 'Full Name', 'Department', 'Status', 'Absence Category', 'Reason / Notes']
    ];
    attendanceRecords.forEach(r => {
      const emp = employees.find(e => e.id === r.employeeId) || {};
      const empDept = (emp.teams && emp.teams[0]) || 'General';
      if (team === 'ALL' || empDept === team) {
        attRows.push([
          r.attendanceDate,
          emp.employeeCode || '',
          emp.fullName || 'Staff',
          empDept,
          r.status,
          r.absenceCategory || '',
          r.reason || ''
        ]);
      }
    });

    if (format === 'csv') {
      const csvContent = lbRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="office_performance_${period}_${team}.csv"`
      });
      res.end(csvContent);
      return;
    }

    try {
      const xlsxBuffer = generateExcelReport(lbRows, attRows);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="office_performance_${period}_${team}.xlsx"`
      });
      res.end(xlsxBuffer);
      return;
    } catch (err) {
      console.error("Error generating dynamic Excel export", err);
      res.writeHead(500);
      res.end("Excel generation error");
      return;
    }
  }

  // Attendance: Employee Absence History (Dates, categories, reasons)
  const empAbsenceMatch = pathname.match(/^\/api\/attendance\/employee\/(\d+)\/history$/);
  if (empAbsenceMatch && req.method === 'GET') {
    const empId = parseInt(empAbsenceMatch[1]);
    const emp = employees.find(e => e.id === empId);
    if (!emp) {
      json({ error: "Employee not found" }, 404);
      return;
    }
    const period = (parsedUrl.query.period || 'all').toLowerCase();
    
    // Time-bounded filtering for employee absence history
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
    const startOfWeekStr = getLocalDateString(startOfWeek);
    const endOfWeekStr = getLocalDateString(endOfWeek);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfMonthStr = getLocalDateString(startOfMonth);
    const endOfMonthStr = getLocalDateString(endOfMonth);
    const currentYearStr = String(now.getFullYear());

    const filterAttByPeriod = (r) => {
      if (period === 'all') return true;
      const d = r.attendanceDate;
      if (!d) return true;
      if (period === 'day') return d === todayStr;
      if (period === 'week') return d >= startOfWeekStr && d <= endOfWeekStr;
      if (period === 'month') return d >= startOfMonthStr && d <= endOfMonthStr;
      if (period === 'year') return d.startsWith(currentYearStr);
      return true;
    };

    const records = attendanceRecords
      .filter(r => r.employeeId === empId && r.status === 'ABSENT' && filterAttByPeriod(r))
      .map(r => ({
        id: r.id,
        attendanceDate: r.attendanceDate,
        status: r.status,
        absenceCategory: r.absenceCategory || 'UNEXCUSED',
        reason: r.reason || 'No detailed reason specified',
        filedBy: r.filedBy || 'Self-Reported',
        filedAt: r.filedAt || null
      }))
      .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));

    json({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      teamName: emp.teams && emp.teams[0] || 'General',
      absentDaysCount: records.length,
      records
    });
    return;
  }

  // Analytics: Hall of Fame Awards (Employee of the Week, Month, Year)
  if (pathname === '/api/analytics/awards' && req.method === 'GET') {
    const weekLb = computeLeaderboard('week', 'ALL');
    const monthLb = computeLeaderboard('month', 'ALL');
    const yearLb = computeLeaderboard('year', 'ALL');

    const resolveAward = (category, lb, label) => {
      const custom = customAwards[category];
      if (custom && custom.employeeId) {
        const emp = employees.find(e => e.id === custom.employeeId);
        const stats = lb.find(s => s.employeeId === custom.employeeId) || {};
        if (emp) {
          return {
            category,
            label,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            teamName: emp.teams && emp.teams[0] || 'General',
            weightedTaskRate: stats.weightedTaskRate || 0,
            completedTasks: stats.completedTasks || 0,
            totalTasks: stats.totalTasks || 0,
            absenceRate: stats.absenceRate || 0,
            reliabilityRate: stats.reliabilityRate || 100,
            overallScore: stats.overallScore || 0,
            note: custom.note || `Nominated as ${label} by Administration`,
            nominatedBy: custom.nominatedBy,
            nominatedAt: custom.nominatedAt,
            isNominated: true
          };
        }
      }

      // Auto-compute top performer
      const top = lb.length > 0 ? lb[0] : null;
      if (top) {
        return {
          category,
          label,
          employeeId: top.employeeId,
          employeeCode: top.employeeCode,
          fullName: top.fullName,
          teamName: top.teamName,
          weightedTaskRate: top.weightedTaskRate,
          completedTasks: top.completedTasks,
          totalTasks: top.totalTasks,
          absenceRate: top.absenceRate,
          reliabilityRate: top.reliabilityRate || Math.max(0, 100 - top.absenceRate),
          overallScore: top.overallScore,
          note: `Top performer based on highest task rate and outstanding attendance reliability.`,
          nominatedBy: 'Automated Performance Engine',
          nominatedAt: new Date().toISOString(),
          isNominated: false
        };
      }

      const defaultEmp = employees[0] || { id: 1, employeeCode: 'EMP-001', fullName: 'Staff Member', teams: ['General'] };
      return {
        category,
        label,
        employeeId: defaultEmp.id,
        employeeCode: defaultEmp.employeeCode,
        fullName: defaultEmp.fullName,
        teamName: defaultEmp.teams && defaultEmp.teams[0] || 'General',
        weightedTaskRate: 0,
        completedTasks: 0,
        totalTasks: 0,
        absenceRate: 0,
        reliabilityRate: 100,
        overallScore: 0,
        note: `Awaiting action plan ingest to rank achievements.`,
        nominatedBy: 'System',
        nominatedAt: new Date().toISOString(),
        isNominated: false
      };
    };

    json({
      week: resolveAward('week', weekLb, 'Employee of the Week'),
      month: resolveAward('month', monthLb, 'Employee of the Month'),
      year: resolveAward('year', yearLb, 'Employee of the Year')
    });
    return;
  }

  // Admin: Nominate Employee for Week / Month / Year Award
  if (pathname === '/api/admin/awards' && req.method === 'POST') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required." }, 403);
      return;
    }
    readBody(body => {
      const category = (body.category || 'week').toLowerCase();
      if (!['week', 'month', 'year'].includes(category)) {
        json({ error: "Invalid award category" }, 400);
        return;
      }
      const employeeId = parseInt(body.employeeId);
      const emp = employees.find(e => e.id === employeeId);
      if (!emp) {
        json({ error: "Employee not found" }, 404);
        return;
      }
      const titleMap = { week: 'Employee of the Week', month: 'Employee of the Month', year: 'Employee of the Year' };
      const note = (body.note || '').trim() || `Honored by Administration as ${titleMap[category]}`;

      customAwards[category] = {
        employeeId: emp.id,
        note,
        nominatedBy: requester.fullName || 'Admin User',
        nominatedAt: new Date().toISOString()
      };

      broadcastStompMessage('/topic/admin/live-feed', {
        id: String(Date.now()),
        eventType: 'AWARD_BESTOWED',
        title: `${titleMap[category]} Spotlight`,
        message: `Admin honored ${emp.fullName} (${emp.employeeCode}) as ${titleMap[category]}: "${note}"`,
        employeeName: emp.fullName,
        severity: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });

      json({
        success: true,
        message: `Successfully nominated ${emp.fullName} for ${titleMap[category]}!`,
        award: customAwards[category]
      });
    });
    return;
  }

  // Admin: Reset Award to Auto-Calculate
  const resetAwardMatch = pathname.match(/^\/api\/admin\/awards\/([a-z]+)$/);
  if (resetAwardMatch && req.method === 'DELETE') {
    const requester = getRequester();
    if (!requester || requester.role !== 'ADMIN') {
      json({ error: "Access Denied: Administrator privileges required." }, 403);
      return;
    }
    const cat = resetAwardMatch[1].toLowerCase();
    if (['week', 'month', 'year'].includes(cat)) {
      customAwards[cat] = null;
      broadcastStompMessage('/topic/tasks/updates', { action: 'RELOAD' });
      json({ success: true, message: `Award reset to auto-compute for ${cat}.` });
      return;
    }
    json({ error: "Invalid category" }, 400);
    return;
  }

  // --- SERVE PRODUCTION REACT 18 VITE PWA FRONTEND ---
  if (!pathname.startsWith('/api')) {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

    // If requesting asset under /assets/ that doesn't exist, try finding available index-*.js or index-*.css
    if (pathname.startsWith('/assets/')) {
      if (!fs.existsSync(filePath)) {
        const assetsDir = path.join(DIST_DIR, 'assets');
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          if (pathname.endsWith('.js')) {
            const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
            if (jsFile) filePath = path.join(assetsDir, jsFile);
          } else if (pathname.endsWith('.css')) {
            const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
            if (cssFile) filePath = path.join(assetsDir, cssFile);
          }
        }
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end("Asset Not Found");
        return;
      }
    } else {
      // If file doesn't exist, fallback to index.html (SPA routing for HTML navigation)
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404);
  res.end("Not Found");
});

// WebSocket STOMP Handler
server.on('upgrade', (req, socket, head) => {
  const parsedUrl = url.parse(req.url, true);
  if (!parsedUrl.pathname.includes('/ws-attendance')) {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + acceptKey
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');

  const client = { socket, isRawWs: true, subscriptions: new Map() };
  wsClients.add(client);

  let wsBuffer = Buffer.alloc(0);

  socket.on('data', chunk => {
    wsBuffer = Buffer.concat([wsBuffer, chunk]);

    while (wsBuffer.length >= 2) {
      const secondByte = wsBuffer[1];
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let headerLen = 2;

      if (payloadLen === 126) {
        if (wsBuffer.length < 4) break;
        payloadLen = wsBuffer.readUInt16BE(2);
        headerLen = 4;
      } else if (payloadLen === 127) {
        if (wsBuffer.length < 10) break;
        payloadLen = Number(wsBuffer.readBigUInt64BE(2));
        headerLen = 10;
      }

      const maskLen = isMasked ? 4 : 0;
      const totalLen = headerLen + maskLen + payloadLen;
      if (wsBuffer.length < totalLen) {
        break;
      }

      const opcode = wsBuffer[0] & 0x0f;

      if (opcode === 0x8) {
        // Connection Close
        socket.end();
        return;
      } else if (opcode === 0x9) {
        // Ping -> Pong
        if (!socket.destroyed) {
          try { socket.write(Buffer.from([0x8a, 0x00])); } catch (e) {}
        }
      } else if (opcode === 0x1) {
        let mask = null;
        let payloadOffset = headerLen;
        if (isMasked) {
          mask = wsBuffer.slice(headerLen, headerLen + 4);
          payloadOffset += 4;
        }
        const payload = Buffer.from(wsBuffer.slice(payloadOffset, payloadOffset + payloadLen));
        if (isMasked) {
          for (let i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4];
          }
        }
        handleStompFrames(client, payload.toString('utf8'));
      }

      wsBuffer = wsBuffer.slice(totalLen);
    }
  });

  socket.on('close', () => wsClients.delete(client));
  socket.on('error', () => wsClients.delete(client));
});

function handleStompFrames(client, messageText) {
  const rawFrames = messageText.split('\0');
  for (const raw of rawFrames) {
    const frame = raw.replace(/^\r?\n+/, '');
    if (!frame.trim()) continue;

    if (frame.startsWith('CONNECT') || frame.startsWith('STOMP')) {
      sendWsFrame(client.socket, "CONNECTED\nversion:1.2\nheart-beat:10000,10000\n\n\0");
    } else if (frame.startsWith('SUBSCRIBE')) {
      const lines = frame.split(/\r?\n/);
      let dest = '';
      let subId = 'sub-0';
      for (const line of lines) {
        const clean = line.trim();
        if (clean.toLowerCase().startsWith('destination:')) {
          dest = clean.substring(12).trim();
        } else if (clean.toLowerCase().startsWith('id:')) {
          subId = clean.substring(3).trim();
        }
      }
      if (dest) {
        client.subscriptions.set(dest, subId);
        console.log(`STOMP subscribed: ${dest} -> ${subId}`);
      }
    } else if (frame.startsWith('UNSUBSCRIBE')) {
      const lines = frame.split(/\r?\n/);
      for (const line of lines) {
        const clean = line.trim();
        if (clean.toLowerCase().startsWith('id:')) {
          const subId = clean.substring(3).trim();
          for (const [d, id] of client.subscriptions.entries()) {
            if (id === subId) {
              client.subscriptions.delete(d);
              console.log(`STOMP unsubscribed: ${d} (id: ${subId})`);
            }
          }
        }
      }
    }
  }
}

function sendWsFrame(socket, text) {
  if (!socket || socket.destroyed) return;
  try {
    const payload = Buffer.from(text, 'utf8');
    let header;
    if (payload.length <= 125) {
      header = Buffer.from([0x81, payload.length]);
    } else if (payload.length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    socket.write(Buffer.concat([header, payload]));
  } catch (e) {
    console.error("sendWsFrame write error:", e.message);
  }
}

function getFreePort(startingPort) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', () => {
      resolve(getFreePort(startingPort + 1));
    });
    srv.listen(startingPort, () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

getFreePort(PORT).then((availablePort) => {
  PORT = availablePort;
  server.listen(availablePort, '0.0.0.0', () => {
    const ifaces = os.networkInterfaces();
    const ips = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          ips.push({ iface: name, ip: addr.address });
        }
      }
    }

    const appUrl = `http://localhost:${availablePort}/`;
    console.log(`================================================================`);
    console.log(`🚀 Real-Time Attendance & Performance Platform is READY!`);
    console.log(`👉 Web Browser Access (PC / Laptop): ${appUrl}`);
    if (ips.length > 0) {
      console.log(`📱 Mobile App Access (Android & iOS on Wi-Fi/LAN):`);
      ips.forEach(i => console.log(`   👉 http://${i.ip}:${availablePort}/`));
    }
    console.log(`⚡ STOMP WebSocket: ws://localhost:${availablePort}/ws-attendance`);
    console.log(`✨ Serving Full React 18 PWA + REST APIs + Real-time Sockets!`);
    console.log(`================================================================`);

    // Auto-open browser on Windows when started directly
    if (process.platform === 'win32' && !process.env.NO_AUTO_OPEN) {
      console.log(`🌐 Opening ${appUrl} in your default browser...`);
      exec(`start "" "${appUrl}"`);
    }
  });
});
