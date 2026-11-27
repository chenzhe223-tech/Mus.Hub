import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { generateDeterministicWav } from './synth-audio.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');

export function resolveFfmpegBin() {
  const sysCheck = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (sysCheck.status === 0) return 'ffmpeg';
  try {
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer?.path && fs.existsSync(installer.path)) return installer.path;
  } catch {
    // Fallback
  }
  try {
    const staticPath = require('ffmpeg-static');
    if (staticPath && fs.existsSync(staticPath)) return staticPath;
  } catch {
    // Fallback
  }
  throw new Error('未找到 ffmpeg，请安装系统 ffmpeg 或在 studio-render 中运行 npm install');
}

export function resolveFfprobeBin() {
  const sysCheck = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' });
  if (sysCheck.status === 0) return 'ffprobe';
  try {
    const installer = require('@ffprobe-installer/ffprobe');
    if (installer?.path && fs.existsSync(installer.path)) return installer.path;
  } catch {
    // Fallback
  }
  try {
    const staticProbe = require('ffprobe-static');
    if (staticProbe?.path && fs.existsSync(staticProbe.path)) return staticProbe.path;
  } catch {
    // Fallback
  }
  throw new Error('未找到 ffprobe，请安装系统 ffprobe 或在 studio-render 中运行 npm install');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

export function findBrowserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到本地 Chrome 或 Edge 可执行文件，请设置 PLAYWRIGHT_CHROMIUM_PATH');
}

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

export function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const cleanUrl = (req.url || '/').split('?')[0];
      const relPath = decodeURIComponent(cleanUrl).replace(/^\/+/, '');
      const fullPath = path.resolve(rootDir, relPath || 'index.html');
      if (!fullPath.startsWith(rootDir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.setHeader('Content-Type', MIME_MAP[ext] || 'application/octet-stream');
      fs.createReadStream(fullPath).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function runProcess(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}:\n${stderr}`));
    });
  });
}

export async function renderComposition({
  templatePath,
  varsPath,
  outPath,
  fpsOverride,
  durationOverride,
  audioPath,
  exportGif = false,
}) {
  const absTemplate = path.resolve(STUDIO_ROOT, templatePath);
  const absOut = path.resolve(STUDIO_ROOT, outPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });

  const vars = varsPath ? JSON.parse(fs.readFileSync(path.resolve(STUDIO_ROOT, varsPath), 'utf8')) : {};
  const { server, port } = await startStaticServer(STUDIO_ROOT);
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });

  const tmpDir = fs.mkdtempSync(path.join(path.dirname(absOut), '.render-tmp-'));
  const rawVideoPath = path.join(tmpDir, 'video-only.mp4');
  const synthWavPath = path.join(tmpDir, 'audio-track.wav');

  try {
    const relTemplateUrl = path.relative(STUDIO_ROOT, absTemplate).replace(/\\/g, '/');
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.addInitScript((injectedVars) => {
      window.__HYPER_CAPTURE__ = true;
      window.__HYPER_VARS__ = injectedVars;
    }, vars);

    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(`http://127.0.0.1:${port}/${relTemplateUrl}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__hyperReady === true, { timeout: 15000 });

    const meta = await page.evaluate(() => {
      const el = document.querySelector('[data-composition-id]');
      return {
        id: el?.getAttribute('data-composition-id') || 'main',
        width: Number(el?.getAttribute('data-width')) || 1080,
        height: Number(el?.getAttribute('data-height')) || 1920,
        duration: Number(el?.getAttribute('data-duration')) || 10,
        fps: Number(el?.getAttribute('data-fps')) || 30,
      };
    });

    const width = meta.width & ~1;
    const height = meta.height & ~1;
    const fps = fpsOverride ? Number(fpsOverride) : meta.fps;
    const duration = durationOverride ? Number(durationOverride) : Number(vars.durationSec || meta.duration);

    await page.setViewportSize({ width, height });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    const totalFrames = Math.max(1, Math.round(duration * fps));
    console.log(
      `[HyperFrames] Rendering "${meta.id}" (${width}x${height} @ ${fps}fps, ${duration}s = ${totalFrames} frames)...`
    );

    // Pipe PNG frames directly into FFmpeg (avoids writing hundreds of temp images)
    const ffmpegArgs = [
      '-y',
      '-f',
      'image2pipe',
      '-vcodec',
      'png',
      '-r',
      String(fps),
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      rawVideoPath,
    ];

    const ffmpegBin = resolveFfmpegBin();
    const ffmpegProc = spawn(ffmpegBin, ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffmpegErr = '';
    ffmpegProc.stderr.on('data', (d) => (ffmpegErr += d.toString()));

    const ffmpegDone = new Promise((resolve, reject) => {
      ffmpegProc.on('error', reject);
      ffmpegProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg video encode failed (${code}): ${ffmpegErr}`));
      });
    });

    for (let f = 0; f < totalFrames; f++) {
      const tSec = f / fps;
      await page.evaluate(
        (t) =>
          new Promise((resolve) => {
            window.__hyperSeek(t);
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          }),
        tSec
      );
      const pngBuf = await page.screenshot({ type: 'png' });
      const canWrite = ffmpegProc.stdin.write(pngBuf);
      if (!canWrite) {
        await new Promise((r) => ffmpegProc.stdin.once('drain', r));
      }
      if (f % Math.max(1, Math.floor(totalFrames / 10)) === 0 || f === totalFrames - 1) {
        const pct = Math.round(((f + 1) / totalFrames) * 100);
        process.stdout.write(`\r[HyperFrames] Progress: ${pct}% (${f + 1}/${totalFrames})`);
      }
    }
    process.stdout.write('\n');
    ffmpegProc.stdin.end();
    await ffmpegDone;

    if (consoleErrors.length > 0) {
      throw new Error(`Page errors during render:\n${consoleErrors.join('\n')}`);
    }

    // Prepare Audio Track + Lemo-Opuscar -14 LUFS Mastering
    let resolvedAudio = audioPath ? path.resolve(STUDIO_ROOT, audioPath) : null;
    if (!resolvedAudio && vars.audioPath) {
      const cand = path.resolve(STUDIO_ROOT, vars.audioPath);
      if (fs.existsSync(cand)) resolvedAudio = cand;
    }
    if (!resolvedAudio) {
      generateDeterministicWav({
        outPath: synthWavPath,
        durationSec: duration,
        chordFreqs: vars.song?.chordFreqs || [220, 261.63, 329.63, 392.0, 493.88],
        bpm: vars.song?.bpm || 88,
      });
      resolvedAudio = synthWavPath;
    }

    if (exportGif || absOut.toLowerCase().endsWith('.gif')) {
      const gifTarget = absOut.toLowerCase().endsWith('.gif')
        ? absOut
        : absOut.replace(/\.mp4$/i, '.gif');
      await runProcess(ffmpegBin, [
        '-y',
        '-i',
        rawVideoPath,
        '-vf',
        `fps=18,scale=${Math.min(720, width)}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=bayer`,
        '-loop',
        '0',
        gifTarget,
      ]);
      console.log(`[HyperFrames] GIF exported -> ${gifTarget}`);
    }

    if (!absOut.toLowerCase().endsWith('.gif')) {
      const fadeOutStart = Math.max(0, duration - 0.8);
      await runProcess(ffmpegBin, [
        '-y',
        '-i',
        rawVideoPath,
        '-stream_loop',
        '-1',
        '-i',
        resolvedAudio,
        '-t',
        String(duration),
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-af',
        `afade=t=in:st=0:d=0.35,afade=t=out:st=${fadeOutStart}:d=0.75,loudnorm=I=-14:TP=-1.5:LRA=11`,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '44100',
        '-shortest',
        '-movflags',
        '+faststart',
        absOut,
      ]);
      console.log(`[Lemo-Mux] Mastered MP4 (-14 LUFS) exported -> ${absOut}`);
    }

    return { outPath: absOut, width, height, fps, duration, totalFrames };
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// CLI entry point
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.template || !args.out) {
    console.error(
      'Usage: node core/render-video.mjs --template templates/music-short-mv.html --vars presets/demo-song-project.json --out out/demo.mp4 [--fps 30] [--duration 12] [--audio path/to/song.mp3] [--gif]'
    );
    process.exit(1);
  }
  renderComposition({
    templatePath: args.template,
    varsPath: args.vars,
    outPath: args.out,
    fpsOverride: args.fps,
    durationOverride: args.duration,
    audioPath: args.audio,
    exportGif: Boolean(args.gif),
  }).catch((err) => {
    console.error('[render-video] Failed:', err);
    process.exit(1);
  });
}
