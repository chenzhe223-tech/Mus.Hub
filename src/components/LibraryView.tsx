import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Edit3,
  FileImage,
  Heart,
  Plus,
  Trash2,
} from 'lucide-react';
import type { DraftItem, SocialPost, UserProfile } from '../types';

interface LibraryViewProps {
  profile: UserProfile;
  posts: SocialPost[];
  drafts: DraftItem[];
  onUpdateProfile: (profile: UserProfile) => void;
  onLoadDraft: (draft: DraftItem) => void;
  onDeleteDraft: (id: string) => void;
  onDeletePost: (id: string) => void;
  onRemixPost: (post: SocialPost) => void;
  onGoToStudio: () => void;
}

type LibSubTab = 'mine' | 'saved' | 'drafts';

export const LibraryView: React.FC<LibraryViewProps> = ({
  profile,
  posts,
  drafts,
  onUpdateProfile,
  onLoadDraft,
  onDeleteDraft,
  onDeletePost,
  onRemixPost,
  onGoToStudio,
}) => {
  const [tab, setTab] = useState<LibSubTab>('mine');
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [bioInput, setBioInput] = useState(profile.bio);

  const myPosts = posts.filter((p) => p.isMine);
  const savedPosts = posts.filter((p) => p.savedByMe);
  const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);

  const handleSaveProfile = () => {
    const nextName = nameInput.trim() || profile.name;
    onUpdateProfile({
      ...profile,
      name: nextName,
      bio: bioInput.trim() || profile.bio,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Collector Profile Header */}
      <div className="hi-fi-stage rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-[var(--accent-border)] shrink-0"
          />
          <div className="space-y-1.5 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameInput}
                  maxLength={18}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-1.5 rounded-lg hi-fi-inset text-sm font-medium text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
                />
                <input
                  type="text"
                  value={bioInput}
                  maxLength={50}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="block w-full sm:w-72 px-3 py-1.5 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
                />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2.5">
                  <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[var(--ink-primary)] truncate">
                    {profile.name}
                  </h2>
                  <span className="font-tech text-[11px] text-[var(--ink-muted)]">
                    {profile.handle}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--ink-secondary)]">{profile.bio}</p>
              </>
            )}

            <div className="flex items-center gap-6 pt-1 font-tech text-xs text-[var(--ink-secondary)]">
              <span>
                <strong className="text-[var(--ink-primary)] mr-1">{myPosts.length}</strong>上架
              </span>
              <span>
                <strong className="text-[var(--ink-primary)] mr-1">{savedPosts.length}</strong>收藏
              </span>
              <span>
                <strong className="text-[var(--ink-primary)] mr-1">{drafts.length}</strong>草稿
              </span>
              <span>
                <strong className="text-[var(--accent)] mr-1">{totalLikes}</strong>获赞
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5" />
              保存
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameInput(profile.name);
                setBioInput(profile.bio);
                setEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line-subtle)] bg-[var(--bg-panel)] hover:border-[var(--line-strong)] text-xs text-[var(--ink-primary)] transition"
            >
              <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
              编辑档案
            </button>
          )}
          <button
            type="button"
            onClick={onGoToStudio}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-semibold text-[var(--accent-ink)] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            新建唱片海报
          </button>
        </div>
      </div>

      {/* Architectural Sub-tabs */}
      <div className="flex items-center gap-6 border-b border-[var(--line-subtle)]">
        {[
          { id: 'mine' as const, label: `我上架的 (${myPosts.length})` },
          { id: 'saved' as const, label: `收藏灵感 (${savedPosts.length})`, icon: Bookmark },
          { id: 'drafts' as const, label: `草稿箱 (${drafts.length})`, icon: FileImage },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative pb-3 text-xs sm:text-sm transition ${
                active
                  ? 'text-[var(--ink-primary)] font-semibold'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              {item.label}
              {active && <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--accent)]" />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'mine' &&
        (myPosts.length === 0 ? (
          <EmptyState
            title="唱片架还没有你的作品"
            desc="去「制片室」压制一张唱片海报，上架到唱片墙与同频乐迷分享。"
            cta="前往制片室"
            onCta={onGoToStudio}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myPosts.map((post) => (
              <div key={post.id} className="hi-fi-panel rounded-2xl overflow-hidden">
                <div className="aspect-[3/4] bg-[var(--bg-inset)] overflow-hidden">
                  <img
                    src={post.thumbnailUrl || post.song.cover}
                    alt={post.song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-editorial text-sm font-semibold text-[var(--ink-primary)] truncate">
                      《{post.song.title}》
                    </div>
                    <div className="font-tech text-[11px] text-[var(--ink-secondary)] flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3 text-[var(--heart)]" /> {post.likes}
                      </span>
                      <span className="truncate">{post.tags.map((t) => `#${t}`).join(' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRemixPost(post)}
                      className="p-2 rounded-lg border border-[var(--line-subtle)] hover:border-[var(--accent-border)] text-[var(--ink-primary)] transition"
                      title="重新编辑"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePost(post.id)}
                      className="p-2 rounded-lg border border-[var(--heart)]/35 hover:bg-[var(--heart)]/12 text-[var(--heart)] transition"
                      title="下架删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === 'saved' &&
        (savedPosts.length === 0 ? (
          <EmptyState
            title="还没有收藏任何唱片海报"
            desc="在「唱片墙」遇到喜欢的构图或色调，点击书签即可收入这里。"
            cta="前往制片室"
            onCta={onGoToStudio}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedPosts.map((post) => (
              <div key={post.id} className="hi-fi-panel rounded-2xl overflow-hidden">
                <div className="aspect-[3/4] bg-[var(--bg-inset)] overflow-hidden">
                  <img
                    src={post.thumbnailUrl || post.song.cover}
                    alt={post.song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-editorial text-sm font-semibold text-[var(--ink-primary)] truncate">
                      《{post.song.title}》
                    </div>
                    <div className="text-[11px] text-[var(--ink-secondary)] truncate">
                      by {post.author.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemixPost(post)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] text-xs font-medium transition shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    做同款
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === 'drafts' &&
        (drafts.length === 0 ? (
          <EmptyState
            title="草稿箱是空的"
            desc="在「制片室」点击「存草稿」，随时保留你调好的版式与配色。"
            cta="去创作海报"
            onCta={onGoToStudio}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((d) => (
              <div key={d.id} className="hi-fi-panel rounded-2xl overflow-hidden">
                <div className="aspect-[3/4] bg-[var(--bg-inset)] overflow-hidden">
                  <img
                    src={d.thumbnailUrl || d.song.cover}
                    alt={d.song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-editorial text-sm font-semibold text-[var(--ink-primary)] truncate">
                      《{d.song.title}》
                    </div>
                    <div className="text-[11px] text-[var(--ink-secondary)] truncate">
                      {d.song.artist}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadDraft(d)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] text-xs font-semibold transition"
                    >
                      继续调校
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(d.id)}
                      className="p-2 rounded-lg border border-[var(--heart)]/35 hover:bg-[var(--heart)]/12 text-[var(--heart)] transition"
                      title="删除草稿"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};

const EmptyState: React.FC<{
  title: string;
  desc: string;
  cta: string;
  onCta: () => void;
}> = ({ title, desc, cta, onCta }) => (
  <div className="hi-fi-panel rounded-2xl py-16 px-6 text-center space-y-3">
    <div className="font-editorial text-lg font-semibold text-[var(--ink-primary)]">{title}</div>
    <p className="text-xs sm:text-sm text-[var(--ink-secondary)] max-w-md mx-auto">{desc}</p>
    <div className="pt-2">
      <button
        type="button"
        onClick={onCta}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-xs font-semibold text-[var(--btn-primary-ink)] transition"
      >
        <Plus className="w-3.5 h-3.5" />
        {cta}
      </button>
    </div>
  </div>
);
