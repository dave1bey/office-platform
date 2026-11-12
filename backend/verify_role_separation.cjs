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

async function runTests() {
  console.log("=== ROLE SEPARATION & PERMISSION AUDIT ===");
  const basePort = 8091;

  // 1. Login as Admin
  console.log("\n[Test 1] Login as Admin (admin@office.lan)");
  const adminLogin = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@office.lan', password: 'password123' });

  console.log(`Status: ${adminLogin.status}, Role: ${adminLogin.body.role}, Name: ${adminLogin.body.fullName}`);
  if (adminLogin.body.role !== 'ADMIN') throw new Error("Admin login should return role ADMIN");
  const adminToken = adminLogin.body.token;

  // 2. Login as Employee (hagos@office.lan)
  console.log("\n[Test 2] Login as Employee (hagos@office.lan)");
  const empLogin = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'hagos@office.lan', password: 'password123' });

  console.log(`Status: ${empLogin.status}, Role: ${empLogin.body.role}, Name: ${empLogin.body.fullName}, isTemporaryAdmin: ${empLogin.body.isTemporaryAdmin}`);
  if (empLogin.body.role !== 'EMPLOYEE') throw new Error("Employee login must return role EMPLOYEE");
  if (empLogin.body.isTemporaryAdmin !== false) throw new Error("Employee must not be temporary admin initially");
  const empToken = empLogin.body.token;

  // 3. Employee Scope Test: GET /api/tasks
  console.log("\n[Test 3] Employee Task Visibility (GET /api/tasks)");
  const empTasksRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/tasks',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });

  console.log(`Employee received ${empTasksRes.body.length} tasks`);
  const foreignDeptTasks = empTasksRes.body.filter(t => t.teamName && t.teamName !== 'Development' && !t.assignedToIds.includes(3));
  if (foreignDeptTasks.length > 0) {
    throw new Error(`Security breach: Employee received tasks from foreign departments: ${JSON.stringify(foreignDeptTasks)}`);
  }
  console.log("PASS: Employee only received own tasks and own department (Development) tasks.");

  // 4. Employee RBAC Guard Tests (Expecting 403 Forbidden)
  const forbiddenEndpoints = [
    {
      name: "Upload Action Plan",
      path: '/api/action-plans/upload',
      method: 'POST',
      body: { department: 'Development', tasks: [] }
    },
    {
      name: "Assign Task to Employee",
      path: '/api/tasks/1/assign',
      method: 'POST',
      body: { employeeIds: [2] }
    },
    {
      name: "Create Employee",
      path: '/api/admin/employees',
      method: 'POST',
      body: { fullName: "Hacker User", email: "hacker@test.lan" }
    },
    {
      name: "Delete Employee",
      path: '/api/admin/employees/2',
      method: 'DELETE'
    },
    {
      name: "Delete Department",
      path: '/api/admin/teams/1',
      method: 'DELETE'
    },
    {
      name: "Grant Temporary Admin",
      path: '/api/admin/temporary-admin',
      method: 'POST',
      body: { employeeId: 3, duration: '1_day' }
    },
    {
      name: "Export Excel Report",
      path: '/api/analytics/export',
      method: 'GET'
    }
  ];

  for (const ep of forbiddenEndpoints) {
    const res = await request({
      hostname: 'localhost',
      port: basePort,
      path: ep.path,
      method: ep.method,
      headers: {
        'Authorization': `Bearer ${empToken}`,
        'Content-Type': 'application/json'
      }
    }, ep.body);

    console.log(`[RBAC Guard] ${ep.name} -> HTTP ${res.status} (Expected: 403)`);
    if (res.status !== 403) {
      throw new Error(`Security breach on ${ep.name}: expected 403 but got ${res.status}`);
    }
  }

  // 5. Employee Status Update Guard Test:
  // Can Hagos update their own task (Task 1)? YES -> 200
  console.log("\n[Test 5A] Employee updating their own assigned task (Task 1)");
  const ownTaskUpdate = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/tasks/1/status',
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, { status: 'IN_PROGRESS', note: 'Working on core backend' });
  console.log(`Status: ${ownTaskUpdate.status} (Expected: 200)`);
  if (ownTaskUpdate.status !== 200) throw new Error("Employee should be able to update their own task");

  // Can Hagos update another person's task (Task 5 is assigned to Abebe Bikila id 2)? NO -> 403
  console.log("\n[Test 5B] Employee updating colleague's task in same dept (Task 5)");
  const colleagueTaskUpdate = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/tasks/5/status',
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, { status: 'COMPLETED', note: 'Attempted unauthorized completion' });
  console.log(`Status: ${colleagueTaskUpdate.status} (Expected: 403)`);
  if (colleagueTaskUpdate.status !== 403) {
    throw new Error(`Security breach: Employee was able to update colleague's task (status: ${colleagueTaskUpdate.status})`);
  }
  console.log("PASS: Employee strictly blocked from modifying colleagues' tasks.");

  // 6. Admin Actions (Expecting 200)
  console.log("\n[Test 6] Admin executing protected operations");
  const adminLeaderboard = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/leaderboard',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Admin Leaderboard: HTTP ${adminLeaderboard.status} (records: ${adminLeaderboard.body.length})`);
  if (adminLeaderboard.status !== 200) throw new Error("Admin should access leaderboard");

  // 7. Temporary Admin Lifecycle
  console.log("\n[Test 7] Temporary Admin Lifecycle");
  // Admin promotes Hagos
  const promoteRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/admin/temporary-admin',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { employeeId: 3, duration: '1_day' });
  console.log(`Promote Hagos status: ${promoteRes.status}, isTemporaryAdmin: ${promoteRes.body.employee.isTemporaryAdmin}, role: ${promoteRes.body.employee.role}`);

  // Now Hagos accesses task assignment endpoint
  const tempAdminAssign = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/tasks/1/assign',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, { employeeIds: [3, 2] });
  console.log(`Hagos acting as temporary admin assigning task: HTTP ${tempAdminAssign.status} (Expected: 200)`);
  if (tempAdminAssign.status !== 200) throw new Error("Temporary admin should be allowed to assign tasks");

  // Admin revokes temporary admin
  const revokeRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/admin/temporary-admin/revoke',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, { employeeId: 3 });
  console.log(`Revoke status: ${revokeRes.status}, role: ${revokeRes.body.employee.role}`);

  // Hagos attempts task assignment again
  const demotedAssign = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/tasks/1/assign',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, { employeeIds: [3] });
  console.log(`Hagos after revocation assigning task: HTTP ${demotedAssign.status} (Expected: 403)`);
  if (demotedAssign.status !== 403) throw new Error("Demoted employee should receive 403 Forbidden");

  console.log("\n🎉 ALL ROLE SEPARATION AND SECURITY TESTS PASSED WITH 100% SUCCESS!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
