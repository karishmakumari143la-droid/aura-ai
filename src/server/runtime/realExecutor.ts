import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { AuraDB } from '../db/auraDb';

const WORKSPACE_BASE = path.join(process.cwd(), 'data', 'workspaces');
if (!fs.existsSync(WORKSPACE_BASE)) {
  fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
}

export interface ExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  verified: boolean;
  durationMs: number;
}

export class RealExecutor {
  /**
   * Resolve and enforce safe sandboxed workspace path for a user/project
   */
  static getWorkspacePath(userId: string, projectId: string): string {
    const sanitizedUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sanitizedProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const userDir = path.join(WORKSPACE_BASE, sanitizedUser, sanitizedProject);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  // ==================== FILESYSTEM OPERATIONS ====================
  static async writeFile(userId: string, projectId: string, relPath: string, content: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const ws = RealExecutor.getWorkspacePath(userId, projectId);
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(ws, safeRel);

    try {
      const parent = path.dirname(fullPath);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
      const verified = fs.existsSync(fullPath) && fs.readFileSync(fullPath, 'utf8') === content;
      const durationMs = Date.now() - startTime;

      AuraDB.logExecution({
        executionId: 'exec-' + Math.random().toString(36).substring(2, 9),
        userId,
        toolName: 'filesystem.writeFile',
        input: { projectId, relPath, length: content.length },
        output: { fullPath, verified, bytesWritten: Buffer.byteLength(content) },
        status: verified ? 'VERIFIED' : 'FAILED',
        verified,
        durationMs
      });

      return { success: true, data: { path: safeRel, bytes: Buffer.byteLength(content) }, verified, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      AuraDB.logExecution({
        executionId: 'exec-' + Math.random().toString(36).substring(2, 9),
        userId,
        toolName: 'filesystem.writeFile',
        input: { projectId, relPath },
        error: err.message,
        status: 'FAILED',
        verified: false,
        durationMs
      });
      return { success: false, error: err.message, verified: false, durationMs };
    }
  }

  static async readFile(userId: string, projectId: string, relPath: string): Promise<ExecutionResult<string>> {
    const startTime = Date.now();
    const ws = RealExecutor.getWorkspacePath(userId, projectId);
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(ws, safeRel);

    try {
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${safeRel}`);
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      const durationMs = Date.now() - startTime;
      return { success: true, data: content, verified: true, durationMs };
    } catch (err: any) {
      return { success: false, error: err.message, verified: false, durationMs: Date.now() - startTime };
    }
  }

  static async editFile(userId: string, projectId: string, relPath: string, targetStr: string, replacementStr: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const ws = RealExecutor.getWorkspacePath(userId, projectId);
    const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(ws, safeRel);

    try {
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Target file does not exist: ${safeRel}`);
      }
      const current = fs.readFileSync(fullPath, 'utf8');
      if (!current.includes(targetStr)) {
        throw new Error(`Target string not found in ${safeRel}`);
      }
      const updated = current.replace(targetStr, replacementStr);
      fs.writeFileSync(fullPath, updated, 'utf8');
      const verified = fs.readFileSync(fullPath, 'utf8').includes(replacementStr);
      const durationMs = Date.now() - startTime;

      AuraDB.logExecution({
        executionId: 'exec-' + Math.random().toString(36).substring(2, 9),
        userId,
        toolName: 'filesystem.editFile',
        input: { projectId, relPath, targetLength: targetStr.length, replacementLength: replacementStr.length },
        output: { verified },
        status: verified ? 'VERIFIED' : 'FAILED',
        verified,
        durationMs
      });

      return { success: true, data: { path: safeRel, updated: true }, verified, durationMs };
    } catch (err: any) {
      return { success: false, error: err.message, verified: false, durationMs: Date.now() - startTime };
    }
  }

  static async listFiles(userId: string, projectId: string): Promise<ExecutionResult<string[]>> {
    const startTime = Date.now();
    const ws = RealExecutor.getWorkspacePath(userId, projectId);

    function scan(dir: string, base: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const full = path.join(dir, file);
        const rel = path.relative(base, full);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
          results = results.concat(scan(full, base));
        } else {
          results.push(rel);
        }
      }
      return results;
    }

    try {
      const files = scan(ws, ws);
      return { success: true, data: files, verified: true, durationMs: Date.now() - startTime };
    } catch (err: any) {
      return { success: false, error: err.message, verified: false, durationMs: Date.now() - startTime };
    }
  }

  // ==================== REAL TERMINAL COMMAND EXECUTION ====================
  static async executeCommand(userId: string, command: string, cwd?: string, timeoutMs = 15000): Promise<ExecutionResult<{ stdout: string; stderr: string; exitCode: number }>> {
    const startTime = Date.now();
    const workingDir = cwd || process.cwd();

    // Security check: block hazardous destructive commands
    const lowerCmd = command.toLowerCase().trim();
    const isDangerous = /(rm\s+-[rf]{1,3}\s+[\/~]|mkfs|dd\s+if|:\(\)\{:|shutdown|reboot|chmod\s+-r\s+777\s+\/)/i.test(lowerCmd);
    if (isDangerous) {
      return {
        success: false,
        error: 'Execution blocked: Command matches blacklisted critical destructive patterns.',
        verified: false,
        durationMs: Date.now() - startTime
      };
    }

    return new Promise((resolve) => {
      exec(command, { cwd: workingDir, timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const exitCode = err ? (err.code || 1) : 0;
        const success = exitCode === 0;

        AuraDB.logExecution({
          executionId: 'exec-' + Math.random().toString(36).substring(2, 9),
          userId,
          toolName: 'terminal.executeCommand',
          input: { command, cwd: workingDir },
          output: { stdout: stdout.slice(0, 1000), stderr: stderr.slice(0, 1000), exitCode },
          status: success ? 'SUCCESS' : 'FAILED',
          verified: true,
          durationMs,
          error: err ? err.message : undefined
        });

        resolve({
          success,
          data: { stdout, stderr, exitCode },
          error: err ? err.message : undefined,
          verified: true,
          durationMs
        });
      });
    });
  }

  // ==================== REAL WEB RESEARCH / INSPECTION ====================
  static async inspectWebResource(userId: string, url: string): Promise<ExecutionResult<{ title?: string; status: number; textSnippet: string; isLive: boolean }>> {
    const startTime = Date.now();
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported.');
      }

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AURA-AI-Research-Agent/1.0 (+https://aura.ai)'
        },
        signal: AbortSignal.timeout(8000)
      });

      const text = await res.text();
      const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      const stripped = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 800);

      const durationMs = Date.now() - startTime;
      return {
        success: res.ok,
        data: {
          title,
          status: res.status,
          textSnippet: stripped,
          isLive: res.ok
        },
        verified: true,
        durationMs
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to inspect web resource: ${err.message}`,
        verified: false,
        durationMs: Date.now() - startTime
      };
    }
  }

  // ==================== PROJECT VERIFICATION ENGINE ====================
  static verifyWebsiteProject(files: Array<{ name: string; path: string; content: string }>): { ok: boolean; score: number; checks: string[]; detail: string } {
    const checks: string[] = [];
    let score = 0;

    const indexFile = files.find(f => f.name === 'index.html' || f.path === 'index.html');
    if (!indexFile) {
      return {
        ok: false,
        score: 0,
        checks: ['Missing root index.html'],
        detail: 'Verification failed: Project has no entry point index.html'
      };
    }
    checks.push('Found entry point index.html');
    score += 25;

    const html = indexFile.content;

    // Check DOCTYPE
    if (/<!DOCTYPE\s+html>/i.test(html)) {
      checks.push('Valid HTML5 DOCTYPE declaration');
      score += 15;
    } else {
      checks.push('Warning: Missing standard <!DOCTYPE html>');
    }

    // Check Viewport Meta Tag for responsive layout
    if (/<meta[^>]+viewport[^>]*>/i.test(html)) {
      checks.push('Responsive viewport meta tag verified');
      score += 20;
    } else {
      checks.push('Missing viewport meta tag');
    }

    // Check for WhatsApp booking CTA
    if (/api\.whatsapp\.com|wa\.me/i.test(html)) {
      checks.push('Verified direct WhatsApp CTA integration');
      score += 20;
    } else {
      checks.push('Note: No external WhatsApp link found in HTML');
    }

    // Check for Tailwind or valid styling
    if (/tailwindcss|cdn\.tailwindcss\.com|<style\b/i.test(html)) {
      checks.push('Verified active stylesheet or Tailwind engine');
      score += 20;
    } else {
      checks.push('Warning: No CSS stylesheet detected');
    }

    const ok = score >= 60;
    return {
      ok,
      score,
      checks,
      detail: ok
        ? `Passed QA Verification (Score: ${score}/100, ${checks.length} checks passing).`
        : `QA Verification failed (Score: ${score}/100).`
    };
  }

  // ==================== REAL PROJECT FILE GENERATION ====================
  static createWebsiteProjectFiles(userId: string, site: {
    id: string;
    name: string;
    headline?: string;
    description?: string;
    category?: string;
    whatsappNumber?: string;
    pricing?: Array<{ name: string; price: string; period?: string; features?: string[] }>;
    heroImage?: string;
    sections?: Array<{ id: string; title: string; content: string }>;
  }): { ok: boolean; files: Array<{ name: string; path: string; content: string }> } {
    const projectDir = RealExecutor.getWorkspacePath(userId, site.id);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const pricingCardsHtml = (site.pricing || [
      { name: 'Standard', price: '$49', period: '/mo', features: ['All features included', '24/7 support'] }
    ]).map(p => `
      <div class="border border-slate-800 bg-slate-900/60 p-6 rounded-xl hover:border-cyan-500/50 transition">
        <h3 class="text-lg font-semibold text-white">${p.name}</h3>
        <div class="mt-4 flex items-baseline text-white">
          <span class="text-3xl font-bold tracking-tight">${p.price}</span>
          <span class="ml-1 text-sm text-slate-400">${p.period || ''}</span>
        </div>
        <ul class="mt-6 space-y-3 text-sm text-slate-300">
          ${(p.features || ['High performance', 'Responsive design', 'Instant support']).map(f => `<li class="flex items-center gap-2">✓ ${f}</li>`).join('')}
        </ul>
        <a href="https://wa.me/${(site.whatsappNumber || '').replace(/\D/g, '')}?text=Interested%20in%20${encodeURIComponent(p.name)}" class="mt-8 block w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-cyan-500 transition">Get Started</a>
      </div>
    `).join('\n');

    const cleanWhatsapp = (site.whatsappNumber || '').replace(/\D/g, '');

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.name} | Official Website</title>
  <meta name="description" content="${site.description || site.headline || ''}">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#060913] text-slate-100 font-sans antialiased">
  <header class="border-b border-slate-800/80 bg-[#060913]/90 sticky top-0 z-50 backdrop-blur">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="font-bold text-lg tracking-tight text-white">${site.name}</div>
      <a href="https://wa.me/${cleanWhatsapp}" target="_blank" rel="noopener noreferrer" class="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition">WhatsApp Inquiry</a>
    </div>
  </header>

  <main>
    <section class="py-20 px-4 max-w-5xl mx-auto text-center">
      <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">${site.headline || site.name}</h1>
      <p class="text-lg text-slate-400 max-w-2xl mx-auto mb-10">${site.description || 'Welcome to our verified digital experience.'}</p>
      <div class="flex justify-center gap-4">
        <a href="#pricing" class="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 transition">View Plans</a>
        <a href="https://wa.me/${cleanWhatsapp}" class="rounded-lg border border-slate-700 bg-slate-800/50 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition">Direct Message</a>
      </div>
    </section>

    <section id="pricing" class="py-16 px-4 max-w-6xl mx-auto border-t border-slate-800/60">
      <h2 class="text-2xl font-bold text-center text-white mb-10">Pricing & Packages</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${pricingCardsHtml}
      </div>
    </section>
  </main>

  <footer class="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
    <p>© ${new Date().getFullYear()} ${site.name}. All rights reserved. Built with AURA AI.</p>
  </footer>
</body>
</html>`;

    const styleCss = `/* Custom design tokens */
:root {
  --primary-glow: rgba(6, 182, 212, 0.2);
}
`;

    const files = [
      { name: 'index.html', path: 'index.html', content: indexHtml },
      { name: 'style.css', path: 'style.css', content: styleCss }
    ];

    for (const file of files) {
      fs.writeFileSync(path.join(projectDir, file.path), file.content, 'utf8');
    }

    return { ok: true, files };
  }
}
