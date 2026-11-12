const http = require('http');
const fs = require('fs');
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
  console.log("=== TESTING NEW TEMPLATE DOWNLOAD & UPLOAD ===");

  // 1. Download CSV template
  console.log("\n[Test 1] Verify CSV Template Download...");
  const tCsv = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/action-plans/template?format=csv',
    method: 'GET'
  });
  assert.strictEqual(tCsv.statusCode, 200);
  assert(tCsv.text.includes('S.No'), "CSV must contain S.No");
  assert(tCsv.text.includes('Tasks '), "CSV must contain Tasks");
  assert(tCsv.text.includes('This Week Plan'), "CSV must contain This Week Plan");
  assert(tCsv.text.includes('Total Completed'), "CSV must contain Total Completed");
  assert(tCsv.text.includes('So Far'), "CSV must contain So Far");
  console.log(`✓ CSV template verified (${tCsv.text.length} chars)`);

  // 2. Download XLSX template
  console.log("\n[Test 2] Verify XLSX Template Download...");
  const tXlsx = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/action-plans/template?format=xlsx',
    method: 'GET'
  });
  assert.strictEqual(tXlsx.statusCode, 200);
  assert.strictEqual(tXlsx.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert(tXlsx.buffer.length > 3000, `XLSX template should be > 3000 bytes, got: ${tXlsx.buffer.length}`);
  console.log(`✓ XLSX template verified (${tXlsx.buffer.length} bytes)`);

  // 3. Clear all tasks first
  console.log("\n[Test 3] Clear all tasks before upload...");
  await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/admin/tasks/clear-all',
    method: 'POST',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });

  // 4. Upload the new template via CSV
  console.log("\n[Test 4] Upload New Template via CSV...");
  const csvContent = fs.readFileSync('sample_action_plan.csv', 'utf8');
  const tUploadCsv = await request({
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
    planTitle: 'Bank Core Integration & Environment Setup',
    rawCsv: csvContent
  });
  assert.strictEqual(tUploadCsv.statusCode, 200);
  console.log(`✓ Upload successful! Created: ${tUploadCsv.json?.count} deliverables`);
  assert(tUploadCsv.json?.count >= 6, `Should create at least 6 tasks, got: ${tUploadCsv.json?.count}`);

  // Fetch and inspect the parsed tasks
  const tTasks = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/tasks',
    method: 'GET',
    headers: { Authorization: 'Bearer demo_jwt_token_1' }
  });
  const tasks = tTasks.json;
  console.log(`✓ Total tasks now in system: ${tasks.length}`);

  // Inspect task 1.1
  const task1_1 = tasks.find(t => t.customTaskId === '1.1');
  assert(task1_1, "Task 1.1 must exist");
  assert.strictEqual(task1_1.startDate, '2026-11-09');
  assert.strictEqual(task1_1.endDate, '2026-11-14');
  assert.strictEqual(task1_1.thisWeekPlan, '10');
  assert.strictEqual(task1_1.totalCompletedSoFar, '88');
  assert.strictEqual(task1_1.status, 'IN_PROGRESS');
  assert.strictEqual(task1_1.teamName, 'Development');
  console.log(`✓ Task 1.1 parsed accurately:`);
  console.log(`   ID: ${task1_1.customTaskId}`);
  console.log(`   Title: ${task1_1.title.substring(0, 60)}...`);
  console.log(`   Dates: ${task1_1.startDate} to ${task1_1.endDate}`);
  console.log(`   Plan: ${task1_1.thisWeekPlan}, Completed So Far: ${task1_1.totalCompletedSoFar}, Status: ${task1_1.status}`);

  // Inspect task 2
  const task2 = tasks.find(t => t.customTaskId === '2');
  assert(task2, "Task 2 must exist");
  assert.strictEqual(task2.title, 'Familiarization Training (Main Bank)');
  assert.strictEqual(task2.startDate, '2026-11-09');
  assert.strictEqual(task2.endDate, '2026-11-14');
  assert.strictEqual(task2.thisWeekPlan, '0.05');
  assert.strictEqual(task2.totalCompletedSoFar, '0.95');
  console.log(`✓ Task 2 parsed accurately: "${task2.title}", Plan=${task2.thisWeekPlan}, Done=${task2.totalCompletedSoFar}`);

  // Inspect task 3
  const task3 = tasks.find(t => t.customTaskId === '3');
  assert(task3, "Task 3 must exist");
  assert.strictEqual(task3.startDate, '2026-10-09');
  assert.strictEqual(task3.endDate, '2026-11-14');
  console.log(`✓ Task 3 parsed accurately: Start=${task3.startDate}, End=${task3.endDate}`);

  // 5. Test Binary XLSX Upload
  console.log("\n[Test 5] Test Binary XLSX Upload with sample_action_plan.xlsx...");
  const xlsxBuf = fs.readFileSync('sample_action_plan.xlsx');
  const tUploadXlsx = await request({
    hostname: 'localhost',
    port: 8091,
    path: '/api/action-plans/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      Authorization: 'Bearer demo_jwt_token_1'
    }
  }, xlsxBuf);
  assert.strictEqual(tUploadXlsx.statusCode, 200);
  console.log(`✓ XLSX binary upload successful! Parsed ${tUploadXlsx.json?.count} deliverables directly from .xlsx`);

  console.log("\n🎉 ALL TESTS PASSED! NEW EXCEL & CSV TEMPLATE FULLY OPERATIONAL!");
}

runTests().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});

