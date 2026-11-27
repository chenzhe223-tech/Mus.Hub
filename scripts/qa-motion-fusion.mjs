import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = path.resolve(import.meta.dirname, '..');

// 0. Functional unit tests on deterministicMotion.ts
const dm = await import('../src/utils/deterministicMotion.ts');
const rng1 = dm.mulberry32(0x12345678);
const rng2 = dm.mulberry32(0x12345678);
const seq1 = Array.from({ length: 10 }, () => rng1());
const seq2 = Array.from({ length: 10 }, () => rng2());
assert.deepEqual(seq1, seq2, 'mulberry32 must produce identical deterministic sequences');

const barsA = dm.computeSyntheticBars(32, 2.5, true, true);
const barsB = dm.computeSyntheticBars(32, 2.5, true, true);
assert.deepEqual(barsA, barsB, 'computeSyntheticBars must be deterministic for identical tSec');
assert.equal(barsA.length, 32);
assert.ok(barsA.every((v) => v >= 0.08 && v <= 1), 'synthetic bars must stay bounded in [0.08, 1]');

// Real PCM sine-wave test for computeBarsFromPcm
const sr = 44100;
const pcm = new Float32Array(sr * 2);
for (let i = 0; i < pcm.length; i++) {
  pcm[i] = Math.sin((2 * Math.PI * 220 * i) / sr) * 0.6;
}
const pcmBars1 = dm.computeBarsFromPcm(pcm, sr, 0.75, 36);
const pcmBars2 = dm.computeBarsFromPcm(pcm, sr, 0.75, 36);
assert.deepEqual(pcmBars1, pcmBars2, 'computeBarsFromPcm must be deterministic');
assert.equal(pcmBars1.length, 36);
assert.equal(dm.formatSecondsMMSS(65), '01:05');
assert.equal(dm.parseDurationTextToSec('03:42'), 222);
console.log('[QA-Motion] Deterministic motion & PCM spectrum unit tests passed.');

// 0b. Functional unit tests on sceneTimeline.ts (4-scene continuity & coverage)
const st = await import('../src/utils/sceneTimeline.ts');
for (const mode of ['lyric-mv', 'promo']) {
  const dur = mode === 'promo' ? 6 : 10;
  const seenScenes = new Set();
  for (let step = 0; step <= 60; step++) {
    const t = (step / 60) * dur;
    const meta = st.getSceneMetadata(mode, t, dur);
    seenScenes.add(meta.sceneCode);
    assert.ok(Number.isFinite(meta.localProgress), 'localProgress must be finite');
    // Ensure at least one scene has positive opacity at every point t (no blank transitions!)
    const maxAlpha = Math.max(
      ...meta.scenes.map((sc, i) =>
        st.computeSceneAlpha(meta.globalProgress, sc, i === 0, i === meta.scenes.length - 1)
      )
    );
    assert.ok(maxAlpha >= 0.45, `Transition gap detected in ${mode} at t=${t.toFixed(2)}s (maxAlpha=${maxAlpha})`);
  }
  assert.equal(seenScenes.size, 4, `${mode} must traverse all 4 scenes across duration`);
}
const multiSrc = fs.readFileSync(path.join(ROOT, 'src/engine/multiSceneRenderer.ts'), 'utf8');
assert.ok(!multiSrc.includes('Math.random()'), 'multiSceneRenderer must not use unseeded Math.random()');
console.log('[QA-Motion] Multi-scene timeline & non-blank transition continuity tests passed.');

// 0c. Token-aware English/CJK text wrapping test (prevents "ARCHIV" + "E" split bug)
const tw = await import('../src/utils/textWrap.ts');
const fakeCtx = {
  measureText: (txt) => ({ width: txt.length * 10 }),
};
const wrappedBrand = tw.wrapCanvasLines(fakeCtx, '音画 · SONIC ARCHIVE', 140, 2);
assert.ok(
  wrappedBrand.every((line) => !line.endsWith('ARCHIV') && line !== 'E'),
  `wrapCanvasLines must keep English word ARCHIVE intact, got: ${JSON.stringify(wrappedBrand)}`
);
assert.deepEqual(wrappedBrand, ['音画 · SONIC', 'ARCHIVE']);
console.log('[QA-Motion] Token-aware CJK/Latin word wrap unit test passed.');

// 0d. Smart Promo Planner differentiation & custom image preservation test
const pp = await import('../src/utils/promoPlanner.ts');
const baseCfg = {
  mode: 'dynamic',
  template: 'vinyl',
  ratio: '9:16',
  paletteKey: 'auto',
  fontStyle: 'serif',
  lyric: '',
  showLyric: true,
  showWave: true,
  showProgress: true,
  showQr: true,
  filmGrain: true,
};
const nightSong = { id: 't1', title: '午夜蓝调', artist: '陈粒', album: '夜色', duration: '03:40', cover: '', lyric: '雨声落在窗台', bpm: 74 };
const popSong = { id: 't2', title: 'Summer Club', artist: 'Neon', album: 'Dance', duration: '03:10', cover: '', lyric: 'Let us dance', bpm: 124 };
const pNight = pp.generateSmartPromoPlan(nightSong, baseCfg, []);
const pPop = pp.generateSmartPromoPlan(popSong, baseCfg, []);
assert.notEqual(pNight.themeStyle, pPop.themeStyle, 'Smart planner must select distinct themeStyle for ballad vs dance track');
assert.notEqual(pNight.badgeText, pPop.badgeText, 'Smart planner must generate distinct badgeText per song mood');
assert.ok(pNight.s1Headline.includes('午夜蓝调') && pPop.s1Headline.includes('Summer Club'));

const pReview = pp.generateSmartPromoPlan(nightSong, baseCfg, [], 'single-review', ['data:image/png;base64,AAA']);
assert.equal(pReview.direction, 'single-review');
assert.equal(pReview.s2VisualMode, 'custom-images', 'Uploaded custom images must auto-activate custom-images gallery mode');
assert.equal(pReview.customImages.length, 1);

const shareSrc = fs.readFileSync(path.join(ROOT, 'src/utils/share.ts'), 'utf8');
assert.ok(!shareSrc.includes('customImages'), 'share.ts URL hash must NOT serialize base64 customImages');
console.log('[QA-Motion] Smart Promo Planner & share-hash isolation tests passed.');

// 1. Check studio-render is NOT bundled into dist/
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        assert.notEqual(entry.name, 'studio-render', 'studio-render must not be inside dist/');
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        const txt = fs.readFileSync(full, 'utf8');
        assert.ok(!txt.includes('playwright-core'), 'dist bundle must not include playwright-core');
        assert.ok(!txt.includes('__HYPER_CAPTURE__'), 'dist bundle must not include studio-render capture runtime');
      }
    }
  };
  walk(distDir);
  console.log('[QA-Motion] dist/ isolation check passed.');
}

// 2. Verify ShareModal uses dynamic videoExt (fixes hardcoded .webm bug)
const shareModalSrc = fs.readFileSync(path.join(ROOT, 'src/components/ShareModal.tsx'), 'utf8');
assert.ok(shareModalSrc.includes('videoExt'), 'ShareModal must support dynamic videoExt');
assert.ok(shareModalSrc.includes('.${videoExt}'), 'ShareModal download link must use dynamic .${videoExt}');
assert.ok(!shareModalSrc.includes('.webm`'), 'ShareModal must not hardcode .webm download extension');
console.log('[QA-Motion] ShareModal dynamic extension check passed.');

// 3. Verify posterRenderer uses deterministic PRNG (mulberry32) instead of Math.random()
const rendererSrc = fs.readFileSync(path.join(ROOT, 'src/engine/posterRenderer.ts'), 'utf8');
assert.ok(rendererSrc.includes('mulberry32'), 'posterRenderer must use seeded mulberry32 PRNG');
assert.ok(!rendererSrc.includes('Math.random()'), 'posterRenderer must not use unseeded Math.random()');
assert.ok(rendererSrc.includes('DeterministicFrameContext'), 'posterRenderer must accept DeterministicFrameContext');
console.log('[QA-Motion] posterRenderer determinism contract check passed.');

// 4. Verify exporter supports WebCodecs + mp4-muxer & StudioProjectBundle
const exporterSrc = fs.readFileSync(path.join(ROOT, 'src/utils/exporter.ts'), 'utf8');
assert.ok(exporterSrc.includes('mp4-muxer'), 'exporter must integrate mp4-muxer');
assert.ok(exporterSrc.includes('VideoEncoder'), 'exporter must support WebCodecs VideoEncoder');
assert.ok(exporterSrc.includes('exportStudioProjectBundle'), 'exporter must provide exportStudioProjectBundle');
console.log('[QA-Motion] exporter WebCodecs & bundle contract check passed.');

// 5. Verify no CC BY-NC lemo-wake code or external video gen API calls exist
const allSrcFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'out') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(ts|tsx|js|mjs|html)$/.test(entry.name)) allSrcFiles.push(full);
  }
};
collect(path.join(ROOT, 'src'));
collect(path.join(ROOT, 'studio-render'));
for (const file of allSrcFiles) {
  const txt = fs.readFileSync(file, 'utf8');
  assert.ok(!txt.includes('lemo-wake/skills'), `Forbidden CC-BY-NC code reference in ${file}`);
  assert.ok(!txt.includes('DepthAnything'), `Forbidden local vision weight reference in ${file}`);
}
console.log(`[QA-Motion] Compliance & zero-external-model audit passed (${allSrcFiles.length} source files).`);
