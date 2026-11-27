import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Copy,
  Disc3,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  X,
} from 'lucide-react';
import type { SocialPost, UserProfile } from '../types';
import { MOOD_TAGS, TEMPLATES } from '../data/curated';
import { generatePosterThumbnail } from '../utils/thumbnail';
import { PosterCanvas } from './PosterCanvas';
import { buildShareUrl, copyToClipboard } from '../utils/share';

interface SocialSquareViewProps {
  posts: SocialPost[];
  playingSongId: string | null;
  isPlaying: boolean;
  userProfile: UserProfile;
  onTogglePlayPost: (post: SocialPost) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onRemixStyle: (post: SocialPost) => void;
  onOpenLandingForPost: (post: SocialPost) => void;
  onGoToStudio: () => void;
  showToast: (msg: string) => void;
}

function formatRelativeTime(ts: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} 天前`;
}

export const SocialSquareView: React.FC<SocialSquareViewProps> = ({
  posts,
  playingSongId,
  isPlaying,
  userProfile,
  onTogglePlayPost,
  onToggleLike,
  onToggleSave,
  onAddComment,
  onRemixStyle,
  onOpenLandingForPost,
  onGoToStudio,
  showToast,
}) => {
  const [selectedTag, setSelectedTag] = useState('全部');
  const [query, setQuery] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [popId, setPopId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const missing = posts.filter((p) => !p.thumbnailUrl && !thumbs[p.id]);
    if (!missing.length) return;

    (async () => {
      for (const post of missing) {
        const dataUrl = await generatePosterThumbnail(
          post.song,
          post.config,
          post.palette,
          post.author.name
        );
        if (!alive) return;
        setThumbs((prev) => ({ ...prev, [post.id]: dataUrl }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [posts, thumbs]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const tagOk = selectedTag === '全部' || p.tags.includes(selectedTag);
      const q = query.trim().toLowerCase();
      const queryOk =
        !q ||
        `${p.song.title} ${p.song.artist} ${p.caption} ${p.author.name} ${p.tags.join(' ')}`
          .toLowerCase()
          .includes(q);
      return tagOk && queryOk;
    });
  }, [posts, selectedTag, query]);

  const activePost = useMemo(
    () => posts.find((p) => p.id === activePostId) || null,
    [posts, activePostId]
  );

  const triggerLike = (postId: string) => {
    setPopId(postId);
    onToggleLike(postId);
    window.setTimeout(() => setPopId((cur) => (cur === postId ? null : cur)), 360);
  };

  const handleSharePost = async (post: SocialPost) => {
    const url = buildShareUrl(post.song, post.config, post.author.name, post.caption);
    await copyToClipboard(url);
    showToast('已复制这张唱片海报的专属分享链接');
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost || !commentInput.trim()) return;
    onAddComment(activePost.id, commentInput.trim());
    setCommentInput('');
    showToast('乐评已发布');
  };

  return (
    <div className="space-y-6">
      {/* Editorial Record Wall Header */}
      <div className="hi-fi-stage rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-5 border-b border-[var(--line-subtle)]">
          <div className="space-y-1.5">
            <div className="font-tech text-[10px] tracking-[0.24em] text-[var(--accent)] uppercase">
              RECORD WALL · CURATED BY LISTENERS
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
              此刻正在旋转的唱片墙
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)]">
              听见同频的人，收藏你偏爱的纸感与色调，一键套用版式继续创作。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜曲目、乐迷、氛围..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)]"
              />
            </div>
            <button
              type="button"
              onClick={onGoToStudio}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-xs font-semibold text-[var(--btn-primary-ink)] transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              制作新海报
            </button>
          </div>
        </div>

        {/* Mood Category Rail */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {MOOD_TAGS.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-md text-xs transition shrink-0 border ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-medium'
                    : 'bg-transparent text-[var(--ink-secondary)] border-[var(--line-subtle)] hover:text-[var(--ink-primary)] hover:border-[var(--line-strong)]'
                }`}
              >
                {tag === '全部' ? '全部馆藏' : `# ${tag}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Record Store Wall Grid */}
      {filteredPosts.length === 0 ? (
        <div className="hi-fi-panel rounded-2xl py-16 text-center space-y-3">
          <div className="text-[var(--ink-secondary)] text-sm">暂时没有匹配这个分类的唱片海报</div>
          <button
            type="button"
            onClick={() => {
              setSelectedTag('全部');
              setQuery('');
            }}
            className="px-4 py-2 rounded-lg border border-[var(--line-strong)] text-xs text-[var(--accent)] hover:border-[var(--accent-border)] transition"
          >
            浏览全部馆藏
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, idx) => {
            const imgSrc = post.thumbnailUrl || thumbs[post.id] || post.song.cover;
            const isThisPlaying = isPlaying && playingSongId === post.song.id;
            const tplName = TEMPLATES.find((t) => t.id === post.config.template)?.name || '定制版式';

            return (
              <article
                key={post.id}
                className="group hi-fi-panel rounded-2xl overflow-hidden flex flex-col hover:border-[var(--accent-border)] transition duration-300"
              >
                {/* Catalog Header Strip */}
                <div className="px-4 py-2.5 border-b border-[var(--line-subtle)] flex items-center justify-between font-tech text-[10px] text-[var(--ink-muted)]">
                  <span>
                    NO.{String(idx + 1).padStart(2, '0')} · {tplName}
                  </span>
                  <span>{post.song.duration}</span>
                </div>

                {/* Framed Poster Exhibit */}
                <div
                  className="relative aspect-[3/4] bg-[var(--bg-inset)] overflow-hidden cursor-pointer"
                  onClick={() => setActivePostId(post.id)}
                >
                  <img
                    src={imgSrc}
                    alt={post.song.title}
                    className="w-full h-full object-cover group-hover:scale-[1.025] transition duration-700 ease-out"
                  />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/72 via-black/20 to-transparent" />

                  {/* Remix Pill */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemixStyle(post);
                    }}
                    className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#181512]/85 hover:bg-[#fffdf9] hover:text-[#181512] text-[#f5efe6] border border-white/20 backdrop-blur-sm transition"
                  >
                    <Copy className="w-3 h-3" />
                    做同款
                  </button>

                  {/* Turntable Play Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlayPost(post);
                    }}
                    className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-sm transition ${
                      isThisPlaying
                        ? 'bg-[var(--heart)] border-white/40 text-white'
                        : 'bg-[#181512]/82 hover:bg-[var(--accent)] border-white/25 text-white'
                    }`}
                    title={isThisPlaying ? '暂停' : '试听'}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                    )}
                  </button>

                  <div className="absolute bottom-3 left-3.5 right-16 min-w-0">
                    <div className="font-editorial text-sm font-semibold text-[#faf5ec] truncate drop-shadow">
                      《{post.song.title}》
                    </div>
                    <div className="text-[11px] text-[#e8dfd2]/90 truncate">{post.song.artist}</div>
                  </div>
                </div>

                {/* Editorial Note & Social Actions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <span className="text-xs font-medium text-[var(--ink-primary)] truncate">
                          {post.author.name}
                        </span>
                      </div>
                      <span className="font-tech text-[10px] text-[var(--ink-muted)] shrink-0">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>

                    <p
                      onClick={() => setActivePostId(post.id)}
                      className="text-xs text-[var(--ink-secondary)] leading-relaxed line-clamp-2 cursor-pointer hover:text-[var(--ink-primary)] transition"
                    >
                      {post.caption}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-[var(--ink-secondary)] bg-[var(--bg-inset)] px-2 py-0.5 rounded border border-[var(--line-subtle)]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Minimal Social Bar */}
                  <div className="pt-3 border-t border-[var(--line-subtle)] flex items-center justify-between text-xs text-[var(--ink-secondary)]">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => triggerLike(post.id)}
                        className={`inline-flex items-center gap-1.5 transition ${
                          post.likedByMe
                            ? 'text-[var(--heart)] font-medium'
                            : 'hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-current' : ''} ${
                            popId === post.id ? 'heart-pop' : ''
                          }`}
                        />
                        <span className="font-tech text-[11px]">{post.likes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePostId(post.id)}
                        className="inline-flex items-center gap-1.5 hover:text-[var(--ink-primary)] transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="font-tech text-[11px]">{post.comments.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleSave(post.id)}
                        className={`inline-flex items-center transition ${
                          post.savedByMe
                            ? 'text-[var(--accent)]'
                            : 'hover:text-[var(--ink-primary)]'
                        }`}
                        title={post.savedByMe ? '取消收藏' : '收入唱片架'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${post.savedByMe ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSharePost(post)}
                      className="inline-flex items-center gap-1 hover:text-[var(--ink-primary)] transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">分享</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Post Listening Room & Comment Modal */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePostId(null);
          }}
        >
          <div className="hi-fi-stage rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[var(--line-strong)] grid grid-cols-1 md:grid-cols-12">
            {/* Left Live Listening Stage */}
            <div className="md:col-span-6 bg-[var(--bg-inset)] p-4 sm:p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--line-subtle)]">
              <PosterCanvas
                song={activePost.song}
                config={{ ...activePost.config, mode: 'dynamic' }}
                palette={activePost.palette}
                shareUrl={buildShareUrl(
                  activePost.song,
                  activePost.config,
                  activePost.author.name,
                  activePost.caption
                )}
                isPlaying={isPlaying && playingSongId === activePost.song.id}
                className="max-h-[44vh] md:max-h-[68vh]"
              />
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onTogglePlayPost(activePost)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] hover:bg-[var(--btn-primary-hover)] text-xs font-semibold transition"
                >
                  {isPlaying && playingSongId === activePost.song.id ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isPlaying && playingSongId === activePost.song.id ? '暂停播放' : '播放唱片'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePostId(null);
                    onOpenLandingForPost(activePost);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-panel)] text-xs text-[var(--ink-primary)] hover:border-[var(--accent-border)] transition"
                >
                  全屏沉浸页
                </button>
              </div>
            </div>

            {/* Right Liner Notes & Comments */}
            <div className="md:col-span-6 flex flex-col max-h-[48vh] md:max-h-[90vh] bg-[var(--bg-panel)]">
              <div className="p-4 sm:p-5 border-b border-[var(--line-subtle)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={activePost.author.avatar}
                    alt={activePost.author.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                      {activePost.author.name}
                    </div>
                    <div className="font-tech text-[10px] text-[var(--ink-muted)] truncate">
                      {activePost.author.handle} · {formatRelativeTime(activePost.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePostId(null);
                      onRemixStyle(activePost);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-[var(--accent-ink)] transition"
                  >
                    <Copy className="w-3 h-3" />
                    做同款
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePostId(null)}
                    className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scroll p-4 sm:p-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-editorial text-base font-semibold text-[var(--accent)]">
                    <Disc3 className="w-4 h-4 shrink-0" />
                    <span>
                      《{activePost.song.title}》 — {activePost.song.artist}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--ink-primary)] leading-relaxed">
                    {activePost.caption}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activePost.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[11px] bg-[var(--bg-inset)] text-[var(--ink-secondary)] border border-[var(--line-subtle)]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--line-subtle)] space-y-3">
                  <div className="font-tech text-[10px] tracking-widest text-[var(--ink-muted)] uppercase">
                    LINER COMMENTS ({activePost.comments.length})
                  </div>
                  {activePost.comments.length === 0 ? (
                    <div className="text-xs text-[var(--ink-muted)] py-5 text-center">
                      还没有留言，写下你听到这首歌的第一印象。
                    </div>
                  ) : (
                    activePost.comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2.5">
                        <img
                          src={c.avatar}
                          alt={c.author}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div className="flex-1 bg-[var(--bg-inset)] rounded-xl px-3.5 py-2.5 border border-[var(--line-subtle)]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-[var(--ink-primary)]">
                              {c.author}
                            </span>
                            <span className="font-tech text-[10px] text-[var(--ink-muted)]">
                              {formatRelativeTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--ink-secondary)] mt-1 leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[var(--line-subtle)] bg-[var(--bg-inset)] space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--ink-secondary)]">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => triggerLike(activePost.id)}
                      className={`inline-flex items-center gap-1.5 ${
                        activePost.likedByMe
                          ? 'text-[var(--heart)] font-medium'
                          : 'hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${activePost.likedByMe ? 'fill-current' : ''}`} />
                      <span className="font-tech">{activePost.likes}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSave(activePost.id)}
                      className={`inline-flex items-center gap-1.5 ${
                        activePost.savedByMe
                          ? 'text-[var(--accent)] font-medium'
                          : 'hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${activePost.savedByMe ? 'fill-current' : ''}`}
                      />
                      <span>{activePost.savedByMe ? '已收藏' : '收藏'}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSharePost(activePost)}
                    className="inline-flex items-center gap-1 hover:text-[var(--ink-primary)]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    复制链接
                  </button>
                </div>

                <form onSubmit={handleSubmitComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={`以「${userProfile.name}」写一句共鸣...`}
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)]"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-ink)] text-xs font-semibold transition disabled:opacity-40 flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    发送
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
