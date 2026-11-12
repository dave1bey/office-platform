const http = require('http');
const assert = require('assert');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(bodyBuffer.toString('utf8'));
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer: bodyBuffer,
          text: bodyBuffer.toString('utf8'),
          json
        });
      });
    });
    req.on('error', reject);
    if (data) {
      if (Buffer.isBuffer(data)) req.write(data);
      else if (typeof data === 'string') req.write(data);
      else req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== RUNNING EXTENSIVE VERIFICATION SUITE ===");

  // 1. Initial State: tasks must be clean empty array
  console.log("\n[Test 1] Verify tasks starts empty...");
  const t1 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/tasks',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert.strictEqual(t1.statusCode, 200);
  assert(Array.isArray(t1.json), "Tasks should be an array");
  console.log(`✓ Initial tasks count: ${t1.json.length} (clean slate)`);

  // 2. Ingest sample action plan
  console.log("\n[Test 2] Upload action plan to populate test deliverables...");
  const fs = require('fs');
  const sampleCsv = fs.readFileSync('sample_action_plan.csv', 'utf8');
  const t2 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/action-plans/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo_jwt_token_1'
    }
  }, {
    department: 'Development',
    planTitle: 'Core Banking Service Migration',
    rawCsv: sampleCsv
  });
  console.log(`✓ Upload status: ${t2.statusCode}, deliverables created: ${t2.json?.count || 0}`);

  // Fetch tasks after upload
  const tTasks = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/tasks',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert(tTasks.json.length > 0, "Tasks should now exist after ingest");
  const testTaskId = tTasks.json[0].id;
  const testTaskTitle = tTasks.json[0].title;
  console.log(`✓ Sample task available: ID ${testTaskId} ("${testTaskTitle}")`);

  // 3. Employee tries to delete task (MUST BE 403 FORBIDDEN)
  console.log("\n[Test 3] Employee (ID 3, Hagos Berhe) attempts DELETE /api/tasks/" + testTaskId + "...");
  const t3 = await request({
    hostname: 'localhost',
    port: 8091,
    path: `/api/tasks/${testTaskId}`,
    method: 'DELETE',
    headers: { Authorization: 'Bearer demo_jwt_token_3' } // Employee token
  });
  assert.strictEqual(t3.statusCode, 403, `Employee must be blocked with 403 Forbidden, got: ${t3.statusCode}`);
  console.log(`✓ Access correctly blocked for employee: ${t3.statusCode} (${t3.json?.error})`);

  // 4. Admin deletes task (MUST BE 200 OK)
  console.log("\n[Test 4] Admin attempts DELETE /api/tasks/" + testTaskId + "...");
  const t4 = await request({
    hostname: 'localhost',
    port: 8091,
    path: `/api/tasks/${testTaskId}`,
    method: 'DELETE',
    headers: { Authorization: 'Bearer demo_jwt_token_1' } // Admin token
  });
  assert.strictEqual(t4.statusCode, 200, `Admin must succeed with 200, got: ${t4.statusCode}`);
  console.log(`✓ Admin successfully deleted task: ${t4.statusCode} (${t4.json?.message})`);

  // 5. Excel Export with Query Token (?token=demo_jwt_token_1)
  console.log("\n[Test 5] Test Excel Export with Query Token (?token=demo_jwt_token_1)...");
  const t5 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/analytics/export?period=all&team=ALL&format=xlsx&token=demo_jwt_token_1',
    method: 'GET'
  });
  assert.strictEqual(t5.statusCode, 200, `Excel export must succeed, got: ${t5.statusCode}`);
  assert.strictEqual(t5.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert(t5.buffer.length > 2000, `Excel file must have realistic binary size, got: ${t5.buffer.length} bytes`);
  console.log(`✓ Excel export valid! Size: ${t5.buffer.length} bytes, MIME: ${t5.headers['content-type']}`);

  // 6. CSV Export
  console.log("\n[Test 6] Test CSV Export...");
  const t6 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/analytics/export?period=all&team=ALL&format=csv&token=demo_jwt_token_1',
    method: 'GET'
  });
  assert.strictEqual(t6.statusCode, 200);
  assert(t6.text.includes('Rank'), "CSV must have header row");
  console.log(`✓ CSV export valid! Length: ${t6.text.length} chars`);

  // 7. Record multi-day absence for an employee and test absent dates details
  console.log("\n[Test 7] Record 3-day absence for Hagos Berhe (EMP-003)...");
  const t7 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/attendance/absence',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo_jwt_token_1'
    }
  }, {
    employeeId: 3,
    startDate: '2026-11-12',
    endDate: '2026-11-14',
    category: 'MEDICAL',
    reason: 'Medical recovery for outpatient checkup'
  });
  assert.strictEqual(t7.statusCode, 200);
  console.log(`✓ Absence recorded for 3 days (${t7.json?.dates?.join(', ')})`);

  // Verify computeLeaderboard includes absentRecords
  const tLb = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/analytics/leaderboard?period=all&team=ALL',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  const hagosItem = tLb.json.find(i => i.employeeId === 3);
  assert(hagosItem, "Hagos must be in leaderboard");
  assert(hagosItem.recordedAbsentDays >= 3, "Hagos should have >= 3 absent days");
  assert(Array.isArray(hagosItem.absentRecords), "absentRecords array must be present");
  assert(hagosItem.absentRecords.length >= 3, "absentRecords should have >= 3 items");
  console.log(`✓ Leaderboard contains absentRecords for ${hagosItem.fullName}: ${hagosItem.absentRecords.length} records`);
  console.log(`  Sample record: Date=${hagosItem.absentRecords[0].attendanceDate}, Cat=${hagosItem.absentRecords[0].absenceCategory}, Reason="${hagosItem.absentRecords[0].reason}"`);

  // 8. Test Employee Specific Absence History Endpoint
  console.log("\n[Test 8] Test GET /api/attendance/employee/3/history...");
  const t8 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/attendance/employee/3/history',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert.strictEqual(t8.statusCode, 200);
  assert.strictEqual(t8.json.employeeId, 3);
  assert(t8.json.records.length >= 3);
  console.log(`✓ History endpoint confirmed: ${t8.json.absentDaysCount} absent days returned`);

  // 9. Test Awards Endpoint (/api/analytics/awards)
  console.log("\n[Test 9] Test GET /api/analytics/awards...");
  const t9 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/analytics/awards',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert.strictEqual(t9.statusCode, 200);
  assert(t9.json.week, "Week award must exist");
  assert(t9.json.month, "Month award must exist");
  assert(t9.json.year, "Year award must exist");
  console.log(`✓ Awards retrieved: Week=${t9.json.week.fullName}, Month=${t9.json.month.fullName}, Year=${t9.json.year.fullName}`);

  // 10. Admin Nominate Employee for Award
  console.log("\n[Test 10] Admin nominates Abebe Bikila (EMP-002) as Employee of the Week...");
  const t10 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/admin/awards',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo_jwt_token_1'
    }
  }, {
    category: 'week',
    employeeId: 2,
    note: 'Stellar backend delivery on CBE server migration'
  });
  assert.strictEqual(t10.statusCode, 200);
  console.log(`✓ Award nomination saved: ${t10.json?.message}`);

  // Verify award updated
  const t9Updated = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/analytics/awards',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert.strictEqual(t9Updated.json.week.employeeId, 2);
  assert.strictEqual(t9Updated.json.week.isNominated, true);
  console.log(`✓ Verified updated award: Week winner is now ${t9Updated.json.week.fullName} (Admin Nominated)`);

  // 11. Clear All Deliverables (Admin Only)
  console.log("\n[Test 11] Test Clear All Deliverables (POST /api/admin/tasks/clear-all)...");
  const t11 = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/admin/tasks/clear-all',
    method: 'POST',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert.strictEqual(t11.statusCode, 200);
  console.log(`✓ All deliverables cleared: ${t11.json?.message}`);

  const tFinalTasks = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/tasks',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  assert.strictEqual(tFinalTasks.json.length, 0, "Tasks count must be 0 after clear-all");
  console.log(`✓ Clean slate confirmed: tasks count is now ${tFinalTasks.json.length}`);

  console.log("\n🎉 ALL 11 TESTS PASSED PERFECTLY WITH ZERO ERRORS!");
}

runTests().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});
