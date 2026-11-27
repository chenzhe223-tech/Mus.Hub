import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findBrowserExecutable, resolveFfprobeBin, startStaticServer } from './render-video.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(`QA Assertion Failed: ${msg}`);
}

async function auditBrandSvg() {
  const svgPath = path.join(STUDIO_ROOT, 'assets', 'sonic-logo.svg');
  const raw = fs.readFileSync(svgPath, 'utf8');
  const requiredIds = [
    'mark-vinyl-group',
    'mark-ring-outer',
    'mark-tonearm',
    'mark-wave-bars',
    'wordmark-cn',
    'wordmark-en',
  ];
  for (const id of requiredIds) {
    assert(raw.includes(`id="${id}"`), `Missing semantic SVG layer #${id} in sonic-logo.svg`);
  }
  console.log('[QA] Brand SVG semantic layer audit passed.');
}

async function probeTemplatesMotion() {
  const { server, port } = await startStaticServer(STUDIO_ROOT);
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({ executablePath, headless: true });

  try {
    const probes = [
      { template: 'templates/music-short-mv.html', vars: 'presets/demo-song-project.json' },
      { template: 'templates/product-promo.html', vars: 'presets/promo-launch.json' },
      { template: 'templates/dynamic-poster.html', vars: 'presets/demo-song-project.json' },
    ];

    for (const item of probes) {
      const vars = JSON.parse(fs.readFileSync(path.join(STUDIO_ROOT, item.vars), 'utf8'));
      const context = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.addInitScript((v) => {
        window.__HYPER_CAPTURE__ = true;
        window.__HYPER_VARS__ = v;
      }, vars);

      await page.goto(`http://127.0.0.1:${port}/${item.template}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__hyperReady === true, { timeout: 15000 });

      const meta = await page.evaluate(() => {
        const el = document.querySelector('[data-composition-id]');
        return {
          id: el?.getAttribute('data-composition-id'),
          duration: Number(el?.getAttribute('data-duration')) || 10,
          width: Number(el?.getAttribute('data-width')) || 1080,
          height: Number(el?.getAttribute('data-height')) || 1920,
        };
      });

      await page.setViewportSize({ width: meta.width, height: meta.height });

      // Probe start (0s), mid (50%), and end (duration - 0.05s) for non-blank & motion delta
      const frameHashes = [];
      for (const ratio of [0, 0.45, 0.98]) {
        const t = meta.duration * ratio;
        await page.evaluate((sec) => window.__hyperSeek(sec), t);
        const buf = await page.screenshot({ type: 'png' });
        assert(buf.length > 15000, `${item.template} at t=${t.toFixed(2)}s looks blank (${buf.length} bytes)`);
        frameHashes.push(buf.toString('base64').slice(0, 120) + ':' + buf.length);
      }

      assert(
        new Set(frameHashes).size >= 2,
        `${item.template} showed zero visual motion across timeline checkpoints`
      );
      assert(errors.length === 0, `${item.template} runtime errors: ${errors.join('; ')}`);

      await context.close();
      console.log(`[QA] Motion continuity & non-blank probe passed -> ${item.template} (${meta.id})`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

export function verifyMediaWithFfprobe(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing output media for ffprobe: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  assert(stat.size > 50_000, `Rendered MP4 too small (${stat.size} bytes): ${filePath}`);

  const probe = spawnSync(
    resolveFfprobeBin(),
    ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json', filePath],
    { encoding: 'utf8' }
  );
  if (probe.status !== 0) {
    throw new Error(`ffprobe failed for ${filePath}: ${probe.stderr}`);
  }
  const parsed = JSON.parse(probe.stdout);
  const streams = parsed.streams || [];
  const hasVideo = streams.some((s) => s.codec_type === 'video' && s.codec_name === 'h264');
  const hasAudio = streams.some((s) => s.codec_type === 'audio' && s.codec_name === 'aac');
  assert(hasVideo, `Output missing H.264 video stream: ${filePath}`);
  assert(hasAudio, `Output missing AAC audio stream: ${filePath}`);
  console.log(`[QA] ffprobe verified H.264 + AAC streams (${(stat.size / 1024).toFixed(1)} KB) -> ${path.basename(filePath)}`);
}

await auditBrandSvg();
await probeTemplatesMotion();

// Verify rendered artifacts if already generated
for (const relOut of ['out/demo-mv-9x16.mp4', 'out/product-promo-9x16.mp4']) {
  const full = path.join(STUDIO_ROOT, relOut);
  if (fs.existsSync(full)) {
    verifyMediaWithFfprobe(full);
  }
}
console.log('[QA] Studio Render QA Probe completed.');
