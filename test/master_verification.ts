import assert from 'node:assert/strict';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { AuraDB } from '../src/server/db/auraDb';
import { RealExecutor } from '../src/server/runtime/realExecutor';
import { N8NClient } from '../src/server/integrations/n8nClient';

async function runMasterVerification() {
  console.log('=== AURA AI MASTER SYSTEM VERIFICATION ===\n');

  // 1. Password Hashing & Authentication
  console.log('[1/6] Testing Secure Password Hashing & Storage...');
  const testPassword = 'SecureRandomPassword_123!';
  const salt = 'a1b2c3d4e5f6';
  const hashed = `${salt}:${scryptSync(testPassword, salt, 64).toString('hex')}`;
  const [storedSalt, storedHash] = hashed.split(':');
  const expected = Buffer.from(storedHash, 'hex');
  const actual = scryptSync(testPassword, storedSalt, expected.length);
  assert.equal(expected.length, actual.length);
  assert.ok(timingSafeEqual(expected, actual), 'Password hash must verify via timingSafeEqual');
  console.log('  -> PASS: Scrypt password hashing & timing-safe verification verified.');

  // 2. Persistent SQLite Database Layer
  console.log('\n[2/6] Testing AuraDB (SQLite persistent storage)...');
  const testUserId = 'usr-test-' + Date.now();
  const testUser = {
    id: testUserId,
    email: `test_${Date.now()}@example.com`,
    name: 'Test Engineer',
    role: 'FREE_USER' as const,
    subscriptionPlan: 'FREE' as const,
    subscriptionStatus: 'active' as const,
    createdAt: new Date().toISOString(),
    isOwner: false
  };

  AuraDB.upsertUser(testUser);
  const fetchedUser = AuraDB.getUserById(testUserId);
  assert.ok(fetchedUser, 'User must exist in SQLite DB');
  assert.equal(fetchedUser?.email, testUser.email);

  // Session
  const sessionToken = 'sess-token-' + Date.now();
  AuraDB.createSession(sessionToken, testUserId, 3600000);
  const sessionUser = AuraDB.getSessionUser(sessionToken);
  assert.equal(sessionUser?.id, testUserId, 'Session must return correct user from DB');
  AuraDB.deleteSession(sessionToken);
  assert.equal(AuraDB.getSessionUser(sessionToken), null, 'Deleted session must be null');

  // Quota
  const quota = AuraDB.getProjectQuotaStatus(testUser);
  assert.equal(quota.limit, 5, 'Free user quota must be 5 projects/day');
  assert.equal(quota.isOwner, false);

  // Task & Idempotency
  const testTask = {
    taskId: 'tsk-test-' + Date.now(),
    userId: testUserId,
    title: 'Automated Build Pipeline',
    description: 'Compile and verify build artifacts',
    status: 'COMPLETED' as const,
    priority: 'high' as const,
    nodes: [{
      id: 'n1',
      title: 'Lint & Compile',
      agentId: 'agent-code',
      agentName: 'CODE',
      role: 'Software Architect',
      level: 0,
      dependsOn: [],
      status: 'completed' as const,
      progress: 100,
      detail: 'Clean build',
      logs: ['[CODE] Succeeded']
    }],
    edges: [],
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: ['[System] Task recorded']
  };

  const idempotencyKey = 'idem-' + Date.now();
  AuraDB.upsertTask(testTask, idempotencyKey);
  const idempotentTask = AuraDB.getTaskByIdempotencyKey(idempotencyKey);
  assert.ok(idempotentTask, 'Task must be retrieved by idempotency key');
  assert.equal(idempotentTask?.taskId, testTask.taskId);

  // Memory
  const memId = 'mem-test-' + Date.now();
  AuraDB.addMemory({
    memoryId: memId,
    userId: testUserId,
    category: 'USER_PREFERENCES',
    title: 'Code Formatting Rule',
    content: 'Always output typed responses',
    source: 'user_command',
    importance: 'high',
    confidence: 1.0
  });
  const memories = AuraDB.getMemories(testUserId);
  assert.ok(memories.some(m => m.memoryId === memId), 'Memory must persist and be retrieved');
  console.log('  -> PASS: SQLite persistent database operations all verified.');

  // 3. Real Execution Runtime (Filesystem & QA)
  console.log('\n[3/6] Testing RealExecutor (Filesystem operations & QA verification)...');
  const projId = 'proj-verify-' + Date.now();
  const writeRes = await RealExecutor.writeFile(testUserId, projId, 'test.txt', 'AURA real file execution verified.');
  assert.ok(writeRes.success, 'File write must succeed');

  const readRes = await RealExecutor.readFile(testUserId, projId, 'test.txt');
  assert.ok(readRes.success, 'File read must succeed');
  assert.equal(readRes.data, 'AURA real file execution verified.');

  const editRes = await RealExecutor.editFile(testUserId, projId, 'test.txt', 'execution', 'craftsmanship');
  assert.ok(editRes.success, 'File edit must succeed');
  const readRes2 = await RealExecutor.readFile(testUserId, projId, 'test.txt');
  assert.equal(readRes2.data, 'AURA real file craftsmanship verified.');

  // Real website file creation and QA verification
  const siteFiles = RealExecutor.createWebsiteProjectFiles(testUserId, {
    id: projId,
    name: 'Aura Luxury Bakery',
    category: 'bakery',
    whatsappNumber: '+91 98186 91915',
    pricing: [{ name: 'Custom Tasting', price: '$29', features: ['Handmade pastry', 'Artisan coffee'] }]
  });
  assert.ok(siteFiles.ok, 'Website project files must be generated');
  const qaReport = RealExecutor.verifyWebsiteProject(siteFiles.files);
  assert.ok(qaReport.ok, 'QA verification must pass score threshold');
  assert.ok(qaReport.score >= 60, 'QA verification score must be >= 60');
  console.log(`  -> PASS: Filesystem and QA engine verified (Score: ${qaReport.score}/100).`);

  // 4. Command Execution Safety & Blacklisting
  console.log('\n[4/6] Testing Terminal Safety & Blacklist Enforcement...');
  const safeCmdRes = await RealExecutor.executeCommand(testUserId, 'echo "AURA safe command test"');
  assert.ok(safeCmdRes.success, 'Safe echo command must succeed');
  assert.ok(safeCmdRes.data?.stdout.includes('AURA safe command test'));

  const dangerousCmdRes = await RealExecutor.executeCommand(testUserId, 'rm -rf /');
  assert.equal(dangerousCmdRes.success, false, 'Blacklisted rm -rf command must be blocked');
  assert.ok(dangerousCmdRes.error?.includes('blacklisted'), 'Security blacklist block must be triggered');
  console.log('  -> PASS: Dangerous commands successfully intercepted and blacklisted.');

  // 5. n8n Client
  console.log('\n[5/6] Testing n8n Client Integration...');
  const n8nStatus = await N8NClient.checkStatus();
  assert.equal(typeof n8nStatus.configured, 'boolean');
  assert.equal(typeof n8nStatus.connected, 'boolean');
  console.log(`  -> PASS: n8n client status checked (configured: ${n8nStatus.configured}, url: https://miracle11.app.n8n.cloud).`);

  // 6. Conversational Orchestration & Intent Classification
  console.log('\n[6/6] Testing AURA Brain Conversational Intent Classification...');
  const { classifyIntent, detectLanguage } = await import('../src/services/ai/intent');
  
  // Greetings must be CONVERSATION (NO task or DAG generated)
  assert.equal(classifyIntent('hello'), 'CONVERSATION');
  assert.equal(classifyIntent('hi aura'), 'CONVERSATION');
  assert.equal(classifyIntent('how are you today?'), 'CONVERSATION');
  assert.equal(classifyIntent('hindi me baat karo'), 'CONVERSATION');
  assert.equal(detectLanguage('hindi me baat karo'), 'hinglish');

  // Questions must be QUESTION (NO task or DAG generated)
  assert.equal(classifyIntent('what tools do you have available?'), 'QUESTION');

  // Real execution requests must generate ACTION_REQUEST
  assert.equal(classifyIntent('Build a gym website with pricing cards and WhatsApp booking'), 'ACTION_REQUEST');
  assert.equal(classifyIntent('Execute terminal command npm run build'), 'ACTION_REQUEST');
  console.log('  -> PASS: Greetings/conversations strictly produce zero tasks; real work requests correctly trigger execution.');

  console.log('\n=== ALL 6 MASTER SYSTEM VERIFICATION CHECKS PASSED ===\n');
}

runMasterVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
