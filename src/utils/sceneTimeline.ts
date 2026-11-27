import type { ProductionMode } from '../types';

export interface SceneWindowSpec {
  code: string;
  label: string;
  startRatio: number;
  endRatio: number;
}

export interface ScenePlaybackMetadata {
  sceneIndex: number;
  sceneCode: string;
  sceneLabel: string;
  /** Progress inside the active scene [0..1] */
  localProgress: number;
  /** Overall timeline progress [0..1] */
  globalProgress: number;
  scenes: SceneWindowSpec[];
}

export const LYRIC_MV_SCENES: SceneWindowSpec[] = [
  { code: 'S1', label: '封面舞台', startRatio: 0.0, endRatio: 0.36 },
  { code: 'S2', label: '歌词卡点', startRatio: 0.32, endRatio: 0.65 },
  { code: 'S3', label: '品牌律动', startRatio: 0.61, endRatio: 0.83 },
  { code: 'S4', label: '唱片定格', startRatio: 0.79, endRatio: 1.0 },
];

export const PROMO_SCENES: SceneWindowSpec[] = [
  { code: 'S1', label: '封面开场', startRatio: 0.0, endRatio: 0.27 },
  { code: 'S2', label: '版式演绎', startRatio: 0.23, endRatio: 0.56 },
  { code: 'S3', label: '乐句声波', startRatio: 0.52, endRatio: 0.81 },
  { code: 'S4', label: '扫码同款', startRatio: 0.77, endRatio: 1.0 },
];

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function easeOutBack(t: number, overshoot = 1.45): number {
  const x = clamp01(t);
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}

export function getSceneSpecs(mode: ProductionMode): SceneWindowSpec[] {
  if (mode === 'promo') return PROMO_SCENES;
  if (mode === 'lyric-mv') return LYRIC_MV_SCENES;
  return [{ code: 'S1', label: '动态海报', startRatio: 0, endRatio: 1 }];
}

/**
 * Computes normalized cross-fade opacity [0..1] for a given scene window,
 * guaranteeing smooth overlap transitions with zero blank frames.
 */
export function computeSceneAlpha(
  globalProgress: number,
  win: SceneWindowSpec,
  isFirst: boolean,
  isLast: boolean
): number {
  const p = clamp01(globalProgress);
  if (p < win.startRatio || p > win.endRatio) return 0;
  const fadeSpan = Math.min(0.04, (win.endRatio - win.startRatio) * 0.25);

  let alpha = 1;
  if (!isFirst && p < win.startRatio + fadeSpan) {
    alpha = Math.min(alpha, easeInOutSine((p - win.startRatio) / Math.max(0.0001, fadeSpan)));
  }
  if (!isLast && p > win.endRatio - fadeSpan) {
    alpha = Math.min(alpha, easeInOutSine((win.endRatio - p) / Math.max(0.0001, fadeSpan)));
  }
  return clamp01(alpha);
}

export function getSceneMetadata(
  mode: ProductionMode,
  tSec: number,
  durationSec: number
): ScenePlaybackMetadata {
  const safeDur = Math.max(1, Number.isFinite(durationSec) ? durationSec : 6);
  const safeT = Math.max(0, Number.isFinite(tSec) ? tSec : 0);
  const globalProgress = clamp01(safeT / safeDur);
  const scenes = getSceneSpecs(mode);

  // Pick the latest scene whose midpoint/start has been reached cleanly
  let activeIdx = 0;
  for (let i = 0; i < scenes.length; i++) {
    const midEnter = i === 0 ? 0 : scenes[i].startRatio + 0.015;
    if (globalProgress >= midEnter) {
      activeIdx = i;
    }
  }

  const active = scenes[activeIdx] || scenes[0];
  const span = Math.max(0.001, active.endRatio - active.startRatio);
  const localProgress = clamp01((globalProgress - active.startRatio) / span);

  return {
    sceneIndex: activeIdx,
    sceneCode: active.code,
    sceneLabel: active.label,
    localProgress,
    globalProgress,
    scenes,
  };
}
