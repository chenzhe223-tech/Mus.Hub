import React from 'react';
import { CheckCircle2, Copy, Download, ExternalLink, Eye, Link2, X } from 'lucide-react';
import type { Song } from '../types';
import { copyToClipboard } from '../utils/share';

interface ShareModalProps {
  open: boolean;
  song: Song;
  lyric: string;
  previewImgUrl: string | null;
  videoBlobUrl: string | null;
  shareUrl: string;
  onClose: () => void;
  onSavePng: () => void;
  onPreviewLanding: () => void;
  showToast: (msg: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  song,
  lyric,
  previewImgUrl,
  videoBlobUrl,
  shareUrl,
  onClose,
  onSavePng,
  onPreviewLanding,
  showToast,
}) => {
  if (!open) return null;

  const caption = `正在循环《${song.title}》— ${song.artist}${
    lyric.trim() ? `。「${lyric.trim()}」` : ''
  } #音画唱片墙 #今日歌单`;

  const handleCopyCaption = async () => {
    await copyToClipboard(caption);
    showToast('已复制社交配文');
  };

  const handleCopyLink = async () => {
    await copyToClipboard(shareUrl);
    showToast('已复制专属唱片链接，好友打开即可听歌看海报');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        if (previewImgUrl && navigator.canShare) {
          const res = await fetch(previewImgUrl);
          const blob = await res.blob();
          const file = new File([blob], 'sonic-archive-poster.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: song.title, text: caption, files: [file] });
            showToast('已调起系统分享');
            return;
          }
        }
        await navigator.share({ title: song.title, text: caption, url: shareUrl });
        showToast('已调起系统分享');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopyCaption();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="hi-fi-stage rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-[var(--line-strong)] max-h-[92vh] overflow-y-auto custom-scroll">
        <div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-3">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[var(--ink-primary)]">
              递出一张唱片
            </h3>
            <p className="font-tech text-[10px] text-[var(--ink-muted)] tracking-widest mt-0.5">
              EXPORT &amp; SHARE CARD
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

        {videoBlobUrl ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--accent)] font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                有声动态海报已录制完成
              </span>
              <a
                href={videoBlobUrl}
                download={`sonic-archive-motion-${(song.title || 'video').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.webm`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition"
              >
                <Download className="w-3 h-3" />
                下载视频
              </a>
            </div>
            <video
              src={videoBlobUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full max-h-60 rounded-xl bg-black border border-[var(--line-subtle)]"
            />
          </div>
        ) : (
          previewImgUrl && (
            <div className="space-y-2">
              <div className="flex justify-center hi-fi-inset rounded-xl p-3">
                <img
                  src={previewImgUrl}
                  alt="长按保存高清海报"
                  style={{ WebkitTouchCallout: 'default', userSelect: 'auto' }}
                  className="max-h-72 rounded-lg shadow-xl max-w-full h-auto"
                />
              </div>
              <div className="text-center text-[11px] font-medium text-[var(--accent)]">
                手机端 / 微信用户：直接「长按上方海报图片」即可保存到相册
              </div>
            </div>
          )
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--ink-secondary)] flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              专属扫码落地页链接
            </span>
            <button
              type="button"
              onClick={onPreviewLanding}
              className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1 transition"
            >
              <Eye className="w-3 h-3" />
              预览好友视角
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 rounded-lg hi-fi-inset font-tech text-[11px] text-[var(--ink-secondary)] focus:outline-none truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] transition shrink-0"
            >
              复制
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[var(--ink-secondary)]">社交配文</span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={caption}
              className="flex-1 px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyCaption}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] transition shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              复制
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onSavePng}
            className="py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] hover:bg-[var(--btn-primary-hover)] text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            保存高清图片
          </button>
          <button
            type="button"
            onClick={handleNativeShare}
            className="py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            调用系统分享
          </button>
        </div>
      </div>
    </div>
  );
};
