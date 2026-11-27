import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import type { Song } from '../types';
import { MOOD_TAGS } from '../data/curated';

interface PublishModalProps {
  open: boolean;
  song: Song;
  previewUrl: string | null;
  defaultCaption: string;
  onClose: () => void;
  onConfirmPublish: (caption: string, tags: string[]) => void;
}

const SELECTABLE_TAGS = MOOD_TAGS.filter((t) => t !== '全部');

export const PublishModal: React.FC<PublishModalProps> = ({
  open,
  song,
  previewUrl,
  defaultCaption,
  onClose,
  onConfirmPublish,
}) => {
  const [caption, setCaption] = useState(defaultCaption);
  const [selectedTags, setSelectedTags] = useState<string[]>(['深夜循环']);

  React.useEffect(() => {
    if (open) {
      setCaption(defaultCaption);
    }
  }, [open, defaultCaption]);

  if (!open) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return [...prev.slice(1), tag];
      return [...prev, tag];
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hi-fi-stage rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[var(--line-strong)]">
        <div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-3.5">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[var(--ink-primary)]">
              上架至唱片墙
            </h3>
            <p className="font-tech text-[10px] text-[var(--ink-muted)] tracking-widest mt-0.5">
              PUBLISH TO SONIC WALL
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 hi-fi-inset rounded-xl p-3">
          <img
            src={previewUrl || song.cover}
            alt={song.title}
            className="w-18 h-24 rounded-lg object-cover shadow-md shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-editorial text-base font-semibold text-[var(--ink-primary)] truncate">
              《{song.title}》
            </div>
            <div className="text-xs text-[var(--ink-secondary)] truncate mt-0.5">
              {song.artist} · {song.album}
            </div>
            <p className="text-[11px] text-[var(--accent)] mt-2">
              乐迷可在线试听、收藏点评，并一键套用你的版式色调。
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--ink-secondary)]">唱片附记</label>
          <textarea
            rows={3}
            maxLength={140}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="写下听这首歌时的窗外天气、耳机里的画面..."
            className="w-full px-3.5 py-2.5 rounded-lg hi-fi-inset text-xs sm:text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--ink-secondary)]">氛围分类（最多 3 个）</span>
            <span className="font-tech text-[10px] text-[var(--ink-muted)]">
              {selectedTags.length} / 3
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SELECTABLE_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-medium'
                      : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-[var(--line-subtle)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  # {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-[var(--line-subtle)] text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmPublish(
                caption.trim() || `今晚正在循环《${song.title}》，留一张唱片海报。`,
                selectedTags.length > 0 ? selectedTags : ['深夜循环']
              );
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-[var(--accent-ink)] transition"
          >
            <Send className="w-3.5 h-3.5" />
            确认上架
          </button>
        </div>
      </div>
    </div>
  );
};
