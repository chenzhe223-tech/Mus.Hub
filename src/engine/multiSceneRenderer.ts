import type { Palette, PosterConfig, ProductionMode, PromoPlan, PromoThemeStyle, Song } from '../types';
import { FONT_STYLES, RATIOS } from '../data/curated';
import { withAlpha } from '../utils/color';
import { drawScannableQr } from '../utils/qr';
import { audioEngine } from '../utils/audioEngine';
import { formatSecondsMMSS, mulberry32 } from '../utils/deterministicMotion';
import { fitSingleLineFont, wrapCanvasLines } from '../utils/textWrap';
import { generateSmartPromoPlan } from '../utils/promoPlanner';
import {
  clamp01,
  computeSceneAlpha,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  getSceneSpecs,
  type SceneWindowSpec,
} from '../utils/sceneTimeline';

export interface MultiSceneRenderParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  mode: Exclude<ProductionMode, 'poster'>;
  song: Song;
  config: PosterConfig;
  palette: Palette;
  coverImage: HTMLImageElement | null;
  customImages?: HTMLImageElement[];
  promoPlan?: PromoPlan;
  lyricsLines?: string[];
  shareUrl: string;
  tSec: number;
  durationSec: number;
  bars?: number[];
  isPlaying?: boolean;
}

let cachedSceneGrain: CanvasPattern | null = null;

function getDeterministicGrain(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (cachedSceneGrain) return cachedSceneGrain;
  try {
    const g = document.createElement('canvas');
    g.width = 160;
    g.height = 160;
    const gctx = g.getContext('2d');
    if (!gctx) return null;
    const img = gctx.createImageData(160, 160);
    const d = img.data;
    const rand = mulberry32(0x534f4e49);
    for (let i = 0; i < d.length; i += 4) {
      const v = rand() > 0.5 ? 255 : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = Math.floor(rand() * 14);
    }
    gctx.putImageData(img, 0, 0);
    cachedSceneGrain = ctx.createPattern(g, 'repeat');
    return cachedSceneGrain;
  } catch {
    return null;
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  return wrapCanvasLines(ctx, text, maxWidth, maxLines);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  coverImage: HTMLImageElement | null,
  pal: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  zoom = 1,
  panX = 0
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();
  if (coverImage && coverImage.naturalWidth > 0) {
    const iw = coverImage.naturalWidth;
    const ih = coverImage.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(coverImage, x + (w - dw) / 2 + panX, y + (h - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, pal.bg2);
    g.addColorStop(0.6, pal.accent);
    g.addColorStop(1, pal.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  tSec: number,
  pal: Palette,
  themeStyle: PromoThemeStyle = 'darkroom'
) {
  const bg = ctx.createLinearGradient(0, 0, W * 0.25, H);
  bg.addColorStop(0, pal.bg1);
  bg.addColorStop(1, pal.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  const ox = W * (0.3 + Math.sin(tSec * 0.45) * 0.1);
  const oy = H * (0.28 + Math.cos(tSec * 0.36) * 0.08);
  const r1 = ctx.createRadialGradient(ox, oy, 16, ox, oy, Math.max(W, H) * 0.58);
  r1.addColorStop(0, withAlpha(pal.accent, pal.light ? 0.16 : 0.24));
  r1.addColorStop(1, withAlpha(pal.accent, 0));
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, W, H);

  const ox2 = W * (0.75 + Math.cos(tSec * 0.38) * 0.08);
  const oy2 = H * (0.74 + Math.sin(tSec * 0.32) * 0.08);
  const c2 = pal.accent2 || '#d96236';
  const r2 = ctx.createRadialGradient(ox2, oy2, 16, ox2, oy2, Math.max(W, H) * 0.5);
  r2.addColorStop(0, withAlpha(c2, pal.light ? 0.1 : 0.18));
  r2.addColorStop(1, withAlpha(c2, 0));
  ctx.fillStyle = r2;
  ctx.fillRect(0, 0, W, H);

  // Distinct visual styling per PromoThemeStyle
  if (themeStyle === 'warm-film') {
    const leak = ctx.createLinearGradient(0, 0, W * 0.75, H * 0.45);
    leak.addColorStop(0, 'rgba(251, 146, 60, 0.2)');
    leak.addColorStop(0.5, 'rgba(245, 158, 11, 0.06)');
    leak.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, W, H);
  } else if (themeStyle === 'editorial') {
    ctx.strokeStyle = pal.light ? 'rgba(28, 22, 18, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let gx = W * 0.25; gx < W; gx += W * 0.25) {
      ctx.beginPath();
      ctx.moveTo(gx, 26);
      ctx.lineTo(gx, H - 26);
      ctx.stroke();
    }
    for (let gy = H * 0.25; gy < H; gy += H * 0.25) {
      ctx.beginPath();
      ctx.moveTo(26, gy);
      ctx.lineTo(W - 26, gy);
      ctx.stroke();
    }
  } else if (themeStyle === 'neon') {
    for (let ring = 1; ring <= 3; ring++) {
      const pulse = Math.sin(tSec * 1.8 - ring * 0.8) * 14;
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.44, Math.min(W, H) * (0.22 + ring * 0.12) + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = withAlpha(pal.accent, 0.18 - ring * 0.04);
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // Subtle architectural gallery border
  ctx.strokeStyle = pal.light ? 'rgba(28, 22, 18, 0.12)' : 'rgba(242, 237, 228, 0.11)';
  ctx.lineWidth = 1.4;
  drawRoundedRect(ctx, 26, 26, W - 52, H - 52, 16);
  ctx.stroke();

  // Floating bokeh particles
  for (let p = 0; p < 14; p++) {
    const px = (p * 103.7 + tSec * (14 + (p % 4) * 5)) % W;
    const py = (((p * 157.3 - tSec * (11 + (p % 3) * 4)) % H) + H) % H;
    ctx.beginPath();
    ctx.arc(px, py, 2 + (p % 3) * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = pal.light ? 'rgba(120, 60, 40, 0.14)' : 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Scene 1 (Shared Brand SVG-Style Intro):
 * Vector disc draw-on + tonearm anticipation + wave bars + wordmark reveal.
 */
function drawBrandIntroScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  alpha: number,
  pal: Palette,
  titleFont: string,
  bodyFont: string,
  headline: string,
  subline: string
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const isCompact = H <= 1040;
  const cx = W / 2;
  const cy = H * (isCompact ? 0.38 : 0.41);
  const discR = Math.min(W, H) * (isCompact ? 0.13 : 0.14);

  // Outer draw-on ring (already 75% visible at Frame 0 so exported video thumbnail is never blank)
  const ringP = 0.75 + 0.25 * easeOutCubic(localP / 0.45);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, discR + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringP);
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Inner vinyl platter (starts at 0.88 scale at t=0, settles smoothly to 1.0)
  const discScale = 0.88 + 0.12 * easeOutBack(localP / 0.45, 1.15);
  ctx.scale(discScale, discScale);
  ctx.beginPath();
  ctx.arc(0, 0, discR, 0, Math.PI * 2);
  ctx.fillStyle = '#121620';
  ctx.fill();

  for (const ratio of [0.78, 0.58]) {
    ctx.beginPath();
    ctx.arc(0, 0, discR * ratio, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242,237,228,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, discR * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = pal.accent;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, discR * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = '#0f1218';
  ctx.fill();

  // Tonearm tracking animation
  const armP = 0.55 + 0.45 * easeOutBack(localP / 0.5, 1.2);
  ctx.save();
  ctx.translate(discR * 0.85, -discR * 0.85);
  ctx.rotate(-0.32 + 0.32 * armP);
  ctx.strokeStyle = pal.text;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-discR * 0.16, discR * 0.72);
  ctx.lineTo(-discR * 0.32, discR * 0.92);
  ctx.stroke();
  ctx.fillStyle = pal.accent2 || '#d96236';
  drawRoundedRect(ctx, -discR * 0.39, discR * 0.88, 12, 18, 3);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // Animated 5-bar waveform under disc (visible from Frame 0)
  const waveY = cy + discR + 42;
  const barW = 7;
  const gap = 8;
  const barHeights = [20, 36, 48, 32, 18];
  for (let i = 0; i < 5; i++) {
    const bp = 0.55 + 0.45 * easeOutCubic((localP - i * 0.05) / 0.32);
    const bh = Math.max(8, barHeights[i] * bp);
    const bx = cx - (5 * barW + 4 * gap) / 2 + i * (barW + gap);
    ctx.fillStyle = i === 2 ? pal.text : i % 2 === 0 ? pal.accent : pal.accent2 || '#d96236';
    drawRoundedRect(ctx, bx, waveY + (48 - bh) / 2, barW, bh, barW / 2);
    ctx.fill();
  }

  // Wordmark & Headline (already legible on Frame 0 so video cover thumbnail looks complete)
  const u = Math.min(1, W / 860);
  const textP = 0.86 + 0.14 * easeOutCubic(localP / 0.4);
  const textY = waveY + Math.round(92 * u) + (1 - easeOutCubic(localP / 0.4)) * 12;
  const maxTextW = W - 112;
  ctx.save();
  ctx.globalAlpha = alpha * textP;
  ctx.textAlign = 'center';
  ctx.fillStyle = pal.text;

  const targetMaxPx = Math.round((isCompact ? 42 : 48) * u);
  ctx.font = `700 ${targetMaxPx}px ${titleFont}`;
  let hLines: string[];
  let lineStep = Math.round(targetMaxPx * 1.28);
  if (ctx.measureText(headline).width <= maxTextW) {
    hLines = [headline];
  } else if (headline.includes('·')) {
    // Keep brand & English wordmark cleanly stacked when narrow instead of splitting a word
    const parts = headline.split('·').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 2) {
      const fittedPx = fitSingleLineFont(ctx, parts[1], maxTextW, targetMaxPx, 24, 700, titleFont);
      ctx.font = `700 ${fittedPx}px ${titleFont}`;
      lineStep = Math.round(fittedPx * 1.28);
      hLines = parts;
    } else {
      hLines = wrapLines(ctx, headline, maxTextW, 2);
    }
  } else {
    hLines = wrapLines(ctx, headline, maxTextW, 2);
  }

  hLines.forEach((line, idx) => {
    ctx.fillText(line, cx, textY + idx * lineStep);
  });

  const subY = textY + (hLines.length - 1) * lineStep + Math.round(46 * u);
  const subSize = fitSingleLineFont(
    ctx,
    subline,
    maxTextW,
    Math.round((isCompact ? 18 : 22) * u),
    14,
    600,
    bodyFont
  );
  ctx.fillStyle = pal.accent;
  ctx.font = `600 ${subSize}px ${bodyFont}`;
  ctx.fillText(subline, cx, subY);
  ctx.restore();

  ctx.restore();
}

/**
 * Lyric MV Scene 1 (Hero Cover Plinth):
 * Spinning Vinyl + 2.5D Cover + Live Waveform (already rich & visible on Frame 0 so OS/WeChat thumbnails show the album cover!)
 */
function drawMvHeroScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  tSec: number,
  alpha: number,
  song: Song,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  bars: number[],
  titleFont: string,
  bodyFont: string
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const isCompact = H <= 1040;
  const padX = W * 0.075;
  const innerW = W - padX * 2;
  const enter = 0.85 + 0.15 * easeOutCubic(localP / 0.35);

  const sleeveSize = Math.min(innerW * 0.62, H * (isCompact ? 0.42 : 0.34));
  const groupW = sleeveSize * 1.42;
  const sleeveX = (W - groupW) / 2;
  const sleeveY = H * (isCompact ? 0.16 : 0.19) + (1 - enter) * 18;

  // Spinning Vinyl Disc (already peeking out on Frame 0 and gliding further)
  const discR = sleeveSize * 0.47;
  const discCx = sleeveX + sleeveSize * (0.86 + 0.1 * easeOutCubic(localP / 0.42));
  const discCy = sleeveY + sleeveSize * 0.5;
  ctx.save();
  ctx.translate(discCx, discCy);
  ctx.rotate(tSec * 1.45);
  ctx.beginPath();
  ctx.arc(0, 0, discR, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0c10';
  ctx.fill();
  for (let r = discR * 0.44; r < discR * 0.94; r += 8) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  const labelR = discR * 0.36;
  drawCover(ctx, coverImage, pal, -labelR, -labelR, labelR * 2, labelR * 2, labelR);
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#11131a';
  ctx.fill();
  ctx.restore();

  // 2.5D Sleeve + Light Sweep
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  drawCover(
    ctx,
    coverImage,
    pal,
    sleeveX,
    sleeveY,
    sleeveSize,
    sleeveSize,
    22,
    1.03 + Math.sin(tSec * 0.7) * 0.02,
    Math.sin(tSec * 0.45) * 5
  );
  ctx.restore();

  // Specular sweep
  const sweepCycle = (localP * 1.4) % 1;
  const sx = sleeveX + sleeveSize * (-0.4 + sweepCycle * 1.8);
  ctx.save();
  drawRoundedRect(ctx, sleeveX, sleeveY, sleeveSize, sleeveSize, 22);
  ctx.clip();
  const sheen = ctx.createLinearGradient(sx - 90, sleeveY, sx + 90, sleeveY + sleeveSize);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.2)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(sleeveX, sleeveY, sleeveSize, sleeveSize);
  ctx.restore();

  // Track Meta & Live Waveform
  const metaY = sleeveY + sleeveSize + (isCompact ? 56 : 74);
  ctx.fillStyle = pal.accent;
  ctx.font = '600 18px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('33⅓ RPM · MOTION EDITION', padX, metaY);

  ctx.fillStyle = pal.text;
  ctx.font = `700 ${isCompact ? 42 : 52}px ${titleFont}`;
  const tLines = wrapLines(ctx, song.title || '未命名曲目', innerW, 2);
  tLines.forEach((line, i) => {
    ctx.fillText(line, padX, metaY + 56 + i * (isCompact ? 50 : 62));
  });

  const artistY = metaY + 56 + tLines.length * (isCompact ? 50 : 62) + 8;
  ctx.fillStyle = pal.muted;
  ctx.font = `500 ${isCompact ? 22 : 26}px ${bodyFont}`;
  ctx.fillText(`${song.artist || '未知歌手'} · ${song.album || '单曲'}`.slice(0, 34), padX, artistY);

  const waveY = Math.min(H - 130, artistY + 46);
  const waveH = isCompact ? 56 : 76;
  const count = Math.min(bars.length, 36);
  const gap = 6;
  const bw = Math.max(4, (innerW - (count - 1) * gap) / count);
  for (let i = 0; i < count; i++) {
    const bh = Math.max(8, bars[i] * waveH);
    const bx = padX + i * (bw + gap);
    const by = waveY + (waveH - bh) / 2;
    ctx.fillStyle = i < count * 0.55 ? pal.accent : withAlpha(pal.text, 0.25);
    drawRoundedRect(ctx, bx, by, bw, bh, bw / 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Lyric MV Scene 3: Kinetic Typography Lyric Spotlight
 */
function drawMvLyricsScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  alpha: number,
  song: Song,
  config: PosterConfig,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  lyricsLines: string[] | undefined,
  titleFont: string
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const padX = W * 0.085;
  const innerW = W - padX * 2;
  const isCompact = H <= 1040;

  // Soft dimmed cover card watermark behind lyrics
  const bgSize = Math.min(W, H) * 0.62;
  ctx.save();
  ctx.globalAlpha = alpha * 0.16;
  drawCover(ctx, coverImage, pal, (W - bgSize) / 2, (H - bgSize) / 2, bgSize, bgSize, 32, 1.06);
  ctx.restore();

  const quote = config.lyric?.trim() || song.lyric?.trim() || `正在循环《${song.title}》`;
  const lines =
    lyricsLines && lyricsLines.length >= 2
      ? lyricsLines.slice(0, 3)
      : [quote, `${song.title} — ${song.artist}`, '把喜欢的旋律留给今晚。'];

  const startY = H * (isCompact ? 0.28 : 0.31);
  ctx.fillStyle = pal.accent;
  ctx.font = '600 19px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LYRIC SPOTLIGHT · 歌词金句', padX, startY - 46);

  const stepSpan = 0.26;
  let cursorY = startY;
  const lineFontSize = isCompact ? 34 : 42;
  const lineH = Math.round(lineFontSize * 1.48);

  lines.forEach((rawLine, idx) => {
    const enterP = easeOutCubic((localP - idx * stepSpan) / 0.26);
    const isActive = localP >= idx * stepSpan && (idx === lines.length - 1 || localP < (idx + 1) * stepSpan + 0.1);
    const yOff = (1 - enterP) * 26;

    ctx.save();
    ctx.globalAlpha = alpha * (0.18 + 0.82 * enterP) * (isActive ? 1 : 0.58);
    ctx.font = `700 ${lineFontSize}px ${titleFont}`;
    const wrapped = wrapLines(ctx, rawLine, innerW - 36, 2);

    if (isActive && enterP > 0.2) {
      ctx.fillStyle = pal.accent;
      drawRoundedRect(ctx, padX, cursorY + yOff - lineFontSize * 0.72, 5, wrapped.length * lineH - 8, 3);
      ctx.fill();
    }

    ctx.fillStyle = isActive ? pal.text : pal.muted;
    wrapped.forEach((wLine, wi) => {
      ctx.fillText(wLine, padX + 24, cursorY + yOff + wi * lineH);
    });
    cursorY += wrapped.length * lineH + (isCompact ? 34 : 48);
    ctx.restore();
  });

  ctx.restore();
}

/**
 * Promo Scene 1: Personalized Brand + Selected Song Cover Hero
 * Driven by PromoPlan (either smart-matched or user-customized).
 */
function drawPromoSongIntroScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  tSec: number,
  alpha: number,
  song: Song,
  plan: PromoPlan,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  bars: number[],
  titleFont: string,
  bodyFont: string
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const isCompact = H <= 1040;
  const u = Math.min(1, W / 860);
  const cx = W / 2;
  const padX = W * 0.08;
  const innerW = W - padX * 2;

  // Brand Top Pill
  const badge = plan.badgeText || '音画 · SONIC ARCHIVE · 专属宣发';
  const bPx = fitSingleLineFont(ctx, badge, innerW * 0.8, Math.round(16 * u), 12, 600, '"SFMono-Regular", Consolas, monospace');
  const pillW = Math.min(innerW * 0.88, Math.max(Math.round(280 * u), ctx.measureText(badge).width + Math.round(52 * u)));
  const pillH = Math.round(40 * u);
  const pillY = H * (isCompact ? 0.11 : 0.12);
  drawRoundedRect(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = withAlpha(pal.accent, 0.16);
  ctx.fill();
  ctx.strokeStyle = withAlpha(pal.accent, 0.45);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = pal.accent;
  ctx.font = `600 ${bPx}px "SFMono-Regular", Consolas, monospace`;
  ctx.fillText(badge, cx, pillY + Math.round(25 * u));

  // Selected Song Cover + Spinning Vinyl behind
  const enter = 0.9 + 0.1 * easeOutCubic(localP / 0.35);
  const covSize = Math.min(innerW * 0.56, H * (isCompact ? 0.34 : 0.28));
  const groupW = covSize * 1.38;
  const covX = (W - groupW) / 2;
  const covY = pillY + pillH + Math.round((isCompact ? 34 : 52) * u) + (1 - enter) * 18;

  const discR = covSize * 0.46;
  const discCx = covX + covSize * (0.88 + 0.08 * easeOutCubic(localP / 0.5));
  const discCy = covY + covSize * 0.5;
  ctx.save();
  ctx.translate(discCx, discCy);
  ctx.rotate(tSec * 1.35);
  ctx.beginPath();
  ctx.arc(0, 0, discR, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0c10';
  ctx.fill();
  for (let r = discR * 0.46; r < discR * 0.94; r += 7) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const lblR = discR * 0.34;
  drawCover(ctx, coverImage, pal, -lblR, -lblR, lblR * 2, lblR * 2, lblR);
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#11131a';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.52)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  drawCover(ctx, coverImage, pal, covX, covY, covSize, covSize, 20, 1.03 + Math.sin(tSec * 0.6) * 0.015);
  ctx.restore();

  // Headline tied to PromoPlan
  const textTop = covY + covSize + Math.round((isCompact ? 46 : 64) * u);
  ctx.fillStyle = pal.text;
  const titleText = plan.s1Headline || `《${song.title || '未命名曲目'}》`;
  const tPx = fitSingleLineFont(ctx, titleText, innerW, Math.round((isCompact ? 40 : 48) * u), 22, 700, titleFont);
  ctx.font = `700 ${tPx}px ${titleFont}`;
  ctx.fillText(titleText, cx, textTop);

  ctx.fillStyle = pal.accent;
  const artistText = plan.s1Subline || `${song.artist || '未知歌手'} · ${song.album || '单曲'}`;
  const aPx = fitSingleLineFont(ctx, artistText, innerW, Math.round((isCompact ? 20 : 23) * u), 14, 600, bodyFont);
  ctx.font = `600 ${aPx}px ${bodyFont}`;
  ctx.fillText(artistText, cx, textTop + Math.round(42 * u));

  ctx.fillStyle = pal.muted;
  const slogan = plan.s1Slogan || '把这首歌，制成可流动的实体唱片画报';
  const sPx = fitSingleLineFont(ctx, slogan, innerW, Math.round((isCompact ? 18 : 21) * u), 13, 500, bodyFont);
  ctx.font = `500 ${sPx}px ${bodyFont}`;
  ctx.fillText(slogan, cx, textTop + Math.round(80 * u));

  // Subtle reactive spectrum bar under slogan
  const waveY = Math.min(H - 120, textTop + Math.round(110 * u));
  const waveH = Math.round(44 * u);
  const count = Math.min(28, bars.length);
  const gap = 6;
  const bw = Math.max(4, Math.min(12, (innerW * 0.72 - (count - 1) * gap) / count));
  const totalWaveW = count * bw + (count - 1) * gap;
  const waveX = cx - totalWaveW / 2;
  for (let i = 0; i < count; i++) {
    const bh = Math.max(6, bars[i] * waveH);
    ctx.fillStyle = i < count * 0.52 ? pal.accent : withAlpha(pal.text, 0.24);
    drawRoundedRect(ctx, waveX + i * (bw + gap), waveY + (waveH - bh) / 2, bw, bh, bw / 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Promo Scene 2: Renders EITHER user-uploaded custom promo gallery (1~3 images in 2.5D motion)
 * OR 6 live miniature template showcase cards.
 */
function drawPromoTemplatesScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  tSec: number,
  alpha: number,
  song: Song,
  config: PosterConfig,
  plan: PromoPlan,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  customImages: HTMLImageElement[],
  titleFont: string,
  bodyFont: string
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const isCompact = H <= 1040;
  const u = Math.min(1, W / 860);
  const padX = W * 0.075;
  const innerW = W - padX * 2;

  const hasCustomGallery = plan.s2VisualMode === 'custom-images' && customImages.length > 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = pal.accent;
  ctx.font = `600 ${Math.round(17 * u)}px "SFMono-Regular", Consolas, monospace`;
  ctx.fillText(hasCustomGallery ? '01 / BESPOKE GALLERY' : '01 / SIX EDITORIAL TEMPLATES', W / 2, H * 0.13);

  const subHeading = plan.s2Heading || `《${song.title}》 · 6 套版式自由切换`;
  const hPx = fitSingleLineFont(ctx, subHeading, innerW, Math.round((isCompact ? 36 : 42) * u), 20, 700, titleFont);
  ctx.fillStyle = pal.text;
  ctx.font = `700 ${hPx}px ${titleFont}`;
  ctx.fillText(subHeading, W / 2, H * 0.13 + Math.round(52 * u));

  if (hasCustomGallery) {
    const imgs = customImages.slice(0, 3);
    const areaTop = H * 0.24;
    const areaH = H * 0.62;

    if (imgs.length === 1) {
      const cardW = Math.min(innerW * 0.9, areaH * 0.82);
      const cardH = Math.min(areaH * 0.92, cardW * 1.15);
      const enter = easeOutBack(localP / 0.4, 1.15);
      ctx.save();
      ctx.translate(W / 2, areaTop + areaH / 2);
      ctx.rotate(Math.sin(tSec * 0.8) * 0.02);
      ctx.scale(0.9 + 0.1 * clamp01(enter), 0.9 + 0.1 * clamp01(enter));
      ctx.shadowColor = 'rgba(0,0,0,0.52)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      drawCover(ctx, imgs[0], pal, -cardW / 2, -cardH / 2, cardW, cardH, 24, 1.03 + Math.sin(tSec * 0.55) * 0.02);
      ctx.restore();
    } else if (imgs.length === 2) {
      const gap = Math.round(22 * u);
      const cardW = (innerW - gap) / 2;
      const cardH = Math.min(areaH * 0.78, cardW * 1.35);
      imgs.forEach((img, idx) => {
        const enter = easeOutBack((localP - idx * 0.12) / 0.36, 1.2);
        const yOff = (idx === 0 ? -18 : 18) + Math.sin(tSec * 0.9 + idx * 1.5) * 8;
        const cx = padX + idx * (cardW + gap) + cardW / 2;
        const cy = areaTop + areaH / 2 + yOff;
        ctx.save();
        ctx.globalAlpha = alpha * clamp01(enter);
        ctx.translate(cx, cy);
        ctx.scale(0.88 + 0.12 * clamp01(enter), 0.88 + 0.12 * clamp01(enter));
        ctx.shadowColor = 'rgba(0,0,0,0.48)';
        ctx.shadowBlur = 32;
        drawCover(ctx, img, pal, -cardW / 2, -cardH / 2, cardW, cardH, 20, 1.03);
        ctx.restore();
      });
    } else {
      // 3-image editorial collage (top featured + 2 bottom cards)
      const gap = Math.round(18 * u);
      const topH = areaH * 0.52;
      const botH = areaH * 0.43;
      const botW = (innerW - gap) / 2;

      const p0 = easeOutBack(localP / 0.34, 1.15);
      ctx.save();
      ctx.globalAlpha = alpha * clamp01(p0);
      ctx.shadowColor = 'rgba(0,0,0,0.48)';
      ctx.shadowBlur = 34;
      drawCover(ctx, imgs[0], pal, padX, areaTop, innerW, topH, 22, 1.03 + Math.sin(tSec * 0.5) * 0.015);
      ctx.restore();

      [imgs[1], imgs[2]].forEach((img, i) => {
        const p = easeOutBack((localP - (i + 1) * 0.1) / 0.34, 1.2);
        const bx = padX + i * (botW + gap);
        const by = areaTop + topH + gap + Math.sin(tSec * 0.9 + i * 2) * 5;
        ctx.save();
        ctx.globalAlpha = alpha * clamp01(p);
        ctx.shadowColor = 'rgba(0,0,0,0.42)';
        ctx.shadowBlur = 26;
        drawCover(ctx, img, pal, bx, by, botW, botH, 18, 1.03);
        ctx.restore();
      });
    }

    ctx.restore();
    return;
  }

  const cards = [
    { id: 'vinyl', code: '01 · VINYL', name: '旋转黑胶' },
    { id: 'polaroid', code: '02 · POLAROID', name: '拍立得胶片' },
    { id: 'magazine', code: '03 · MAGAZINE', name: '乐评特刊' },
    { id: 'cassette', code: '04 · CASSETTE', name: '模拟磁带' },
    { id: 'cd', code: '05 · JEWEL CD', name: '透明 CD 盒' },
    { id: 'glass', code: '06 · GLASS', name: '磨砂画框' },
  ];

  const cols = isCompact ? 3 : 2;
  const rows = isCompact ? 2 : 3;
  const gap = Math.round((isCompact ? 18 : 22) * u);
  const cardW = (innerW - gap * (cols - 1)) / cols;
  const gridTop = H * 0.23;
  const gridH = H * 0.63;
  const cardH = Math.min(Math.round(245 * u), (gridH - gap * (rows - 1)) / rows);
  const sweepIdx = Math.min(cards.length - 1, Math.floor(localP * cards.length * 1.1));

  cards.forEach((c, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = padX + col * (cardW + gap);
    const cy = gridTop + row * (cardH + gap);

    const p = easeOutBack((localP - idx * 0.06) / 0.32, 1.25);
    const scale = 0.86 + 0.14 * clamp01(p);
    const cardAlpha = clamp01(p);
    const isSelected = c.id === config.template || (idx === sweepIdx && localP > 0.2);

    ctx.save();
    ctx.globalAlpha = alpha * cardAlpha;
    ctx.translate(cx + cardW / 2, cy + cardH / 2);
    ctx.scale(scale, scale);

    drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 20);
    ctx.fillStyle = isSelected
      ? withAlpha(pal.accent, pal.light ? 0.16 : 0.2)
      : pal.light
        ? 'rgba(255,255,255,0.68)'
        : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = isSelected ? pal.accent : withAlpha(pal.text, 0.16);
    ctx.lineWidth = c.id === config.template ? 2.6 : 1.3;
    ctx.stroke();

    const thumbSize = Math.min(cardW * 0.36, cardH * 0.44);
    const thumbX = -cardW / 2 + Math.round(18 * u);
    const thumbY = -cardH / 2 + Math.round(20 * u);
    drawCover(ctx, coverImage, pal, thumbX, thumbY, thumbSize, thumbSize, 10);

    ctx.textAlign = 'left';
    const metaX = thumbX + thumbSize + Math.round(14 * u);
    ctx.fillStyle = pal.accent;
    ctx.font = `600 ${Math.round(13 * u)}px "SFMono-Regular", Consolas, monospace`;
    ctx.fillText(c.code, metaX, thumbY + Math.round(22 * u));

    if (c.id === config.template) {
      ctx.fillStyle = pal.accent;
      ctx.font = `600 ${Math.round(12 * u)}px ${bodyFont}`;
      ctx.fillText('★ 当前选用', metaX, thumbY + Math.round(46 * u));
    }

    ctx.fillStyle = pal.text;
    ctx.font = `700 ${Math.round((isCompact ? 24 : 27) * u)}px ${titleFont}`;
    ctx.fillText(c.name, thumbX, thumbY + thumbSize + Math.round(38 * u));

    ctx.fillStyle = pal.muted;
    ctx.font = `500 ${Math.round((isCompact ? 15 : 17) * u)}px ${bodyFont}`;
    const previewSub = wrapLines(ctx, `${song.title} · ${song.artist}`, cardW - Math.round(36 * u), 1)[0] || song.title;
    ctx.fillText(previewSub, thumbX, thumbY + thumbSize + Math.round(68 * u));

    ctx.restore();
  });

  ctx.restore();
}

/**
 * Promo Scene 3: Selected Song Lyric Quote + Customizable 3-Card Highlights + Spectrum
 */
function drawPromoMetricsScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  alpha: number,
  song: Song,
  config: PosterConfig,
  plan: PromoPlan,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  bars: number[],
  titleFont: string,
  bodyFont: string
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const isCompact = H <= 1040;
  const u = Math.min(1, W / 860);
  const padX = W * 0.08;
  const innerW = W - padX * 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = pal.accent;
  ctx.font = `600 ${Math.round(17 * u)}px "SFMono-Regular", Consolas, monospace`;
  ctx.fillText(plan.s3Kicker || '02 / SOUND & TYPOGRAPHY', W / 2, H * 0.14);

  const h3Text = plan.s3Heading || '为什么单曲循环这首歌';
  const h3Px = fitSingleLineFont(ctx, h3Text, innerW, Math.round((isCompact ? 38 : 44) * u), 22, 700, titleFont);
  ctx.fillStyle = pal.text;
  ctx.font = `700 ${h3Px}px ${titleFont}`;
  ctx.fillText(h3Text, W / 2, H * 0.14 + Math.round(52 * u));

  // Featured Song Lyric Quote Banner
  const bannerY = H * 0.24;
  const bannerH = Math.round((isCompact ? 150 : 185) * u);
  drawRoundedRect(ctx, padX, bannerY, innerW, bannerH, 24);
  ctx.fillStyle = pal.light ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.strokeStyle = withAlpha(pal.accent, 0.35);
  ctx.lineWidth = 1.6;
  ctx.stroke();

  const miniCov = bannerH - Math.round(36 * u);
  drawCover(ctx, coverImage, pal, padX + Math.round(18 * u), bannerY + Math.round(18 * u), miniCov, miniCov, 14);

  const qX = padX + miniCov + Math.round(36 * u);
  const qW = innerW - miniCov - Math.round(54 * u);
  const quote = config.lyric?.trim() || song.lyric?.trim() || `正在循环《${song.title}》`;
  ctx.textAlign = 'left';
  ctx.fillStyle = pal.text;
  ctx.font = `600 ${Math.round((isCompact ? 22 : 25) * u)}px ${titleFont}`;
  const qLines = wrapLines(ctx, `“${quote}”`, qW, 2);
  qLines.forEach((ql, idx) => {
    ctx.fillText(ql, qX, bannerY + Math.round(54 * u) + idx * Math.round(34 * u));
  });
  ctx.fillStyle = pal.accent;
  ctx.font = `500 ${Math.round(16 * u)}px ${bodyFont}`;
  const bannerMeta = `——《${song.title}》 · ${song.artist}`;
  const bannerMetaLine = wrapLines(ctx, bannerMeta, qW, 1)[0] || bannerMeta;
  ctx.fillText(bannerMetaLine, qX, bannerY + bannerH - Math.round(24 * u));

  // Customizable Feature / Mood Cards
  const items = plan.s3Highlights;
  const boxTop = bannerY + bannerH + Math.round(28 * u);
  const boxH = Math.round((isCompact ? 112 : 132) * u);
  const gap = Math.round((isCompact ? 18 : 22) * u);

  items.forEach((m, idx) => {
    const enter = easeOutCubic((localP - idx * 0.12) / 0.35);
    const xOff = (1 - enter) * -48;
    const y = boxTop + idx * (boxH + gap);

    ctx.save();
    ctx.globalAlpha = alpha * enter;
    drawRoundedRect(ctx, padX + xOff, y, innerW, boxH, 20);
    ctx.fillStyle = pal.light ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = withAlpha(pal.text, 0.14);
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = pal.accent2 || pal.accent;
    drawRoundedRect(ctx, padX + xOff, y + 16, 6, boxH - 32, 3);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = pal.text;
    const mTitlePx = fitSingleLineFont(ctx, m.title, innerW - Math.round(150 * u), Math.round((isCompact ? 23 : 26) * u), 16, 700, titleFont);
    ctx.font = `700 ${mTitlePx}px ${titleFont}`;
    ctx.fillText(m.title, padX + xOff + Math.round(26 * u), y + boxH * 0.44);

    ctx.fillStyle = pal.muted;
    ctx.font = `500 ${Math.round((isCompact ? 16 : 19) * u)}px ${bodyFont}`;
    const subTrimmed = wrapLines(ctx, m.sub, innerW - Math.round(145 * u), 1)[0] || m.sub;
    ctx.fillText(subTrimmed, padX + xOff + Math.round(26 * u), y + boxH * 0.74);

    ctx.textAlign = 'right';
    ctx.fillStyle = pal.accent;
    ctx.font = `700 ${Math.round((isCompact ? 22 : 26) * u)}px "SFMono-Regular", Consolas, monospace`;
    ctx.fillText(m.tag.slice(0, 8), padX + xOff + innerW - Math.round(24 * u), y + boxH * 0.56);
    ctx.restore();
  });

  // Live waveform footer inside Scene 3
  const wTop = Math.min(H - 96, boxTop + items.length * (boxH + gap) + Math.round(10 * u));
  const count = Math.min(32, bars.length);
  const bGap = 6;
  const bw = Math.max(4, (innerW - (count - 1) * bGap) / count);
  for (let i = 0; i < count; i++) {
    const bh = Math.max(6, bars[i] * Math.round(34 * u));
    ctx.fillStyle = i < count * 0.55 ? pal.accent : withAlpha(pal.text, 0.2);
    drawRoundedRect(ctx, padX + i * (bw + bGap), wTop + (34 - bh) / 2, bw, bh, bw / 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Shared Scene 4: Collector Card + Scannable QR Finale
 */
function drawOutroScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  localP: number,
  alpha: number,
  mode: Exclude<ProductionMode, 'poster'>,
  song: Song,
  config: PosterConfig,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  shareUrl: string,
  titleFont: string,
  bodyFont: string,
  promoPlan?: PromoPlan
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const enter = easeOutBack(localP / 0.45, 1.15);
  const isCompact = H <= 1040;
  const u = Math.min(1, W / 860);
  const cardW = Math.min(W * 0.84, 760);
  const cardH = Math.min(H * 0.68, isCompact ? 680 : 940);
  const cx = W / 2;
  const cy = H / 2;

  ctx.translate(cx, cy);
  const scale = 0.9 + 0.1 * clamp01(enter);
  ctx.scale(scale, scale);

  drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 32);
  ctx.fillStyle = pal.light ? 'rgba(255,255,255,0.82)' : 'rgba(18, 22, 32, 0.86)';
  ctx.fill();
  ctx.strokeStyle = withAlpha(pal.accent, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();

  if (mode === 'lyric-mv') {
    const covSize = Math.min(cardW * 0.48, cardH * 0.36);
    drawCover(ctx, coverImage, pal, -covSize / 2, -cardH / 2 + Math.round(48 * u), covSize, covSize, 20);

    const quote = config.lyric?.trim() || song.lyric?.trim() || '把喜欢的旋律留给今晚。';
    ctx.textAlign = 'center';
    ctx.fillStyle = pal.text;
    const qFontSize = Math.round((isCompact ? 26 : 30) * u);
    const qLineH = Math.round(qFontSize * 1.45);
    ctx.font = `600 ${qFontSize}px ${titleFont}`;
    const qLines = wrapLines(ctx, `“${quote}”`, cardW - Math.round(76 * u), 2);
    const qY = -cardH / 2 + Math.round(48 * u) + covSize + Math.round(48 * u);
    qLines.forEach((ql, i) => ctx.fillText(ql, 0, qY + i * qLineH));

    ctx.fillStyle = pal.muted;
    const mSize = fitSingleLineFont(
      ctx,
      `《${song.title}》 · ${song.artist}`,
      cardW - 64,
      Math.round(20 * u),
      14,
      500,
      bodyFont
    );
    ctx.font = `500 ${mSize}px ${bodyFont}`;
    ctx.fillText(`《${song.title}》 · ${song.artist}`, 0, qY + qLines.length * qLineH + 14);
  } else {
    const covSize = Math.min(cardW * 0.34, cardH * 0.25);
    drawCover(ctx, coverImage, pal, -covSize / 2, -cardH / 2 + Math.round(44 * u), covSize, covSize, 18);

    ctx.textAlign = 'center';
    ctx.fillStyle = pal.accent;
    ctx.font = `600 ${Math.round(16 * u)}px "SFMono-Regular", Consolas, monospace`;
    ctx.fillText('MUS.HUB · 音画 STUDIO', 0, -cardH / 2 + Math.round(44 * u) + covSize + Math.round(38 * u));

    const songHeading = promoPlan?.s4Headline || `《${song.title || '未命名曲目'}》`;
    const hPx = fitSingleLineFont(ctx, songHeading, cardW - 64, Math.round((isCompact ? 34 : 40) * u), 20, 700, titleFont);
    ctx.fillStyle = pal.text;
    ctx.font = `700 ${hPx}px ${titleFont}`;
    ctx.fillText(songHeading, 0, -cardH / 2 + Math.round(44 * u) + covSize + Math.round(88 * u));

    ctx.fillStyle = pal.muted;
    const subText = promoPlan?.s4Subline || `${song.artist || '未知歌手'} · 扫码试听并做同款画报`;
    const subPx = fitSingleLineFont(ctx, subText, cardW - 60, Math.round((isCompact ? 18 : 21) * u), 13, 500, bodyFont);
    ctx.font = `500 ${subPx}px ${bodyFont}`;
    ctx.fillText(subText, 0, -cardH / 2 + Math.round(44 * u) + covSize + Math.round(128 * u));

    // CTA pill
    const ctaText = promoPlan?.s4Cta || 'SONIC ARCHIVE · 扫码同款';
    const ctaPx = fitSingleLineFont(ctx, ctaText, cardW * 0.72, Math.round(20 * u), 14, 700, '"SFMono-Regular", Consolas, monospace');
    const pillW = Math.min(cardW * 0.82, 460);
    const pillH = Math.round(52 * u);
    const pillY = -cardH / 2 + Math.round(44 * u) + covSize + Math.round(154 * u);
    drawRoundedRect(ctx, -pillW / 2, pillY, pillW, pillH, pillH / 2);
    const grad = ctx.createLinearGradient(-pillW / 2, pillY, pillW / 2, pillY);
    grad.addColorStop(0, pal.accent);
    grad.addColorStop(1, pal.accent2 || '#d96236');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = '#11131a';
    ctx.font = `700 ${ctaPx}px "SFMono-Regular", Consolas, monospace`;
    ctx.fillText(ctaText, 0, pillY + Math.round(33 * u));
  }

  // Scannable QR Code anchored cleanly at bottom of card
  const qrSize = isCompact ? 132 : 164;
  const qrY = cardH / 2 - qrSize - 64;
  drawScannableQr(ctx, shareUrl, -qrSize / 2, qrY, qrSize, pal);
  ctx.textAlign = 'center';
  ctx.fillStyle = pal.muted;
  ctx.font = `500 17px ${bodyFont}`;
  ctx.fillText('扫码听歌 / 制作同款', 0, cardH / 2 - 28);

  ctx.restore();
}

/**
 * Main Multi-Scene Deterministic Canvas Director Entry Point.
 */
export function renderMultiSceneProduction(params: MultiSceneRenderParams): void {
  const {
    ctx,
    canvas,
    mode,
    song,
    config,
    palette: pal,
    coverImage,
    customImages = [],
    promoPlan,
    lyricsLines,
    shareUrl,
    tSec,
    durationSec,
    bars: injectedBars,
    isPlaying = true,
  } = params;

  const dim = RATIOS[config.ratio] || RATIOS['9:16'];
  if (canvas.width !== dim.w || canvas.height !== dim.h) {
    canvas.width = dim.w;
    canvas.height = dim.h;
  }

  const W = canvas.width;
  const H = canvas.height;
  const safeDur = Math.max(1, durationSec);
  const globalP = clamp01(tSec / safeDur);
  const fontSpec = FONT_STYLES.find((f) => f.id === config.fontStyle) || FONT_STYLES[0];
  const scenes: SceneWindowSpec[] = getSceneSpecs(mode);
  const activePlan =
    mode === 'promo'
      ? promoPlan || generateSmartPromoPlan(song, config, lyricsLines)
      : undefined;
  const bars =
    injectedBars && injectedBars.length > 0
      ? injectedBars
      : audioEngine.getFrequencyBars(36, tSec, true);

  drawBackdrop(ctx, W, H, tSec, pal, activePlan?.themeStyle || 'darkroom');

  // Top Masthead Bar
  ctx.save();
  ctx.font = '600 17px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = withAlpha(pal.muted, 0.85);
  ctx.textAlign = 'left';
  ctx.fillText(
    mode === 'promo' ? 'MUS.HUB / PRODUCT LAUNCH' : 'SONIC ARCHIVE / LYRIC MV',
    56,
    66
  );
  ctx.textAlign = 'right';
  ctx.fillText(`${formatSecondsMMSS(tSec)} / ${formatSecondsMMSS(safeDur)}`, W - 56, 66);
  ctx.restore();

  const localOf = (win: SceneWindowSpec) =>
    clamp01((globalP - win.startRatio) / Math.max(0.001, win.endRatio - win.startRatio));

  const a0 = computeSceneAlpha(globalP, scenes[0], true, false);
  const a1 = computeSceneAlpha(globalP, scenes[1], false, false);
  const a2 = computeSceneAlpha(globalP, scenes[2], false, false);
  const a3 = computeSceneAlpha(globalP, scenes[3], false, true);

  if (mode === 'lyric-mv') {
    // S1: Album Cover + Vinyl Hero (ensures Frame 0 / OS video thumbnail always shows the album cover!)
    drawMvHeroScene(
      ctx,
      W,
      H,
      localOf(scenes[0]),
      tSec,
      a0,
      song,
      pal,
      coverImage,
      bars,
      fontSpec.titleFont,
      fontSpec.bodyFont
    );
    // S2: Kinetic Lyrics
    drawMvLyricsScene(
      ctx,
      W,
      H,
      localOf(scenes[1]),
      a1,
      song,
      config,
      pal,
      coverImage,
      lyricsLines,
      fontSpec.titleFont
    );
    // S3: Brand Motion Interlude
    drawBrandIntroScene(
      ctx,
      W,
      H,
      localOf(scenes[2]),
      a2,
      pal,
      fontSpec.titleFont,
      fontSpec.bodyFont,
      '音画 · SONIC ARCHIVE',
      `${song.title} — ${song.artist}`
    );
    // S4: Outro Collector Card + QR
    drawOutroScene(
      ctx,
      W,
      H,
      localOf(scenes[3]),
      a3,
      'lyric-mv',
      song,
      config,
      pal,
      coverImage,
      shareUrl,
      fontSpec.titleFont,
      fontSpec.bodyFont
    );
  } else if (activePlan) {
    drawPromoSongIntroScene(
      ctx,
      W,
      H,
      localOf(scenes[0]),
      tSec,
      a0,
      song,
      activePlan,
      pal,
      coverImage,
      bars,
      fontSpec.titleFont,
      fontSpec.bodyFont
    );
    drawPromoTemplatesScene(
      ctx,
      W,
      H,
      localOf(scenes[1]),
      tSec,
      a1,
      song,
      config,
      activePlan,
      pal,
      coverImage,
      customImages,
      fontSpec.titleFont,
      fontSpec.bodyFont
    );
    drawPromoMetricsScene(
      ctx,
      W,
      H,
      localOf(scenes[2]),
      a2,
      song,
      config,
      activePlan,
      pal,
      coverImage,
      bars,
      fontSpec.titleFont,
      fontSpec.bodyFont
    );
    drawOutroScene(
      ctx,
      W,
      H,
      localOf(scenes[3]),
      a3,
      'promo',
      song,
      config,
      pal,
      coverImage,
      shareUrl,
      fontSpec.titleFont,
      fontSpec.bodyFont,
      activePlan
    );
  }

  // Keep subtle bottom progress hairline in live playback preview
  if (isPlaying || globalP > 0) {
    ctx.save();
    ctx.fillStyle = withAlpha(pal.text, 0.12);
    ctx.fillRect(56, H - 38, W - 112, 3);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(56, H - 38, (W - 112) * globalP, 3);
    ctx.restore();
  }

  if (config.filmGrain) {
    const pattern = getDeterministicGrain(ctx);
    if (pattern) {
      ctx.save();
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
