import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderComposition } from './render-video.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && argv[i + 1]) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const manifestPath = path.resolve(STUDIO_ROOT, args.manifest || 'presets/batch-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log(`[BatchRender] Loaded ${manifest.jobs.length} jobs from ${manifestPath}`);

for (const job of manifest.jobs) {
  const tmpVars = path.resolve(STUDIO_ROOT, `out/.job-${job.id}.json`);
  fs.mkdirSync(path.dirname(tmpVars), { recursive: true });
  fs.writeFileSync(tmpVars, JSON.stringify(job.vars, null, 2));
  try {
    await renderComposition({
      templatePath: job.template,
      varsPath: tmpVars,
      outPath: job.out,
      fpsOverride: job.fps,
      durationOverride: job.duration,
      audioPath: job.audio,
      exportGif: Boolean(job.gif),
    });
  } finally {
    fs.rmSync(tmpVars, { force: true });
  }
}

console.log('[BatchRender] All jobs completed.');
