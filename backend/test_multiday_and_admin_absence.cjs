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
  console.log("=== MULTI-DAY ABSENCE & ADMIN ABSENCE DELEGATION AUDIT ===");
  const basePort = 8091;

  // 1. Login as Employee (Hagos Berhe)
  console.log("\n[Test 1] Login as Employee (hagos@office.lan)");
  const empLogin = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'hagos@office.lan', password: 'password123' });

  if (empLogin.body.role !== 'EMPLOYEE') throw new Error("Expected role EMPLOYEE");
  const empToken = empLogin.body.token;
  console.log(`Employee logged in: ${empLogin.body.fullName} (${empLogin.body.employeeCode})`);

  // 2. Employee files multi-day absence (4 days: 2026-11-12 to 2026-11-15)
  console.log("\n[Test 2] Employee filing multi-day absence (Nov 12 - Nov 15, 2026)");
  const multiDayRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/attendance/absence',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    startDate: '2026-11-12',
    endDate: '2026-11-15',
    category: 'MEDICAL',
    reason: 'Multi-day outpatient therapy recovery'
  });

  console.log(`Status: ${multiDayRes.status}`);
  console.log(`Days Count: ${multiDayRes.body.daysCount}`);
  console.log(`Dates: ${JSON.stringify(multiDayRes.body.dates)}`);
  if (multiDayRes.body.daysCount !== 4) throw new Error("Expected 4 days in date range");
  if (multiDayRes.body.dates.length !== 4) throw new Error("Expected 4 date strings");
  console.log("PASS: Multi-day absence successfully calculated and stored for employee.");

  // Verify personal accomplishment & absence profile reflects the 4 days
  const perfRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/analytics/my-performance?period=all',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  console.log(`Total recorded absent days: ${perfRes.body.employee.recordedAbsentDays}`);
  if (perfRes.body.employee.recordedAbsentDays < 4) throw new Error("Absence days not reflected in performance profile");
  console.log("PASS: Performance profile accurately displays multi-day absence records.");

  // 3. Employee cannot mark colleague absent
  console.log("\n[Test 3] Security check: Employee attempting to file absence for Abebe Bikila (id 2)");
  const unauthorizedRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/attendance/absence',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    employeeId: 2, // Abebe Bikila
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    category: 'OTHER',
    reason: 'Unauthorized filing attempt'
  });

  if (unauthorizedRes.body.employeeId !== 3) {
    throw new Error("Security breach: Employee was able to file absence for a colleague!");
  }
  console.log("PASS: Employee forced to self (id 3); colleague was protected.");

  // 4. Admin login
  console.log("\n[Test 4] Admin login (admin@office.lan)");
  const adminLogin = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@office.lan', password: 'password123' });
  if (adminLogin.body.role !== 'ADMIN') throw new Error("Expected role ADMIN");
  const adminToken = adminLogin.body.token;

  // 5. Admin marks Tolassa Chala (id: 4) absent for 3 days
  console.log("\n[Test 5] Admin marking Tolassa Chala (id 4) absent for 3 days (Nov 16 - Nov 18)");
  const adminMarkTolassa = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/attendance/absence',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    employeeId: 4,
    startDate: '2026-11-16',
    endDate: '2026-11-18',
    category: 'ANNUAL_LEAVE',
    reason: 'Approved annual vacation leave by Executive Director'
  });

  console.log(`Status: ${adminMarkTolassa.status}`);
  console.log(`Marked Employee: ${adminMarkTolassa.body.employeeName} (${adminMarkTolassa.body.employeeCode})`);
  console.log(`Days: ${adminMarkTolassa.body.daysCount} (${adminMarkTolassa.body.startDate} to ${adminMarkTolassa.body.endDate})`);
  console.log(`Filed By: ${adminMarkTolassa.body.filedBy}`);
  if (adminMarkTolassa.body.employeeId !== 4) throw new Error("Failed to mark target employee absent");
  if (adminMarkTolassa.body.daysCount !== 3) throw new Error("Expected 3 days for Tolassa");
  console.log("PASS: Admin successfully marked Tolassa Chala absent for 3 days.");

  // 6. Admin marks Sara Tesfaye (id: 5) absent for 1 day
  console.log("\n[Test 6] Admin marking Sara Tesfaye (id 5) absent for 1 day (Nov 20)");
  const adminMarkSara = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/attendance/absence',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    employeeId: 5,
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    category: 'OFFSITE',
    reason: 'Off-site core banking disaster recovery drill'
  });

  console.log(`Status: ${adminMarkSara.status}, Employee: ${adminMarkSara.body.employeeName}, Days: ${adminMarkSara.body.daysCount}`);
  if (adminMarkSara.body.employeeId !== 5 || adminMarkSara.body.daysCount !== 1) {
    throw new Error("Failed to mark Sara absent");
  }
  console.log("PASS: Admin successfully marked Sara Tesfaye absent for 1 day.");

  // 7. Admin clears absence for Tolassa
  console.log("\n[Test 7] Admin clearing absence for Tolassa Chala");
  const clearRes = await request({
    hostname: 'localhost',
    port: basePort,
    path: '/api/admin/attendance/clear',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  }, {
    employeeId: 4,
    startDate: '2026-11-16',
    endDate: '2026-11-18'
  });
  console.log(`Clear status: ${clearRes.status}, message: ${clearRes.body.message}`);
  if (clearRes.status !== 200) throw new Error("Failed to clear absence");
  console.log("PASS: Admin successfully cleared absence records.");

  console.log("\n🎉 ALL MULTI-DAY & ADMIN ABSENCE AUDIT CRITERIA PASSED 100%!");
}

runAudit().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

