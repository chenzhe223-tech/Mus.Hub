import React from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { ProductionMode } from '../types';
import { getSceneMetadata } from '../utils/sceneTimeline';

interface TimelineInspectorBarProps {
  mode: Exclude<ProductionMode, 'poster'>;
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  playbackRate: number;
  disabled?: boolean;
  onTogglePlay: () => void;
  onSeek: (tSec: number) => void;
  onStepFrame: (deltaFrames: number) => void;
  onChangeRate: (rate: number) => void;
}

const RATES = [0.25, 0.5, 1] as const;

export const TimelineInspectorBar: React.FC<TimelineInspectorBarProps> = ({
  mode,
  currentTimeSec,
  durationSec,
  isPlaying,
  playbackRate,
  disabled = false,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onChangeRate,
}) => {
  const meta = getSceneMetadata(mode, currentTimeSec, durationSec);
  const fps = 30;
  const frameIndex = Math.min(Math.round(durationSec * fps), Math.round(currentTimeSec * fps));

  return (
    <div className="relative z-10 mt-3 rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-inset)]/90 px-3.5 py-3 space-y-2.5">
      {/* Top Row: Scene Status + Frame/Time Readout + Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[var(--accent-soft)] border border-[var(--accent-border)] font-tech text-[10px] font-semibold text-[var(--accent)]">
            {meta.sceneCode} · {meta.sceneLabel}
          </span>
          <span className="font-tech text-[11px] text-[var(--ink-primary)] tabular-nums">
            {currentTimeSec.toFixed(2)}s / {durationSec.toFixed(2)}s
          </span>
          <span className="font-tech text-[10px] text-[var(--ink-muted)] hidden sm:inline tabular-nums">
            F{String(frameIndex).padStart(3, '0')}
          </span>
        </div>

        {/* Speed Selector (for checking transitions in slow-mo) */}
        <div className="flex items-center gap-1">
          <span className="font-tech text-[9px] text-[var(--ink-muted)] mr-1 hidden sm:inline">
            倍速监看
          </span>
          {RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              disabled={disabled}
              onClick={() => onChangeRate(rate)}
              className={`px-1.5 py-0.5 rounded font-tech text-[10px] border transition ${
                playbackRate === rate
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                  : 'bg-[var(--bg-panel)] border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Middle Row: Scrubbing Slider + 4-Scene Transition Marker Ticks */}
      <div className="space-y-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={durationSec}
            step={1 / 30}
            value={Math.min(durationSec, Math.max(0, currentTimeSec))}
            disabled={disabled}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="多镜头时间轴进度"
            className="w-full h-1.5 accent-[var(--accent)] cursor-pointer"
          />
        </div>
        <div className="relative h-5 w-full">
          {meta.scenes.map((sc, idx) => {
            const leftPct = Math.round(sc.startRatio * 100);
            const active = idx === meta.sceneIndex;
            return (
              <button
                key={sc.code}
                type="button"
                disabled={disabled}
                onClick={() => onSeek(sc.startRatio * durationSec + 0.05)}
                style={{ left: `${leftPct}%` }}
                className={`absolute top-0 text-[9px] font-tech flex items-center gap-1 transition ${
                  active
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
                title={`跳转至 ${sc.code} ${sc.label} (${(sc.startRatio * durationSec).toFixed(2)}s)`}
              >
                <span className="w-px h-2 bg-current inline-block" />
                <span>
                  {sc.code} {sc.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Transport & Single-Frame Stepper */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle)]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-[11px] text-[var(--ink-primary)] transition"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-[var(--heart)]" />
                <span>暂停监看</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-[var(--accent)]" />
                <span>播放监看</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition"
            title="回到第 0 帧"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onStepFrame(-1)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] font-tech text-[10px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition"
            title="后退 1 帧 (1/30s)"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>-1F</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onStepFrame(1)}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] font-tech text-[10px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition"
            title="前进 1 帧 (1/30s)"
          >
            <span>+1F</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
