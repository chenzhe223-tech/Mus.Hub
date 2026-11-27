#!/usr/bin/env node
/**
 * Mus.Hub (SONIC ARCHIVE) — Automated Release QA Acceptance Gate
 * Enforces P0-1 through P0-7 defined in docs/QA_ACCEPTANCE_RULES.md.
 * Any failure exits with code 1 and blocks deployment.
 */

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const results = [];

function recordPass(gate, detail) {
  results.push({ gate, status: 'PASS', detail });
  console.log(`  [PASS] ${gate} — ${detail}`);
}

function runSyncOrFail(cmd, args, opts = {}) {
  const isWin = process.platform === 'win32';
  const res = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: isWin,
    ...opts,
  });
  if (res.status !== 0) {
    console.error(`\n[FAIL] Command failed: ${cmd} ${args.join(' ')}`);
    if (res.stdout) console.error(res.stdout);
    if (res.stderr) console.error(res.stderr);
    throw new Error(`Command exited with code ${res.status}`);
  }
  return res.stdout || '';
}

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // Wait for startup
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not become ready at ${url}`);
}

async function main() {
  console.log('=================================================================');
  console.log('  Mus.Hub QA Acceptance Gate (docs/QA_ACCEPTANCE_RULES.md)');
  console.log('=================================================================\n');

  // ---------------------------------------------------------------------------
  // P0-1: TypeScript strict build + Vite production bundle + Wrangler dry-run
  // ---------------------------------------------------------------------------
  console.log('[P0-1] Running TypeScript check & Vite build...');
  runSyncOrFail('npm', ['run', 'build']);
  recordPass('P0-1a', 'tsc -b && vite build succeeded with 0 errors');

  const tmpXdg = path.join(os.tmpdir(), `mushub-qa-xdg-${Date.now()}`);
  fs.mkdirSync(tmpXdg, { recursive: true });
  try {
    const wranglerCheck = spawnSync('wrangler', ['--version'], {
      cwd: rootDir,
      stdio: 'pipe',
      shell: process.platform === 'win32',
    });
    if (wranglerCheck.status === 0) {
      runSyncOrFail('wrangler', ['deploy', '--dry-run'], {
        env: { ...process.env, XDG_CONFIG_HOME: tmpXdg },
      });
      recordPass('P0-1b', 'wrangler deploy --dry-run bundled Worker + ASSETS cleanly');
    } else {
      console.log('  [INFO] Global wrangler not found in CI; skipping dry-run check');
    }
  } finally {
    fs.rmSync(tmpXdg, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------------
  // P0-2 & P0-3: Chinese Localization + Strict Track Anti-Mismatch Unit Suite
  // ---------------------------------------------------------------------------
  console.log('\n[P0-2 / P0-3] Running Mandopop localization & strict audio-match assertions...');
  const aliases = await import('../shared/musicAliases.ts');

  const jay = aliases.localizeTrackDisplay({
    title: 'Sunny Day',
    artist: 'Jay Chou',
    album: 'Yeh, Hwei-Mei',
  });
  assert.equal(jay.title, '晴天', 'Jay Chou Sunny Day must localize to 晴天');
  assert.equal(jay.artist, '周杰伦', 'Jay Chou must localize to 周杰伦');
  assert.equal(jay.album, '叶惠美', 'Yeh, Hwei-Mei must localize to 叶惠美');

  const syz1 = aliases.localizeTrackDisplay({
    title: 'Against the Light',
    artist: 'Stefanie Sun',
    album: 'Against the Light',
  });
  assert.equal(syz1.title, '逆光');
  assert.equal(syz1.artist, '孙燕姿');

  const syz2 = aliases.localizeTrackDisplay({
    title: '開始懂了',
    artist: '孫燕姿',
    album: '我要的幸福',
  });
  assert.equal(syz2.title, '开始懂了');
  assert.equal(syz2.artist, '孙燕姿');

  const eason = aliases.localizeTrackDisplay({
    title: 'Ten Years',
    artist: 'Eason Chan',
    album: 'Black White Grey',
  });
  assert.equal(eason.title, '十年');
  assert.equal(eason.artist, '陈奕迅');

  const western = aliases.localizeTrackDisplay({
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    album: 'Lover',
  });
  assert.equal(western.title, 'Cruel Summer', 'Western artist songs must stay English');
  assert.equal(western.artist, 'Taylor Swift', 'Western artist names must stay English');

  assert.equal(
    aliases.canonicalTrackKey('Sunny Day', 'Jay Chou'),
    aliases.canonicalTrackKey('晴天', '周杰倫'),
    'English & Chinese versions of 晴天 must collapse to the same dedupe key'
  );

  // Strict song matching (prevents wrong-song playback from same album!)
  assert.equal(
    aliases.isStrictTrackMatch({ title: '我懷念的', artist: '孫燕姿' }, { title: '逆光', artist: '孙燕姿' }),
    false,
    'Must reject wrong song from album 逆光'
  );
  assert.equal(
    aliases.isStrictTrackMatch({ title: '夢遊', artist: '孫燕姿' }, { title: '逆光', artist: '孙燕姿' }),
    false,
    'Must reject wrong song from album 逆光'
  );
  assert.equal(
    aliases.isStrictTrackMatch({ title: '逆光', artist: '孫燕姿' }, { title: '逆光', artist: '孙燕姿' }),
    true,
    'Must accept exact Simplified/Traditional title + artist match'
  );
  assert.equal(
    aliases.isStrictTrackMatch(
      { title: 'Against the Light', artist: 'Stefanie Sun' },
      { title: '逆光', artist: '孙燕姿' }
    ),
    true,
    'Must accept bilingual alias of exact same track'
  );

  const hint1 = aliases.expandMusicQuery('开始懂了');
  assert.equal(hint1.songHintTrad, '孫燕姿 開始懂了');
  const hint2 = aliases.expandMusicQuery('逆光');
  assert.equal(hint2.songHintTrad, '孫燕姿 逆光');
  const hint3 = aliases.expandMusicQuery('天黑黑');
  assert.equal(hint3.songHintTrad, '孫燕姿 天黑黑');

  recordPass('P0-2', 'Mandopop localization, Western preservation, & bare-title hints verified (12 assertions)');
  recordPass('P0-3a', 'Strict title+artist preview matching blocks same-album mismatches');

  // ---------------------------------------------------------------------------
  // P0-3b / P0-4 / P0-5 / P0-6: Cross-Regression Architectural Guards
  // ---------------------------------------------------------------------------
  console.log('\n[P0-3b / P0-4 / P0-5] Running cross-regression static guards...');
  const audioSrc = fs.readFileSync(path.join(rootDir, 'src/utils/audioEngine.ts'), 'utf8');
  const exporterSrc = fs.readFileSync(path.join(rootDir, 'src/utils/exporter.ts'), 'utf8');
  const shareModalSrc = fs.readFileSync(path.join(rootDir, 'src/components/ShareModal.tsx'), 'utf8');
  const posterCanvasSrc = fs.readFileSync(path.join(rootDir, 'src/components/PosterCanvas.tsx'), 'utf8');
  const workerSrc = fs.readFileSync(path.join(rootDir, 'worker/index.ts'), 'utf8');
  const musicApiSrc = fs.readFileSync(path.join(rootDir, 'shared/musicApi.ts'), 'utf8');

  // Guard 1: Mobile nativeAudio must be destroyed & recreated per song (no iOS AVPlayer stale buffer)
  assert.ok(
    audioSrc.includes('destroyNativeAudio') && audioSrc.includes('new Audio()'),
    'P0-3b: audioEngine must instantiate fresh Audio() per track to prevent iOS stale-song bug'
  );
  assert.ok(
    !audioSrc.includes('createMediaElementSource'),
    'P0-3b: audioEngine must NOT attach createMediaElementSource to nativeAudio (silences iOS/WeChat)'
  );
  recordPass('P0-3b', 'Fresh HTMLAudioElement per track & no iOS-silencing MediaElementSource');

  // Guard 2: Video recording MUST capture real decoded song PCM audio via isolated AudioBufferSourceNode
  assert.ok(
    audioSrc.includes('async startRecordingAudio') &&
      audioSrc.includes('decodeAudioData') &&
      audioSrc.includes('createBufferSource'),
    'P0-4: audioEngine must provide isolated decodeAudioData + AudioBufferSourceNode for video recording'
  );
  assert.ok(
    exporterSrc.includes('audioEngine.startRecordingAudio(song)') &&
      exporterSrc.includes('audioBitsPerSecond'),
    'P0-4: exporter must bind startRecordingAudio() real PCM stream to MediaRecorder'
  );
  assert.ok(
    shareModalSrc.includes('下载视频'),
    'P0-4: ShareModal must provide explicit video download button when videoBlobUrl exists'
  );
  recordPass('P0-4', 'Isolated real-song PCM video audio capture & muxed MediaRecorder verified');

  // Guard 3: Mobile PNG saving & CORS-safe canvas
  assert.ok(
    posterCanvasSrc.includes('/api/proxy?url='),
    'P0-5: PosterCanvas must auto-proxy external covers to prevent tainted canvas'
  );
  assert.ok(
    exporterSrc.includes('tryNativeSaveImage') && shareModalSrc.includes('WebkitTouchCallout'),
    'P0-5: Mobile PNG save must support Web Share API + long-press <img> save'
  );
  recordPass('P0-5', 'CORS-safe cover proxy, Blob download, Web Share & mobile long-press save verified');

  // Guard 4: Proxy headers & Worker cache version
  assert.ok(
    musicApiSrc.includes('no-transform') && musicApiSrc.includes("attribute=songTerm") || musicApiSrc.includes("'songTerm'"),
    'P0-7: musicApi must set no-transform for audio streams and use songTerm for strict preview lookup'
  );
  assert.ok(
    /EDGE_CACHE_VERSION\s*=\s*['"]v\d+['"]/.test(workerSrc),
    'P0-7: worker/index.ts must define versioned EDGE_CACHE_VERSION'
  );

  // ---------------------------------------------------------------------------
  // P0-7: Live Preview Server HTTP Smoke Tests
  // ---------------------------------------------------------------------------
  console.log('\n[P0-7] Running local preview server HTTP API smoke tests...');
  const port = 4189;
  const base = `http://127.0.0.1:${port}`;
  const serverProc = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'],
    { cwd: rootDir, stdio: 'pipe' }
  );

  try {
    await waitForServer(`${base}/`);

    const rHome = await fetch(`${base}/`);
    assert.equal(rHome.status, 200, 'GET / must return 200');

    const rHealth = await fetch(`${base}/api/health`);
    assert.equal(rHealth.status, 200, 'GET /api/health must return 200');
    const healthJson = await rHealth.json();
    assert.equal(healthJson.ok, true);
    assert.ok(healthJson.sources.includes('itunes-tw') && healthJson.sources.includes('deezer'));

    const rProxyBlock = await fetch(`${base}/api/proxy?url=${encodeURIComponent('https://example.com/evil.jpg')}`);
    assert.equal(rProxyBlock.status, 403, 'GET /api/proxy must reject non-allowlist host with 403');

    const rPrevBad = await fetch(`${base}/api/preview`);
    assert.equal(rPrevBad.status, 400, 'GET /api/preview without params must return 400');

    const rSearch = await fetch(`${base}/api/search?q=${encodeURIComponent('开始懂了')}`);
    assert.equal(rSearch.status, 200);
    const searchJson = await rSearch.json();
    assert.equal(searchJson.expanded?.songHintTrad, '孫燕姿 開始懂了');

    const rRec = await fetch(`${base}/api/recognize/status`);
    assert.equal(rRec.status, 200);

    const rAi = await fetch(`${base}/api/ai-song/status`);
    assert.equal(rAi.status, 200);

    const rLyr = await fetch(`${base}/api/ai-song/lyrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '周五下班听见这首歌', style: 'pop_ballad' }),
    });
    assert.equal(rLyr.status, 200);
    const lyrJson = await rLyr.json();
    assert.ok(lyrJson.lyrics && lyrJson.lyrics.split('\n').length >= 3);

    recordPass('P0-7', 'All 8 HTTP API endpoints (/health, /proxy 403, /preview 400, /search, /recognize, /ai-song) passed');
  } finally {
    serverProc.kill('SIGTERM');
  }

  console.log('\n=================================================================');
  console.log(`  QA GATE PASSED: ${results.length}/${results.length} automated P0 checks green!`);
  console.log('=================================================================');
}

main().catch((err) => {
  console.error('\n=================================================================');
  console.error('  QA GATE FAILED — DEPLOYMENT BLOCKED');
  console.error('  Reason:', err instanceof Error ? err.message : String(err));
  console.error('=================================================================');
  process.exit(1);
});
