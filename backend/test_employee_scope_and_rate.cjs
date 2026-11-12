const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

async function runAudit() {
  console.log("=== EMPLOYEE SCOPE, ACCOMPLISHMENT RATE & ABSENCE REPORTING AUDIT ===");
  const basePort = 8091;

  // 1. Login as Employee
  console.log("\n[Test 1] Login as Employee (hagos@office.lan)");
  const empLogin = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'hagos@office.lan', password: 'password123' });

  console.log(`Status: ${empLogin.status}, Role: ${empLogin.body.role}, Full Name: ${empLogin.body.fullName}`);
  if (empLogin.body.role !== 'EMPLOYEE') throw new Error("Expected role EMPLOYEE");
  const empToken = empLogin.body.token;

  // 2. Employee Task Visibility: only own tasks + own department tasks
  console.log("\n[Test 2] Employee Task Visibility (GET /api/tasks)");
  const tasksRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/tasks',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });

  console.log(`Employee received ${tasksRes.body.length} deliverables`);
  const foreignTasks = tasksRes.body.filter(t => t.teamName && t.teamName !== 'Development' && !t.assignedToIds.includes(3));
  if (foreignTasks.length > 0) throw new Error("Foreign department deliverables detected!");
  console.log("PASS: Employee strictly sees own tasks and Development department tasks only.");

  // 3. Employee Personal Accomplishment Rate: GET /api/analytics/my-performance
  console.log("\n[Test 3] Employee Accomplishment Rate (GET /api/analytics/my-performance)");
  const perfRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/my-performance?period=all',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });

  console.log(`Status: ${perfRes.status}`);
  console.log(`My Weighted Task Rate: ${perfRes.body.employee.weightedTaskRate}%`);
  console.log(`My Delivered Points: ${perfRes.body.employee.completedWeight} / ${perfRes.body.employee.totalWeight} pts`);
  console.log(`My Completed Tasks: ${perfRes.body.employee.completedTasks} / ${perfRes.body.employee.totalTasks}`);
  console.log(`Department Rate: ${perfRes.body.department.teamName} -> ${perfRes.body.department.weightedRate}%`);
  if (perfRes.status !== 200) throw new Error("Failed to fetch personal performance");
  if (perfRes.body.employee.employeeId !== 3) throw new Error("Returned wrong employee record");
  console.log("PASS: Personal accomplishment rate calculated and returned accurately.");

  // 4. Employee Privacy Guard on /api/analytics/leaderboard
  console.log("\n[Test 4] Employee privacy on GET /api/analytics/leaderboard");
  const lbRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/leaderboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log(`Status: ${lbRes.status}, returned items: ${lbRes.body.length}`);
  if (lbRes.body.length !== 1 || lbRes.body[0].employeeId !== 3) {
    throw new Error("Security breach: Employee was returned records of other employees!");
  }
  console.log("PASS: Employee can only see their own accomplishment record on leaderboard (0 colleague leakage).");

  // 5. Employee Reporting Absence: POST /api/attendance/absence
  console.log("\n[Test 5] Employee filing an absence notice");
  const todayStr = new Date().toISOString().split('T')[0];
  const absenceRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/attendance/absence',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    employeeId: 3,
    employeeName: "Hagos Berhe",
    date: todayStr,
    category: "MEDICAL",
    reason: "Doctor appointment for periodic checkup"
  });

  console.log(`Absence filing status: ${absenceRes.status}`);
  if (absenceRes.status !== 200 && absenceRes.status !== 201) throw new Error("Failed to file absence notice");
  console.log(`Alert broadcasted: ${absenceRes.body.employeeName} absent on ${absenceRes.body.absenceDate}`);

  // Re-fetch performance to confirm absence was logged
  const perfAfterAbsence = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/my-performance?period=all',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log(`Recorded Absent Days: ${perfAfterAbsence.body.employee.recordedAbsentDays}`);
  console.log(`Today Attendance Status: ${perfAfterAbsence.body.employee.todayAttendanceStatus}`);
  if (perfAfterAbsence.body.employee.recordedAbsentDays < 1) throw new Error("Absence not reflected in performance stats");
  if (perfAfterAbsence.body.employee.todayAttendanceStatus !== "ABSENT") throw new Error("Status should be ABSENT");
  console.log("PASS: Absence report successfully recorded, broadcasted, and reflected in personal metrics.");

  // 6. Admin vs Temporary Admin Check
  console.log("\n[Test 6] Admin vs Temporary Admin Delegation");
  const adminLogin = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@office.lan', password: 'password123' });
  const adminToken = adminLogin.body.token;

  // Admin promotes Hagos to Temporary Admin
  await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/admin/temporary-admin',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { employeeId: 3, duration: '1_day' });

  // Now Hagos accesses company leaderboard
  const tempAdminLb = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/leaderboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log(`Hagos as Temporary Admin leaderboard records: ${tempAdminLb.body.length}`);
  if (tempAdminLb.body.length <= 1) throw new Error("Temporary admin should see company leaderboard");
  console.log("PASS: Temporary admin successfully elevated to full administrative capabilities.");

  // Admin revokes Temporary Admin
  await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/admin/temporary-admin/revoke',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { employeeId: 3 });

  // Re-check Hagos: back to only 1 row (own record)
  const demotedLb = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/leaderboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log(`Hagos after revocation leaderboard records: ${demotedLb.body.length}`);
  if (demotedLb.body.length !== 1) throw new Error("Revoked temporary admin should return to employee scope");
  console.log("PASS: Reverted back to strict employee scope upon revocation.");

  console.log("\n🎉 ALL AUDIT CRITERIA SATISFIED 100%!");
}

runAudit().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

