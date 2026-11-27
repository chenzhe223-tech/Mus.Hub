/**
 * Token-aware text wrapping for Canvas 2D:
 * Keeps ASCII/Latin words intact (never breaks "ARCHIVE" into "ARCHIV" + "E")
 * while still allowing natural per-character wrapping for CJK text.
 */

export function tokenizeForWrap(text: string): string[] {
  if (!text) return [];
  const tokens: string[] = [];
  // Group contiguous ASCII word characters (+ optional trailing space) together,
  // while keeping CJK characters and standalone punctuation individually wrappable.
  const regex = /[A-Za-z0-9._'-]+ ?|[^\S\r\n]+|./gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

export function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  if (!text || maxLines <= 0) return [];
  const tokens = tokenizeForWrap(text);
  const lines: string[] = [];
  let current = '';

  const pushLine = (raw: string) => {
    lines.push(raw.trimEnd());
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '\n' || tok === '\r') {
      pushLine(current);
      current = '';
      if (lines.length >= maxLines) break;
      continue;
    }

    const candidate = current.length === 0 ? tok.replace(/^\s+/, '') : current + tok;
    if (!candidate) continue;

    if (ctx.measureText(candidate.trimEnd()).width > maxWidth && current.trim().length > 0) {
      pushLine(current);
      if (lines.length >= maxLines) {
        current = '';
        break;
      }
      current = tok.replace(/^\s+/, '');
      // If a single long ASCII token itself exceeds maxWidth, split it gracefully as last resort
      if (ctx.measureText(current.trimEnd()).width > maxWidth && current.length > 1) {
        let partial = '';
        for (const ch of Array.from(current)) {
          if (ctx.measureText(partial + ch).width > maxWidth && partial.length > 0) {
            pushLine(partial);
            partial = ch;
            if (lines.length >= maxLines) break;
          } else {
            partial += ch;
          }
        }
        current = lines.length >= maxLines ? '' : partial;
        if (lines.length >= maxLines) break;
      }
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 0 && lines.length < maxLines) {
    pushLine(current);
  }

  // Ellipsis truncation only if text actually overflowed maxLines
  const normalizedIn = text.replace(/\s+/g, '');
  const normalizedOut = lines.join('').replace(/\s+/g, '');
  if (lines.length === maxLines && normalizedOut.length < normalizedIn.length) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last.trimEnd() + '…';
  }

  return lines;
}

export function fitSingleLineFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxPx: number,
  minPx: number,
  weight: string | number,
  fontFamily: string
): number {
  let size = maxPx;
  while (size > minPx) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 1;
  }
  ctx.font = `${weight} ${minPx}px ${fontFamily}`;
  return minPx;
}
