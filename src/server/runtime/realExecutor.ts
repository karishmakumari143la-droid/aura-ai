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

  // ==================== REAL AURA NATIVE WEBSITE PROJECT ====================
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

    const cleanWhatsapp = (site.whatsappNumber || '').replace(/\D/g, '');
    const title = site.name || 'AURA Project';
    const headline = site.headline || title;
    const description = site.description || `Welcome to ${title}.`;

    const pricing = site.pricing || [
      {
        name: 'Starter',
        price: '₹2,999',
        period: '',
        features: ['Professional website', 'Mobile responsive', 'WhatsApp CTA']
      },
      {
        name: 'Growth',
        price: '₹5,999',
        period: '',
        features: ['Everything in Starter', 'SEO setup', 'Conversion sections']
      },
      {
        name: 'Premium',
        price: '₹9,999',
        period: '',
        features: ['Everything in Growth', 'Advanced sections', 'Priority support']
      }
    ];

    const pricingHtml = pricing.map((p) => `
      <article class="pricing-card">
        <h3>${p.name}</h3>
        <div class="price">${p.price}<span>${p.period || ''}</span></div>
        <ul>
          ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
        </ul>
        <a class="button secondary" href="https://wa.me/${cleanWhatsapp}?text=Interested%20in%20${encodeURIComponent(p.name)}">Choose ${p.name}</a>
      </article>
    `).join('\n');

    const sectionsHtml = (site.sections || []).map((section) => `
      <section id="${section.id}" class="content-section">
        <div class="container">
          <h2>${section.title}</h2>
          <p>${section.content}</p>
        </div>
      </section>
    `).join('\n');

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description.replace(/"/g, '&quot;')}">
  <title>${title.replace(/</g, '&lt;')} | Official Website</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="/">${title}</a>
      <a class="button whatsapp" href="https://wa.me/${cleanWhatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container hero-inner">
        <div class="eyebrow">BUILT & VERIFIED BY AURA AI</div>
        <h1>${headline}</h1>
        <p>${description}</p>
        <div class="actions">
          <a class="button primary" href="#pricing">View Packages</a>
          <a class="button secondary" href="https://wa.me/${cleanWhatsapp}" target="_blank" rel="noopener noreferrer">Talk on WhatsApp</a>
        </div>
      </div>
    </section>

    ${sectionsHtml}

    <section id="pricing" class="pricing-section">
      <div class="container">
        <div class="section-heading">
          <span>PACKAGES</span>
          <h2>Choose the right option</h2>
        </div>
        <div class="pricing-grid">
          ${pricingHtml}
        </div>
      </div>
    </section>

    <section id="contact" class="contact-section">
      <div class="container">
        <h2>Ready to get started?</h2>
        <p>Connect directly and start a conversation.</p>
        <a class="button primary" href="https://wa.me/${cleanWhatsapp}" target="_blank" rel="noopener noreferrer">Start WhatsApp Conversation</a>
      </div>
    </section>
  </main>

  <footer>
    <div class="container">
      <span>© ${new Date().getFullYear()} ${title}. All rights reserved.</span>
      <span>Built with AURA AI</span>
    </div>
  </footer>
</body>
</html>`;

    const styleCss = `:root {
  --bg: #060913;
  --surface: #0c1220;
  --surface-2: #111a2b;
  --text: #f8fafc;
  --muted: #94a3b8;
  --line: rgba(148,163,184,.18);
  --primary: #22d3ee;
  --success: #34d399;
  --max: 1120px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: radial-gradient(circle at 50% 0%, #101b32 0, var(--bg) 45%);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
}
a { color: inherit; text-decoration: none; }
.container { width: min(var(--max), calc(100% - 40px)); margin: auto; }

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--line);
  background: rgba(6,9,19,.86);
  backdrop-filter: blur(18px);
}
.nav {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.brand { font-weight: 800; letter-spacing: -.02em; }

.hero { padding: 120px 0 100px; }
.hero-inner { max-width: 900px; text-align: center; }
.eyebrow, .section-heading span {
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .2em;
}
h1 {
  margin: 18px 0;
  font-size: clamp(42px, 8vw, 82px);
  line-height: .98;
  letter-spacing: -.055em;
}
h2 {
  font-size: clamp(30px, 5vw, 52px);
  line-height: 1.05;
  letter-spacing: -.04em;
}
.hero p, .content-section p, .contact-section p {
  max-width: 720px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 18px;
}
.actions {
  margin-top: 34px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 999px;
  font-weight: 750;
  transition: transform .2s ease, opacity .2s ease;
}
.button:hover { transform: translateY(-2px); opacity: .9; }
.primary { background: var(--primary); color: #041018; }
.secondary { border: 1px solid var(--line); background: var(--surface); }
.whatsapp { background: var(--success); color: #03130d; }

.content-section, .pricing-section, .contact-section {
  padding: 90px 0;
  border-top: 1px solid var(--line);
}
.content-section .container { text-align: center; }
.section-heading { margin-bottom: 36px; }
.section-heading h2 { margin: 12px 0 0; }

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.pricing-card {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(17,26,43,.95), rgba(8,13,25,.95));
}
.pricing-card h3 { margin: 0; font-size: 20px; }
.price { margin: 18px 0; font-size: 38px; font-weight: 850; }
.price span { color: var(--muted); font-size: 14px; }
.pricing-card ul { min-height: 120px; margin: 0 0 24px; padding: 0; list-style: none; color: var(--muted); }
.pricing-card li { margin: 8px 0; }

.contact-section { text-align: center; }
.contact-section .button { margin-top: 26px; }

footer {
  border-top: 1px solid var(--line);
  padding: 28px 0;
  color: var(--muted);
  font-size: 13px;
}
footer .container {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

@media (max-width: 760px) {
  .container { width: min(var(--max), calc(100% - 28px)); }
  .hero { padding: 82px 0 70px; }
  .pricing-grid { grid-template-columns: 1fr; }
  footer .container { flex-direction: column; }
}
`;

    const projectManifest = JSON.stringify({
      schemaVersion: 1,
      engine: 'AURA_NATIVE_WEBSITE_ENGINE',
      projectId: site.id,
      userId,
      name: title,
      category: site.category || 'general',
      entry: 'index.html',
      assets: [],
      sourceFiles: ['index.html', 'style.css'],
      deployment: {
        provider: null,
        status: 'NOT_DEPLOYED',
        githubRequired: false
      },
      generatedAt: new Date().toISOString()
    }, null, 2);

    const files = [
      { name: 'index.html', path: 'index.html', content: indexHtml },
      { name: 'style.css', path: 'style.css', content: styleCss },
      { name: 'aura-project.json', path: 'aura-project.json', content: projectManifest }
    ];

    for (const file of files) {
      const target = path.join(projectDir, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content, 'utf8');
    }

    const verified = files.every((file) => {
      const target = path.join(projectDir, file.path);
      return fs.existsSync(target) && fs.readFileSync(target, 'utf8') === file.content;
    });

    return { ok: verified, files };
  }
}
