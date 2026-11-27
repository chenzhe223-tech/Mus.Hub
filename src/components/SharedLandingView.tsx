import React, { useState } from 'react';
import { ArrowLeft, Copy, ExternalLink, Headphones, Heart, Pause, Play, Share2 } from 'lucide-react';
import type { Palette, PosterConfig, Song } from '../types';
import { PosterCanvas } from './PosterCanvas';
import { withAlpha } from '../utils/color';
import { buildShareUrl, copyToClipboard } from '../utils/share';
import { ensureExternalLinks } from '../utils/musicSearch';

interface SharedLandingViewProps {
  song: Song;
  config: PosterConfig;
  palette: Palette;
  authorName: string;
  caption: string;
  isPlaying: boolean;
  onToggleAudio: () => void;
  onRemixInStudio: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const SharedLandingView: React.FC<SharedLandingViewProps> = ({
  song,
  config,
  palette,
  authorName,
  caption,
  isPlaying,
  onToggleAudio,
  onRemixInStudio,
  onClose,
  showToast,
}) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(99);
  const shareUrl = buildShareUrl(song, config, authorName, caption);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-canvas)] studio-grain overflow-y-auto custom-scroll">
      <div
        className="pointer-events-none fixed inset-0 opacity-45 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 28%, ${withAlpha(
            palette.accent,
            0.24
          )}, transparent 68%)`,
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center space-y-6">
        {/* Top Bar */}
        <div className="w-full flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-panel)] hover:border-[var(--line-strong)] text-xs text-[var(--ink-primary)] border border-[var(--line-subtle)] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回音画
          </button>

          <button
            type="button"
            onClick={async () => {
              await copyToClipboard(shareUrl);
              showToast('已复制这张唱片分享页链接');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-panel)] hover:border-[var(--accent-border)] text-xs text-[var(--ink-primary)] border border-[var(--line-subtle)] transition"
          >
            <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            转发给好友
          </button>
        </div>

        {/* Sender Note */}
        <div className="text-center space-y-1.5">
          <div className="font-tech text-[10px] tracking-[0.22em] text-[var(--accent)] uppercase">
            FROM {authorName} · SONIC DISPATCH
          </div>
          <p className="font-editorial text-sm sm:text-base text-[var(--ink-primary)] max-w-md mx-auto">
            “{caption}”
          </p>
        </div>

        {/* Live Poster Exhibit */}
        <div className="w-full flex justify-center">
          <PosterCanvas
            song={song}
            config={{ ...config, mode: 'dynamic' }}
            palette={palette}
            shareUrl={shareUrl}
            isPlaying={isPlaying}
            className="max-h-[60vh]"
          />
        </div>

        {/* Listening Deck */}
        <div className="w-full hi-fi-stage rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleAudio}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] hover:bg-[var(--btn-primary-hover)] text-xs font-semibold transition"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? '暂停播放' : '点击听歌'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLiked((v) => !v);
                setLikes((n) => (liked ? n - 1 : n + 1));
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-xs font-medium transition ${
                liked
                  ? 'bg-[var(--heart)]/12 border-[var(--heart)]/55 text-[var(--heart)]'
                  : 'bg-[var(--bg-inset)] border-[var(--line-subtle)] text-[var(--ink-primary)] hover:border-[var(--line-strong)]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current heart-pop' : ''}`} />
              <span className="font-tech">{likes}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onRemixInStudio}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-[var(--accent-ink)] transition"
          >
            <Copy className="w-3.5 h-3.5" />
            制作同款海报
          </button>
        </div>

        {/* External Full-Song Links */}
        {!song.isAiOriginal && (
          <div className="w-full hi-fi-panel rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-secondary)]">
              <Headphones className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>跳转到外部音乐平台继续听《{song.title}》完整版</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(() => {
                const ext = ensureExternalLinks(song);
                return [
                  { label: '网易云音乐', href: ext.netease },
                  { label: 'QQ 音乐', href: ext.qq },
                  { label: 'Apple Music', href: ext.apple },
                  { label: 'Spotify', href: ext.spotify },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] transition"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="w-3 h-3 text-[var(--ink-muted)]" />
                  </a>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
