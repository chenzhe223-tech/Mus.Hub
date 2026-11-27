import QRCode from 'qrcode';
import { withAlpha } from './color';
import type { Palette } from '../types';

const qrMatrixCache = new Map<string, { size: number; data: Uint8Array }>();

function getQrModules(text: string): { size: number; data: Uint8Array } | null {
  const key = text.slice(0, 512);
  const cached = qrMatrixCache.get(key);
  if (cached) return cached;

  try {
    const qr = QRCode.create(key, { errorCorrectionLevel: 'M' });
    const entry = { size: qr.modules.size, data: qr.modules.data };
    if (qrMatrixCache.size > 40) {
      const firstKey = qrMatrixCache.keys().next().value;
      if (firstKey) qrMatrixCache.delete(firstKey);
    }
    qrMatrixCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Draws a genuinely scannable, cleanly styled QR code onto the poster canvas.
 */
export function drawScannableQr(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  boxSize: number,
  pal: Palette
): void {
  const modules = getQrModules(text);
  ctx.save();

  // Crisp high-contrast quiet-zone card so mobile cameras scan effortlessly
  const radius = Math.max(10, boxSize * 0.13);
  ctx.beginPath();
  ctx.roundRect(x, y, boxSize, boxSize, radius);
  ctx.fillStyle = pal.light ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.strokeStyle = withAlpha(pal.accent, 0.35);
  ctx.lineWidth = 1.8;
  ctx.stroke();

  if (!modules) {
    ctx.restore();
    return;
  }

  const quietPad = Math.max(7, Math.round(boxSize * 0.095));
  const inner = boxSize - quietPad * 2;
  const count = modules.size;
  const cell = inner / count;

  ctx.fillStyle = '#0f172a';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (modules.data[row * count + col]) {
        const cx = x + quietPad + col * cell;
        const cy = y + quietPad + row * cell;
        ctx.fillRect(cx, cy, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
  ctx.restore();
}
