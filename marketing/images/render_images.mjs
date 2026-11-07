import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const { chromium, expect } = createRequire(path.join(root, 'frontend/package.json'))('@playwright/test');
const work = path.join(here, 'work');
await mkdir(work, { recursive: true });
const run = await mkdtemp(path.join(work, 'run-'));
const python = path.join(work, 'venv/bin/python');
execFileSync('python3', ['-m', 'venv', path.join(work, 'venv')]);
execFileSync(python, ['-m', 'pip', 'install', '-r', path.join(root, 'backend/requirements.txt')], { stdio: 'inherit' });
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, DATA_DIR: path.join(run, 'data'), FRONTEND_DIST: path.join(root, 'frontend/dist'), BACKGROUND_ENABLED: 'false', COOKIE_SECURE: 'false' };
delete env.LEADPILOT_AI_API_KEY;
delete env.SECRET_KEY;
const server = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)], { cwd: path.join(root, 'backend'), env, stdio: 'ignore' });
let browser;
const output = {};
const logo = '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="#6955ed"/><path d="m12 22 25-11-10 26-4-11-11-4Zm11 4 14-15" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg>';
const font = (await readFile(path.join(root, 'frontend/node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2'))).toString('base64');
const styles = `@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;font-family:Inter,sans-serif;color:#20233d}svg{display:block}img{display:block}.brand{display:flex;align-items:center;gap:16px;font-size:32px}.brand svg{width:54px}.eyebrow{color:#7564bb;font-size:14px;letter-spacing:2px}`;

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Image server exited before becoming ready');
    try { if ((await fetch(base + '/api/health')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Image server did not become ready');
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const headers = { 'X-Requested-With': 'LeadPilot' };
  for (const [route, data] of [['/auth/setup', { email: 'images@example.com', password: 'FictionalImages123!' }], ['/demo/load', {}]]) {
    const result = await context.request.post(base + '/api' + route, { headers, data });
    if (!result.ok()) throw new Error(`${route}: ${result.status()}`);
  }
  const settings = await context.request.patch(base + '/api/settings', { headers, data: { onboarding_complete: true, tone: 'concise', ai_provider: 'demo' } });
  if (!settings.ok()) throw new Error('Could not configure fictional image workspace');
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function readyPage(url) {
    await page.goto(base + url);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: '.toast{display:none!important}' });
  }
  async function shot(name, fullPage = false) {
    const target = path.join(here, name);
    await page.screenshot({ path: target, fullPage, animations: 'disabled' });
    const png = await readFile(target);
    output[name] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length };
  }
  async function composition(name, html, width, height, dpr = 1) {
    const canvas = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
    await canvas.setContent(`<style>${styles}</style>${html}`);
    await canvas.evaluate(() => document.fonts.ready);
    const target = path.join(here, name);
    await canvas.screenshot({ path: target });
    const png = await readFile(target);
    output[name] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length };
    await canvas.close();
  }
  await readyPage('/');
  const dashboard = (await page.screenshot({ animations: 'disabled' })).toString('base64');
  await composition('screenshot-dashboard.png', `<img style="width:100%;height:100%" src="data:image/png;base64,${dashboard}">`, 960, 540, 2);
  await readyPage('/leads');
  await page.getByRole('link', { name: /Sarah Chen/ }).first().click();
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.waitForLoadState('networkidle');
  await shot('screenshot-lead-detail.png', true);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.getByTestId('generate-draft').click();
  await expect(page.getByTestId('draft-body')).toHaveValue(/Sarah/);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('screenshot-ai-draft.png', true);
  await readyPage('/reminders');
  await shot('screenshot-reminders.png', true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await readyPage('/');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const dark = (await page.screenshot({ animations: 'disabled' })).toString('base64');
  await composition('screenshot-dark-mode.png', `<img style="width:100%;height:100%" src="data:image/png;base64,${dark}">`, 960, 540, 2);
  await page.getByTestId('theme-toggle').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await readyPage('/leads');
  await expect(page.getByTestId('mobile-leads')).toBeVisible();
  await shot('screenshot-mobile.png');

  await composition('cover.png', `<style>body{background:linear-gradient(120deg,#eeecff,#f8f9ff)}.brand{position:absolute;left:60px;top:55px}.copy{position:absolute;left:60px;top:205px;width:470px}h1{font-size:69px;line-height:1.08;letter-spacing:-3px;margin:24px 0 28px}.value{font-size:21px;color:#62607d;line-height:1.5}.browser{position:absolute;left:560px;top:235px;width:660px;border:1px solid #dcd7f2;border-radius:18px;background:white;overflow:hidden;box-shadow:0 25px 65px #40328a25}.chrome{height:40px;background:#fff;display:flex;align-items:center;gap:7px;padding:0 15px;color:#858197;font-size:12px}.dot{width:9px;height:9px;border-radius:100%;background:#d9d3ef}.browser img{width:100%}.footer{position:absolute;left:60px;bottom:43px;font-size:12px;color:#7564bb;letter-spacing:1.5px}</style><div class="brand">${logo}<b>LeadPilot AI</b></div><div class="copy"><div class="eyebrow">LOCAL-FIRST · HUMAN-LED</div><h1>Your leads,<br>organized.</h1><div class="value">Organize leads. Review every reply.</div></div><div class="browser"><div class="chrome"><i class="dot"></i><i class="dot"></i><i class="dot"></i><span style="margin-left:15px">LeadPilot AI · Your local workspace</span></div><img src="data:image/png;base64,${dashboard}"></div><div class="footer">DRAFTS ONLY · NO AUTOMATIC SENDING</div>`, 1280, 720);
  const tiles = [
    ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', 'Lead dashboard', 'See new inquiries and lead statuses.'],
    ['M4 3h12l4 4v14H4zM8 11h8M8 15h8M8 18h4', 'CSV import', 'Preview rows and errors before importing.'],
    ['M4 4h16v12H9l-5 4zM8 8h8M8 12h5', 'AI drafts you approve', 'Review, edit, and copy. No automatic sending.'],
    ['M12 3v3M5 6l2 2M19 6l-2 2M5 18h14l-2-3v-4a5 5 0 0 0-10 0v4zM10 21h4', 'Follow-up reminders', 'See overdue, today, and upcoming follow-ups.'],
    ['M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7zM8 12l3 3 5-6', 'Local-first data', 'Your workspace lives on your device.'],
    ['M3 12h18M12 3v18M5 5l14 14M19 5 5 19', 'Demo mode / bring-your-own AI', 'Try templates or connect your own provider.'],
  ];
  await composition('feature-overview.png', `<style>body{background:#f6f5fc;padding:70px 80px}.header{display:flex;justify-content:space-between;align-items:center}h1{font-size:54px;letter-spacing:-2px;margin:24px 0 12px}.intro{font-size:23px;color:#727085;margin-bottom:38px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.tile{height:350px;border:1px solid #e5e1f1;border-radius:24px;background:white;padding:32px;box-shadow:0 10px 25px #2b245507}.icon{background:#eeebff;border-radius:16px;padding:15px;width:72px;height:72px;color:#6955ed}.icon svg{width:42px;height:42px}h2{font-size:28px;line-height:1.25;margin:24px 0 14px}p{font-size:22px;line-height:1.5;color:#747184;margin:0}</style><div class="header"><div class="eyebrow">A CALMER FOLLOW-UP WORKFLOW</div><div class="brand">${logo}<b>LeadPilot AI</b></div></div><h1>Practical tools. You stay in control.</h1><div class="intro">Organize inquiries, prepare replies, and keep track of the next step.</div><div class="grid">${tiles.map(([d,title,caption])=>`<div class="tile"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="${d}"/></svg></div><h2>${title}</h2><p>${caption}</p></div>`).join('')}</div>`, 1600, 1200);
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(path.join(here, 'metadata.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
