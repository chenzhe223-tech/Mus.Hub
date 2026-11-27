import type { Palette, PosterConfig, Song } from '../types';
import { FONT_STYLES, RATIOS } from '../data/curated';
import { withAlpha } from '../utils/color';
import { drawScannableQr } from '../utils/qr';
import { audioEngine } from '../utils/audioEngine';

export interface RenderPosterParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  song: Song;
  config: PosterConfig;
  palette: Palette;
  coverImage: HTMLImageElement | null;
  shareUrl: string;
  nowMs: number;
  startMs: number;
  isPlaying: boolean;
}

// Cached analog film grain pattern (fast 60fps overlay)
let cachedGrainPattern: CanvasPattern | null = null;

function getGrainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (cachedGrainPattern) return cachedGrainPattern;
  try {
    const g = document.createElement('canvas');
    g.width = 160;
    g.height = 160;
    const gctx = g.getContext('2d');
    if (!gctx) return null;
    const img = gctx.createImageData(160, 160);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = Math.floor(Math.random() * 16);
    }
    gctx.putImageData(img, 0, 0);
    cachedGrainPattern = ctx.createPattern(g, 'repeat');
    return cachedGrainPattern;
  } catch {
    return null;
  }
}

function getFontSpec(fontStyle: PosterConfig['fontStyle']) {
  return FONT_STYLES.find((f) => f.id === fontStyle) || FONT_STYLES[0];
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

function drawCoverArt(
  ctx: CanvasRenderingContext2D,
  coverImage: HTMLImageElement | null,
  palette: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  if (coverImage && coverImage.naturalWidth > 0) {
    const iw = coverImage.naturalWidth;
    const ih = coverImage.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(coverImage, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, palette.bg2);
    grad.addColorStop(0.6, palette.accent);
    grad.addColorStop(1, palette.accent2 || palette.bg1);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function measureWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (!text) return [];
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '\n') {
      lines.push(current);
      current = '';
      if (lines.length >= maxLines) break;
      continue;
    }
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    const usedLen = lines.join('').length;
    if (usedLen < text.replace(/\n/g, '').length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.slice(0, Math.max(1, last.length - 1)) + '…';
    }
  }
  return lines;
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  dynamic: boolean,
  pal: Palette
) {
  const barCount = Math.max(24, Math.min(40, Math.floor(w / 18)));
  const bars = audioEngine.getFrequencyBars(barCount, t, dynamic);
  const gap = 5;
  const barW = Math.max(3, (w - (barCount - 1) * gap) / barCount);

  ctx.save();
  for (let i = 0; i < barCount; i++) {
    const val = bars[i];
    const bh = Math.max(6, val * h);
    const bx = x + i * (barW + gap);
    const by = y + (h - bh) / 2;
    const isActive = i < barCount * 0.52;
    ctx.fillStyle = isActive
      ? pal.accent
      : pal.light
        ? 'rgba(28, 25, 23, 0.2)'
        : 'rgba(255, 255, 255, 0.25)';
    drawRoundedRect(ctx, bx, by, barW, bh, barW / 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  durationText: string,
  pal: Palette,
  fontBody: string
) {
  const { progress, currentLabel } = audioEngine.getPlaybackProgress(durationText);
  ctx.save();
  ctx.fillStyle = pal.light ? 'rgba(28, 25, 23, 0.14)' : 'rgba(255, 255, 255, 0.18)';
  drawRoundedRect(ctx, x, y, w, 6, 3);
  ctx.fill();

  const progGrad = ctx.createLinearGradient(x, y, x + w * progress, y);
  progGrad.addColorStop(0, pal.accent);
  progGrad.addColorStop(1, pal.accent2 || pal.text);
  ctx.fillStyle = progGrad;
  drawRoundedRect(ctx, x, y, Math.max(10, w * progress), 6, 3);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w * progress, y + 3, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = pal.text;
  ctx.shadowColor = withAlpha(pal.accent, 0.7);
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = `500 18px ${fontBody}`;
  ctx.fillStyle = pal.muted;
  ctx.textAlign = 'left';
  ctx.fillText(currentLabel, x, y + 28);
  ctx.textAlign = 'right';
  ctx.fillText(durationText || '03:45', x + w, y + 28);
  ctx.restore();
}

function drawAmbientBackdrop(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  pal: Palette,
  dynamic: boolean
) {
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.25, H);
  bgGrad.addColorStop(0, pal.bg1);
  bgGrad.addColorStop(1, pal.bg2);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  const phase = dynamic ? t : 0;

  // Restrained Gallery Key Light (warm, organic — never garish neon bloom)
  const orb1X = W * (0.28 + Math.sin(phase * 0.35) * 0.08);
  const orb1Y = H * (0.24 + Math.cos(phase * 0.28) * 0.06);
  const r1 = ctx.createRadialGradient(orb1X, orb1Y, 12, orb1X, orb1Y, W * 0.78);
  r1.addColorStop(0, withAlpha(pal.accent, pal.light ? 0.14 : 0.22));
  r1.addColorStop(1, withAlpha(pal.accent, 0));
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, W, H);

  const orb2X = W * (0.76 + Math.cos(phase * 0.32) * 0.07);
  const orb2Y = H * (0.78 + Math.sin(phase * 0.36) * 0.06);
  const orb2Color = pal.accent2 || (pal.light ? '#a87d43' : '#3a4a63');
  const r2 = ctx.createRadialGradient(orb2X, orb2Y, 12, orb2X, orb2Y, W * 0.7);
  r2.addColorStop(0, withAlpha(orb2Color, pal.light ? 0.1 : 0.16));
  r2.addColorStop(1, withAlpha(orb2Color, 0));
  ctx.fillStyle = r2;
  ctx.fillRect(0, 0, W, H);

  // Subtle darkroom vignette
  if (!pal.light) {
    const vig = ctx.createRadialGradient(
      W * 0.5,
      H * 0.45,
      W * 0.25,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.78
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // Fine architectural gallery inset rule
  const inset = 24;
  ctx.strokeStyle = pal.light ? 'rgba(28, 22, 18, 0.1)' : 'rgba(242, 237, 228, 0.09)';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 12);
  ctx.stroke();

  ctx.restore();
}

/**
 * Main Adaptive Poster Render Engine
 * Dynamically allocates hero, typography, and footer zones so 1:1 / 3:4 / 4:5 / 9:16 NEVER overlap.
 */
export function renderPoster(params: RenderPosterParams): void {
  const { ctx, canvas, song, config, palette: pal, coverImage, shareUrl, nowMs, startMs, isPlaying } = params;
  const dim = RATIOS[config.ratio] || RATIOS['3:4'];
  if (canvas.width !== dim.w || canvas.height !== dim.h) {
    canvas.width = dim.w;
    canvas.height = dim.h;
  }

  const W = canvas.width;
  const H = canvas.height;
  const isCompact = H <= 1040; // 1:1 square mode
  const isTall = H / W >= 1.65; // 9:16 story mode
  const dynamic = config.mode === 'dynamic';
  const t = dynamic ? (nowMs - startMs) / 1000 : 0;
  const fonts = getFontSpec(config.fontStyle);

  const padX = isTall ? 54 : 64;
  const innerW = W - padX * 2;

  // Step 1: Backdrop
  drawAmbientBackdrop(ctx, W, H, t, pal, dynamic);

  // Special full-bleed layout for Magazine template
  if (config.template === 'magazine') {
    renderMagazineTemplate(ctx, W, H, padX, innerW, song, config, pal, coverImage, shareUrl, t, dynamic, fonts);
    applyAtmosphereFinish(ctx, W, H, t, pal, dynamic, config.filmGrain);
    return;
  }

  // Step 2: Top Brand Editorial Masthead Bar
  const topY = isCompact ? 56 : 68;
  ctx.save();
  ctx.font = `600 ${isCompact ? 15 : 17}px "SFMono-Regular", Consolas, monospace`;
  ctx.fillStyle = withAlpha(pal.muted, 0.82);
  ctx.textAlign = 'left';
  ctx.fillText('SONIC ARCHIVE  /  SIDE A · 33⅓ RPM', padX, topY);
  ctx.textAlign = 'right';
  ctx.fillText(dynamic ? '● REC LIVE' : 'STEREO PRINT', W - padX, topY);

  // Subtle hairline rule under masthead
  ctx.strokeStyle = pal.light ? 'rgba(28, 22, 18, 0.12)' : 'rgba(242, 237, 228, 0.11)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, topY + 14);
  ctx.lineTo(W - padX, topY + 14);
  ctx.stroke();
  ctx.restore();

  // Step 3: Reserve Footer Height accurately (prevents ANY vertical overlap!)
  const bottomMargin = isCompact ? 48 : 58;
  const qrSize = config.showQr ? (isCompact ? 82 : 94) : 0;
  const progressH = config.showProgress ? 36 : 0;
  const waveH = config.showWave ? (isCompact ? 40 : 48) : 0;
  const waveProgressGap = config.showWave && config.showProgress ? 18 : 0;
  const leftFooterH = progressH + waveH + waveProgressGap;
  const footerBlockH = Math.max(leftFooterH, qrSize + (config.showQr ? 16 : 0));
  const footerTopY = footerBlockH > 0 ? H - bottomMargin - footerBlockH : H - bottomMargin;

  // Step 4: Reserve Text Area (Title + Artist + Lyric)
  const titleFontSize = isCompact ? 38 : isTall ? 42 : 46;
  const titleLineH = Math.round(titleFontSize * 1.2);
  const artistFontSize = isCompact ? 22 : 24;
  const lyricFontSize = isCompact ? 22 : 25;
  const lyricLineH = Math.round(lyricFontSize * 1.48);

  ctx.save();
  ctx.font = `700 ${titleFontSize}px ${fonts.titleFont}`;
  const titleLines = measureWrappedLines(ctx, song.title || '未命名曲目', innerW, 2);
  ctx.font = `500 ${lyricFontSize}px ${fonts.bodyFont}`;
  const hasLyric = config.showLyric && config.lyric.trim().length > 0;
  const lyricLines = hasLyric
    ? measureWrappedLines(ctx, `“${config.lyric.trim()}”`, innerW - 26, 2)
    : [];
  ctx.restore();

  const textBlockH =
    titleLines.length * titleLineH +
    10 +
    artistFontSize +
    (hasLyric ? 28 + lyricLines.length * lyricLineH : 0);

  const heroTopY = topY + (isCompact ? 26 : 36);
  const textToFooterGap = footerBlockH > 0 ? (isCompact ? 24 : 34) : 12;
  const heroToTextGap = isCompact ? 28 : 42;

  const textTopY = footerTopY - textToFooterGap - textBlockH;
  const heroMaxH = Math.max(220, textTopY - heroToTextGap - heroTopY);

  // Step 5: Draw Template Hero inside [heroTopY, heroTopY + heroMaxH]
  if (config.template === 'vinyl') {
    drawVinylHero(ctx, W, padX, innerW, heroTopY, heroMaxH, t, isPlaying, pal, coverImage);
  } else if (config.template === 'polaroid') {
    drawPolaroidHero(ctx, W, innerW, heroTopY, heroMaxH, t, dynamic, pal, coverImage, song, fonts.bodyFont);
  } else if (config.template === 'glass') {
    drawGlassHero(ctx, W, innerW, heroTopY, heroMaxH, t, dynamic, isPlaying, pal, coverImage);
  } else if (config.template === 'cassette') {
    drawCassetteHero(ctx, W, innerW, heroTopY, heroMaxH, t, isPlaying, pal, coverImage, song);
  } else if (config.template === 'cd') {
    drawCdJewelHero(ctx, W, innerW, heroTopY, heroMaxH, t, isPlaying, pal, coverImage, song);
  }

  // Step 6: Draw Song Title, Artist & Lyric Quote cleanly at textTopY
  let curY = textTopY + titleFontSize * 0.85;
  ctx.save();
  ctx.fillStyle = pal.text;
  ctx.font = `700 ${titleFontSize}px ${fonts.titleFont}`;
  ctx.textAlign = 'left';
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, padX, curY + idx * titleLineH);
  });
  curY += (titleLines.length - 1) * titleLineH + 16 + artistFontSize;

  ctx.fillStyle = pal.muted;
  ctx.font = `500 ${artistFontSize}px ${fonts.bodyFont}`;
  const artistMeta = `${song.artist || '未知歌手'}  ·  ${song.album || '单曲'}`;
  const artistTrimmed = measureWrappedLines(ctx, artistMeta, innerW, 1)[0] || artistMeta;
  ctx.fillText(artistTrimmed, padX, curY);

  if (hasLyric) {
    const quoteTop = curY + 28;
    const barH = lyricLines.length * lyricLineH - 8;
    ctx.fillStyle = pal.accent;
    drawRoundedRect(ctx, padX, quoteTop, 4.5, Math.max(24, barH), 3);
    ctx.fill();

    ctx.fillStyle = withAlpha(pal.text, 0.92);
    ctx.font = `500 ${lyricFontSize}px ${fonts.bodyFont}`;
    lyricLines.forEach((line, idx) => {
      ctx.fillText(line, padX + 20, quoteTop + lyricFontSize * 0.9 + idx * lyricLineH);
    });
  }
  ctx.restore();

  // Step 7: Draw Footer (Waveform + Progress + Real Scannable QR)
  const footerBottomY = H - bottomMargin;
  const leftAreaW = config.showQr ? innerW - qrSize - 26 : innerW;

  if (config.showProgress) {
    drawProgressBar(ctx, padX, footerBottomY - 32, leftAreaW, song.duration, pal, fonts.bodyFont);
  }
  if (config.showWave) {
    const waveY = config.showProgress
      ? footerBottomY - 32 - waveProgressGap - waveH
      : footerBottomY - waveH - 6;
    drawWaveform(ctx, padX, waveY, leftAreaW, waveH, t, dynamic, pal);
  }
  if (config.showQr) {
    const qrX = W - padX - qrSize;
    const qrY = footerBottomY - qrSize - 16;
    drawScannableQr(ctx, shareUrl, qrX, qrY, qrSize, pal);
    ctx.save();
    ctx.font = `500 13px ${fonts.bodyFont}`;
    ctx.fillStyle = withAlpha(pal.muted, 0.85);
    ctx.textAlign = 'center';
    ctx.fillText('扫码听同款', qrX + qrSize / 2, footerBottomY + 2);
    ctx.restore();
  }

  // Step 8: Subtle bokeh particles & analog film grain
  applyAtmosphereFinish(ctx, W, H, t, pal, dynamic, config.filmGrain);
}

/* ===========================
 *  TEMPLATE 1: VINYL RECORD
 * =========================== */
function drawVinylHero(
  ctx: CanvasRenderingContext2D,
  W: number,
  padX: number,
  innerW: number,
  heroTopY: number,
  heroMaxH: number,
  t: number,
  isPlaying: boolean,
  pal: Palette,
  coverImage: HTMLImageElement | null
) {
  const sleeveSize = Math.min(innerW * 0.64, heroMaxH * 0.92);
  const totalGroupW = sleeveSize * 1.44;
  const sleeveX = Math.max(padX, (W - totalGroupW) / 2);
  const sleeveY = heroTopY + (heroMaxH - sleeveSize) / 2;

  const discR = sleeveSize * 0.475;
  const discCx = sleeveX + sleeveSize * 0.96;
  const discCy = sleeveY + sleeveSize * 0.5;

  // Spinning Vinyl Disc
  ctx.save();
  ctx.translate(discCx, discCy);
  ctx.rotate(t * (isPlaying ? 1.55 : 0.72));

  ctx.beginPath();
  ctx.arc(0, 0, discR, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0c10';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 36;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Micro-grooves
  for (let r = discR * 0.42; r < discR * 0.96; r += 7.5) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.065)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // Anisotropic vinyl gloss sheen
  const sheen = ctx.createLinearGradient(-discR, -discR, discR, discR);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.42, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  sheen.addColorStop(0.58, withAlpha(pal.accent, 0.22));
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(0, 0, discR, 0, Math.PI * 2);
  ctx.fill();

  // Center label
  const labelR = discR * 0.36;
  drawCoverArt(ctx, coverImage, pal, -labelR, -labelR, labelR * 2, labelR * 2, labelR);
  ctx.beginPath();
  ctx.arc(0, 0, labelR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Spindle hole
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#11131a';
  ctx.fill();
  ctx.restore();

  // Metallic Tonearm (唱臂)
  const pivotX = discCx + discR * 0.72;
  const pivotY = sleeveY + 18;
  ctx.save();
  ctx.translate(pivotX, pivotY);
  const armAngle = isPlaying ? 0.38 : 0.26;
  ctx.rotate(armAngle);
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, discR * 1.05);
  ctx.lineTo(-16, discR * 1.24);
  ctx.stroke();

  // Cartridge head
  ctx.fillStyle = pal.accent;
  drawRoundedRect(ctx, -25, discR * 1.2, 16, 26, 4);
  ctx.fill();
  ctx.restore();

  // Tonearm pivot base
  ctx.save();
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#27272a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Sleeve cover with depth shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 18;
  drawCoverArt(ctx, coverImage, pal, sleeveX, sleeveY, sleeveSize, sleeveSize, 20);
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, sleeveX, sleeveY, sleeveSize, sleeveSize, 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ===========================
 *  TEMPLATE 2: POLAROID FILM
 * =========================== */
function drawPolaroidHero(
  ctx: CanvasRenderingContext2D,
  W: number,
  innerW: number,
  heroTopY: number,
  heroMaxH: number,
  t: number,
  dynamic: boolean,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  song: Song,
  fontBody: string
) {
  const frameH = Math.min(heroMaxH * 0.94, innerW * 0.92);
  const frameW = Math.min(innerW * 0.84, frameH * 0.84);
  const cx = W / 2;
  const cy = heroTopY + heroMaxH / 2;
  const tilt = dynamic ? Math.sin(t * 0.7) * 0.025 - 0.025 : -0.028;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);

  // Soft drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.52)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#f8f5ef';
  drawRoundedRect(ctx, -frameW / 2, -frameH / 2, frameW, frameH, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Translucent washi masking tape at top
  ctx.save();
  ctx.rotate(0.05);
  ctx.fillStyle = withAlpha(pal.accent, 0.42);
  ctx.fillRect(-58, -frameH / 2 - 14, 116, 30);
  ctx.restore();

  // Inner photo square
  const pad = Math.round(frameW * 0.065);
  const imgSize = frameW - pad * 2;
  const imgX = -frameW / 2 + pad;
  const imgY = -frameH / 2 + pad;
  drawCoverArt(ctx, coverImage, pal, imgX, imgY, imgSize, imgSize, 4);

  // Warm analog film light leak overlay
  const leak = ctx.createLinearGradient(imgX, imgY, imgX + imgSize, imgY + imgSize);
  leak.addColorStop(0, withAlpha(pal.accent, 0.24));
  leak.addColorStop(0.45, 'rgba(255,255,255,0)');
  leak.addColorStop(1, 'rgba(251,146,60,0.18)');
  ctx.fillStyle = leak;
  ctx.fillRect(imgX, imgY, imgSize, imgSize);

  // Retro orange film date stamp inside corner of photo
  ctx.font = '600 16px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = 'rgba(251, 146, 60, 0.92)';
  ctx.textAlign = 'right';
  const today = new Date();
  const dateLabel = `'${String(today.getFullYear()).slice(2)} ${String(today.getMonth() + 1).padStart(2, '0')} ${String(today.getDate()).padStart(2, '0')}`;
  ctx.fillText(dateLabel, imgX + imgSize - 14, imgY + imgSize - 14);

  // Polaroid bottom chin caption
  const chinY = imgY + imgSize + (frameH - pad - imgSize) * 0.58;
  ctx.fillStyle = '#3f362f';
  ctx.font = `600 20px ${fontBody}`;
  ctx.textAlign = 'left';
  ctx.fillText(song.album.slice(0, 18), imgX + 2, chinY);
  ctx.fillStyle = '#8b7b6e';
  ctx.font = '500 15px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SPARK 400 · #24A', imgX + imgSize - 2, chinY);

  ctx.restore();
}

/* ===========================
 *  TEMPLATE 3: LIQUID GLASS
 * =========================== */
function drawGlassHero(
  ctx: CanvasRenderingContext2D,
  W: number,
  innerW: number,
  heroTopY: number,
  heroMaxH: number,
  t: number,
  dynamic: boolean,
  isPlaying: boolean,
  pal: Palette,
  coverImage: HTMLImageElement | null
) {
  const cx = W / 2;
  const cy = heroTopY + heroMaxH / 2;
  const cardSize = Math.min(innerW * 0.86, heroMaxH * 0.92);
  const coverSize = cardSize * 0.78;
  const floatY = dynamic ? Math.sin(t * 1.6) * 7 : 0;

  // Audio-reactive luminous halo rings
  const bars = audioEngine.getFrequencyBars(8, t, dynamic);
  const bassEnergy = (bars[1] + bars[2]) * 0.5;
  for (let i = 1; i <= 3; i++) {
    const pulse = dynamic ? Math.sin(t * 2.1 - i * 0.9) * 10 + (isPlaying ? bassEnergy * 24 : 0) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy + floatY, cardSize * 0.44 + i * 24 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(pal.accent, 0.28 - i * 0.07);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  // Frosted Glass Container Card
  const gx = cx - cardSize / 2;
  const gy = cy - cardSize / 2 + floatY;
  ctx.save();
  drawRoundedRect(ctx, gx, gy, cardSize, cardSize, 36);
  ctx.fillStyle = pal.light ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.08)';
  ctx.fill();

  const borderGrad = ctx.createLinearGradient(gx, gy, gx + cardSize, gy + cardSize);
  borderGrad.addColorStop(0, 'rgba(255,255,255,0.48)');
  borderGrad.addColorStop(0.5, withAlpha(pal.accent, 0.25));
  borderGrad.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Elevated Cover inside Glass
  const covX = cx - coverSize / 2;
  const covY = cy - coverSize / 2 + floatY;
  ctx.save();
  ctx.shadowColor = withAlpha(pal.accent, 0.45);
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 14;
  drawCoverArt(ctx, coverImage, pal, covX, covY, coverSize, coverSize, 26);
  ctx.restore();

  // Top-left glass gloss reflection
  ctx.save();
  drawRoundedRect(ctx, covX, covY, coverSize, coverSize, 26);
  const gloss = ctx.createLinearGradient(covX, covY, covX + coverSize * 0.7, covY + coverSize * 0.7);
  gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
  gloss.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();
}

/* ===========================
 *  TEMPLATE 4: RETRO CASSETTE
 * =========================== */
function drawCassetteHero(
  ctx: CanvasRenderingContext2D,
  W: number,
  innerW: number,
  heroTopY: number,
  heroMaxH: number,
  t: number,
  isPlaying: boolean,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  song: Song
) {
  const tapeW = Math.min(innerW * 0.95, heroMaxH / 0.63);
  const tapeH = tapeW * 0.63;
  const tapeX = (W - tapeW) / 2;
  const tapeY = heroTopY + (heroMaxH - tapeH) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.58)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = pal.light ? '#251e1b' : '#151824';
  drawRoundedRect(ctx, tapeX, tapeY, tapeW, tapeH, 26);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Corner Screws
  const screwInset = 18;
  [
    [tapeX + screwInset, tapeY + screwInset],
    [tapeX + tapeW - screwInset, tapeY + screwInset],
    [tapeX + screwInset, tapeY + tapeH - screwInset],
    [tapeX + tapeW - screwInset, tapeY + tapeH - screwInset],
  ].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
  });

  // Inner Paper Label
  const lblX = tapeX + 30;
  const lblY = tapeY + 28;
  const lblW = tapeW - 60;
  const lblH = tapeH * 0.66;
  drawRoundedRect(ctx, lblX, lblY, lblW, lblH, 14);
  ctx.fillStyle = '#f5f2eb';
  ctx.fill();

  // Accent Top Banner
  ctx.save();
  drawRoundedRect(ctx, lblX, lblY, lblW, lblH, 14);
  ctx.clip();
  ctx.fillStyle = pal.accent;
  ctx.fillRect(lblX, lblY, lblW, 42);
  ctx.fillStyle = pal.accent2 || '#18181b';
  ctx.fillRect(lblX, lblY + 42, lblW, 6);
  ctx.restore();

  ctx.font = '700 18px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText('SIDE A  ·  HI-FI CHROME 90', lblX + 18, lblY + 28);
  ctx.textAlign = 'right';
  ctx.fillText(song.duration, lblX + lblW - 18, lblY + 28);

  // Mini cover art on left
  const miniSize = Math.max(70, lblH - 74);
  drawCoverArt(ctx, coverImage, pal, lblX + 16, lblY + 60, miniSize, miniSize, 10);

  // Central Tape Window
  const winX = lblX + miniSize + 30;
  const winY = lblY + 66;
  const winW = lblW - miniSize - 48;
  const winH = Math.max(66, lblH - 86);
  ctx.fillStyle = '#0e1017';
  drawRoundedRect(ctx, winX, winY, winW, winH, 12);
  ctx.fill();

  // Spools & Tape Reels
  const reelR = Math.min(winH * 0.35, 38);
  const reelY = winY + winH / 2;
  const leftReelX = winX + winW * 0.27;
  const rightReelX = winX + winW * 0.73;

  // Magnetic tape pack rings
  ctx.beginPath();
  ctx.arc(leftReelX, reelY, reelR * 1.38, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120, 68, 42, 0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rightReelX, reelY, reelR * 1.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120, 68, 42, 0.55)';
  ctx.fill();

  [leftReelX, rightReelX].forEach((rx) => {
    ctx.save();
    ctx.translate(rx, reelY);
    ctx.rotate(t * (isPlaying ? 3.2 : 1.5));
    ctx.beginPath();
    ctx.arc(0, 0, reelR, 0, Math.PI * 2);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * (reelR - 4), Math.sin(a) * (reelR - 4));
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  });

  // Bottom Trapezoid Deck
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  drawRoundedRect(ctx, tapeX + tapeW * 0.18, tapeY + tapeH - 52, tapeW * 0.64, 36, 8);
  ctx.fill();
  ctx.restore();
}

/* ===========================
 *  TEMPLATE 5: Y2K CD JEWEL CASE
 * =========================== */
function drawCdJewelHero(
  ctx: CanvasRenderingContext2D,
  W: number,
  innerW: number,
  heroTopY: number,
  heroMaxH: number,
  t: number,
  isPlaying: boolean,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  song: Song
) {
  const caseSize = Math.min(innerW * 0.64, heroMaxH * 0.9);
  const totalW = caseSize * 1.42;
  const caseX = (W - totalW) / 2;
  const caseY = heroTopY + (heroMaxH - caseSize) / 2;

  const discR = caseSize * 0.46;
  const discCx = caseX + caseSize * 0.94;
  const discCy = caseY + caseSize * 0.5;

  // Spinning Iridescent Holographic CD Disc
  ctx.save();
  ctx.translate(discCx, discCy);
  ctx.rotate(t * (isPlaying ? 2.1 : 0.95));

  ctx.shadowColor = 'rgba(0,0,0,0.48)';
  ctx.shadowBlur = 32;
  ctx.beginPath();
  ctx.arc(0, 0, discR, 0, Math.PI * 2);
  const cdBase = ctx.createLinearGradient(-discR, -discR, discR, discR);
  cdBase.addColorStop(0, '#e2e8f0');
  cdBase.addColorStop(0.25, '#fbcfe8');
  cdBase.addColorStop(0.5, '#bae6fd');
  cdBase.addColorStop(0.75, '#ddd6fe');
  cdBase.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = cdBase;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rainbow Conic Specular Wedges
  for (let w = 0; w < 6; w++) {
    ctx.save();
    ctx.rotate((w * Math.PI) / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, discR, -0.22, 0.22);
    ctx.closePath();
    const colors = [
      'rgba(244,114,182,0.28)',
      'rgba(56,189,248,0.28)',
      'rgba(52,211,153,0.26)',
      'rgba(250,204,21,0.24)',
      'rgba(167,139,250,0.28)',
      'rgba(255,255,255,0.34)',
    ];
    ctx.fillStyle = colors[w];
    ctx.fill();
    ctx.restore();
  }

  // Inner transparent acrylic hub
  ctx.beginPath();
  ctx.arc(0, 0, discR * 0.34, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,23,42,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, discR * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = pal.bg1;
  ctx.fill();
  ctx.restore();

  // Acrylic Jewel Case Outer Shell
  const spineW = Math.round(caseSize * 0.11);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.52)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  drawRoundedRect(ctx, caseX, caseY, caseSize, caseSize, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.restore();

  // Left Ridged Transparent Spine
  ctx.save();
  drawRoundedRect(ctx, caseX, caseY, spineW, caseSize, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
  for (let y = caseY + 18; y < caseY + caseSize - 18; y += 12) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(caseX + 6, y, spineW - 12, 3);
  }
  ctx.restore();

  // Album Booklet Cover inside Jewel Case
  const artX = caseX + spineW + 6;
  const artY = caseY + 8;
  const artW = caseSize - spineW - 14;
  const artH = caseSize - 16;
  drawCoverArt(ctx, coverImage, pal, artX, artY, artW, artH, 6);

  // Diagonal Acrylic Glass Reflection + CD Sticker Badge
  ctx.save();
  drawRoundedRect(ctx, caseX, caseY, caseSize, caseSize, 14);
  ctx.clip();
  const shine = ctx.createLinearGradient(caseX, caseY, caseX + caseSize, caseY + caseSize);
  shine.addColorStop(0, 'rgba(255,255,255,0.3)');
  shine.addColorStop(0.28, 'rgba(255,255,255,0.04)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0)');
  shine.addColorStop(0.8, 'rgba(255,255,255,0.12)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(caseX, caseY, caseSize, caseSize);
  ctx.restore();

  // Case crisp border
  ctx.save();
  drawRoundedRect(ctx, caseX, caseY, caseSize, caseSize, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Little hype sticker
  const stX = caseX + caseSize - 98;
  const stY = caseY + 18;
  drawRoundedRect(ctx, stX, stY, 82, 26, 6);
  ctx.fillStyle = pal.accent;
  ctx.fill();
  ctx.font = '700 12px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(song.duration, stX + 41, stY + 17);
  ctx.restore();
}

/* ===========================
 *  TEMPLATE 6: EDITORIAL MAGAZINE
 * =========================== */
function renderMagazineTemplate(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  padX: number,
  innerW: number,
  song: Song,
  config: PosterConfig,
  pal: Palette,
  coverImage: HTMLImageElement | null,
  shareUrl: string,
  t: number,
  dynamic: boolean,
  fonts: { titleFont: string; bodyFont: string }
) {
  const isCompact = H <= 1040;
  const margin = 38;
  const photoW = W - margin * 2;
  const photoH = H - margin * 2;

  // Full-bleed Framed Magazine Cover Art
  ctx.save();
  drawCoverArt(ctx, coverImage, pal, margin, margin, photoW, photoH, 24);
  ctx.restore();

  // Editorial Dark/Tinted Scrim for ultra-legible typography
  ctx.save();
  drawRoundedRect(ctx, margin, margin, photoW, photoH, 24);
  ctx.clip();

  const topScrim = ctx.createLinearGradient(0, margin, 0, margin + 260);
  topScrim.addColorStop(0, 'rgba(6, 8, 14, 0.72)');
  topScrim.addColorStop(1, 'rgba(6, 8, 14, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(margin, margin, photoW, 260);

  const botScrim = ctx.createLinearGradient(0, H * 0.42, 0, H - margin);
  botScrim.addColorStop(0, 'rgba(6, 8, 14, 0)');
  botScrim.addColorStop(0.55, withAlpha(pal.bg1, 0.78));
  botScrim.addColorStop(1, withAlpha(pal.bg1, 0.96));
  ctx.fillStyle = botScrim;
  ctx.fillRect(margin, H * 0.42, photoW, H - margin - H * 0.42);
  ctx.restore();

  // Crisp Magazine Border
  ctx.save();
  drawRoundedRect(ctx, margin, margin, photoW, photoH, 24);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Giant Masthead Title ("SONIC")
  const mastY = margin + (isCompact ? 94 : 112);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${isCompact ? 76 : 92}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SONIC', W / 2, mastY);

  ctx.font = '600 16px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.textAlign = 'left';
  ctx.fillText('ISSUE NO. 09 · MUSIC EDITION', padX + 4, margin + 38);
  ctx.textAlign = 'right';
  ctx.fillText(dynamic ? 'MOTION COVER' : 'COLLECTOR PRINT', W - padX - 4, margin + 38);
  ctx.restore();

  // Bottom Editorial Layout (adaptive for any ratio)
  const footerBottom = H - margin - 34;
  const qrSize = config.showQr ? (isCompact ? 78 : 88) : 0;
  const leftW = config.showQr ? innerW - qrSize - 24 : innerW;

  let bottomCursor = footerBottom;
  if (config.showProgress) {
    const magPal: Palette = { ...pal, text: '#ffffff', muted: '#e2e8f0', light: false };
    drawProgressBar(ctx, padX + 4, bottomCursor - 30, leftW - 8, song.duration, magPal, fonts.bodyFont);
    bottomCursor -= 54;
  }
  if (config.showWave) {
    const magPal: Palette = { ...pal, text: '#ffffff', muted: '#e2e8f0', light: false };
    drawWaveform(ctx, padX + 4, bottomCursor - 42, leftW - 8, 38, t, dynamic, magPal);
    bottomCursor -= 62;
  }
  if (config.showQr) {
    const magPal: Palette = { ...pal, text: '#ffffff', muted: '#e2e8f0', light: false };
    drawScannableQr(ctx, shareUrl, W - padX - qrSize - 4, footerBottom - qrSize - 10, qrSize, magPal);
  }

  // Pull-quote + Title anchored cleanly above bottomCursor
  ctx.save();
  const hasLyric = config.showLyric && config.lyric.trim().length > 0;
  const lyricSize = isCompact ? 22 : 25;
  const lyricLineH = Math.round(lyricSize * 1.45);
  ctx.font = `500 ${lyricSize}px ${fonts.bodyFont}`;
  const lyricLines = hasLyric
    ? measureWrappedLines(ctx, `“${config.lyric.trim()}”`, innerW - 12, 2)
    : [];

  let textY = bottomCursor - (hasLyric ? lyricLines.length * lyricLineH + 22 : 12);
  if (hasLyric) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'left';
    lyricLines.forEach((l, i) => {
      ctx.fillText(l, padX + 4, textY + i * lyricLineH);
    });
    textY -= 30;
  }

  // Artist pill
  ctx.font = `600 22px ${fonts.bodyFont}`;
  ctx.fillStyle = pal.accent;
  ctx.textAlign = 'left';
  ctx.fillText(`${song.artist} · ${song.album}`.slice(0, 32), padX + 4, textY);
  textY -= 22;

  // Headline Song Title
  const headlineSize = isCompact ? 46 : 54;
  const headlineLineH = Math.round(headlineSize * 1.15);
  ctx.font = `700 ${headlineSize}px ${fonts.titleFont}`;
  const tLines = measureWrappedLines(ctx, song.title, innerW - 8, 2);
  ctx.fillStyle = '#ffffff';
  const titleStartY = textY - (tLines.length - 1) * headlineLineH;
  tLines.forEach((l, i) => {
    ctx.fillText(l, padX + 4, titleStartY + i * headlineLineH);
  });
  ctx.restore();
}

function applyAtmosphereFinish(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  pal: Palette,
  dynamic: boolean,
  filmGrain: boolean
) {
  // Subtle floating dust / bokeh sparkles in dynamic mode
  if (dynamic) {
    ctx.save();
    for (let p = 0; p < 14; p++) {
      const px = (p * 97.3 + t * (10 + (p % 4) * 5)) % W;
      const py = (((p * 131.7 - t * (9 + (p % 3) * 4)) % H) + H) % H;
      ctx.beginPath();
      ctx.arc(px, py, 1.8 + (p % 3) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = pal.light ? 'rgba(120, 60, 40, 0.16)' : 'rgba(255, 255, 255, 0.22)';
      ctx.fill();
    }
    ctx.restore();
  }

  // Tactile Analog Film Grain
  if (filmGrain) {
    const pattern = getGrainPattern(ctx);
    if (pattern) {
      ctx.save();
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
