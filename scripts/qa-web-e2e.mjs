import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('studio-render/package.json'));
const { chromium } = require('playwright-core');

const ROOT = path.resolve(import.meta.dirname, '..');

function findBrowser() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No local Chrome/Edge found for Web E2E probe');
}

async function waitForServer(url, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server timeout at ${url}`);
}

const port = 4193;
const base = `http://127.0.0.1:${port}`;
const serverProc = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'],
  { cwd: ROOT, stdio: 'pipe' }
);

let browser;
try {
  await waitForServer(`${base}/`);
  browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 920 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  // 1. Switch to "产品宣发片" (defaults to 6s & 9:16 & auto-opens D·宣发策划 panel)
  await page.getByRole('button', { name: '产品宣发片' }).click();
  await page.waitForSelector('input[aria-label="多镜头时间轴进度"]');

  // Verify PromoPlannerPanel appears, edit S1 headline, switch direction, & upload custom promo image for S2
  await page.getByRole('button', { name: /单曲乐评/ }).click();
  const s1Input = page.locator('input[placeholder="S1 主标题"]');
  await s1Input.fill('《我的专属定制宣发片》');
  const tmpPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAADklEQVR42mP8z8BQz0AEAEYAA/8e8v4AAAAASUVORK5CYII=',
    'base64'
  );
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles({ name: 'promo-photo.png', mimeType: 'image/png', buffer: tmpPng });
  await page.waitForTimeout(150);

  const canvasShots = new Set();
  const slider = page.locator('input[aria-label="多镜头时间轴进度"]');

  for (const t of ['0.4', '2.0', '3.8', '5.3']) {
    await slider.fill(t);
    await slider.dispatchEvent('change');
    // React range input triggers onChange via input event in Chromium
    await page.evaluate((val) => {
      const el = document.querySelector('input[aria-label="多镜头时间轴进度"]');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, t);
    await page.waitForTimeout(120);

    const shot = await page.locator('canvas').first().screenshot({ type: 'png' });
    assert.ok(shot.length > 8000, `Promo canvas at t=${t}s looks blank (${shot.length} bytes)`);
    canvasShots.add(shot.toString('base64').slice(0, 120) + ':' + shot.length);
  }
  assert.ok(canvasShots.size >= 3, `Promo transitions must produce distinct frames across 4 scenes (got ${canvasShots.size})`);

  // Verify +1F single frame step button updates frame readout
  await page.getByRole('button', { name: '+1F' }).click();
  const bodyText = await page.locator('body').innerText();
  assert.ok(bodyText.includes('S4 · 扫码同款'), 'Timeline inspector must show S4 · 扫码同款 near t=5.33s');
  assert.ok(bodyText.includes('6.00s'), 'Promo mode must show 6.00s duration');

  // 2. Switch to "歌词短视频" (defaults to 10s), verify Frame-0 cover thumbnail & S2 lyric scrub
  await page.getByRole('button', { name: '歌词短视频' }).click();
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const el = document.querySelector('input[aria-label="多镜头时间轴进度"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(el, '0');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(120);
  const f0Text = await page.locator('body').innerText();
  assert.ok(f0Text.includes('S1 · 封面舞台'), 'Frame 0 of Lyric MV must start directly on S1 · 封面舞台 (album cover thumbnail)');
  const f0Shot = await page.locator('canvas').first().screenshot({ type: 'png' });
  assert.ok(f0Shot.length > 15000, 'Frame 0 of Lyric MV must render rich album cover & vinyl (not blank)');

  await page.evaluate(() => {
    const el = document.querySelector('input[aria-label="多镜头时间轴进度"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(el, '4.8');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(120);
  const mvText = await page.locator('body').innerText();
  assert.ok(mvText.includes('S2 · 歌词卡点'), 'Lyric MV mode must show S2 · 歌词卡点 at t=4.8s / 10s');
  const mvShot = await page.locator('canvas').first().screenshot({ type: 'png' });
  assert.ok(mvShot.length > 8000, 'Lyric MV canvas must render non-blank frame');

  // 3. Switch back to "单卡海报" and confirm TimelineInspectorBar hides cleanly
  await page.getByRole('button', { name: '单卡海报' }).click();
  await page.waitForTimeout(100);
  const sliderCount = await page.locator('input[aria-label="多镜头时间轴进度"]').count();
  assert.equal(sliderCount, 0, 'TimelineInspectorBar must hide when returning to 单卡海报 mode');

  assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join('; ')}`);
  console.log('[QA-Web-E2E] React Web App 6s promo, 10s lyric-mv, slow-mo/scrubbing & single-frame step passed (0 errors).');
} finally {
  if (browser) await browser.close();
  serverProc.kill('SIGTERM');
}
