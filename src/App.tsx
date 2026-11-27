import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Disc3, Library, Moon, Radio, SlidersHorizontal, Sun } from 'lucide-react';
import type {
  AppTab,
  DraftItem,
  Palette,
  PosterConfig,
  SocialPost,
  Song,
  UiTheme,
  UserProfile,
} from './types';
import { CURATED_SONGS, PRESET_PALETTES } from './data/curated';
import { audioEngine } from './utils/audioEngine';
import { buildShareUrl, parseShareHash } from './utils/share';
import {
  loadDrafts,
  loadPosts,
  loadProfile,
  loadTheme,
  saveDrafts,
  savePosts,
  saveProfile,
  saveTheme,
} from './utils/storage';
import { StudioView } from './components/StudioView';
import { SocialSquareView } from './components/SocialSquareView';
import { LibraryView } from './components/LibraryView';
import { PublishModal } from './components/PublishModal';
import { ShareModal } from './components/ShareModal';
import { SharedLandingView } from './components/SharedLandingView';

const DEFAULT_CONFIG: PosterConfig = {
  mode: 'dynamic',
  template: 'vinyl',
  ratio: '3:4',
  paletteKey: 'auto',
  fontStyle: 'serif',
  lyric: CURATED_SONGS[0].lyric,
  showLyric: true,
  showWave: true,
  showProgress: true,
  showQr: true,
  filmGrain: true,
};

export default function App() {
  const [theme, setTheme] = useState<UiTheme>(() => loadTheme());
  const [activeTab, setActiveTab] = useState<AppTab>('studio');
  const [songs, setSongs] = useState<Song[]>(CURATED_SONGS);
  const [selectedSong, setSelectedSong] = useState<Song>(CURATED_SONGS[0]);
  const [config, setConfig] = useState<PosterConfig>(DEFAULT_CONFIG);
  const [extractedPalette, setExtractedPalette] = useState<Palette>(
    CURATED_SONGS[0].palette || PRESET_PALETTES.midnight
  );

  const [posts, setPosts] = useState<SocialPost[]>(() => loadPosts());
  const [drafts, setDrafts] = useState<DraftItem[]>(() => loadDrafts());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  const [publishModal, setPublishModal] = useState<{ open: boolean; previewUrl: string | null }>({
    open: false,
    previewUrl: null,
  });
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    previewImgUrl: string | null;
    videoBlobUrl: string | null;
  }>({
    open: false,
    previewImgUrl: null,
    videoBlobUrl: null,
  });
  const [landingData, setLandingData] = useState<{
    song: Song;
    config: PosterConfig;
    palette: Palette;
    authorName: string;
    caption: string;
  } | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  // Apply theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const sync = () => {
      setIsPlaying(audioEngine.isPlaying());
      setPlayingSongId(audioEngine.getCurrentSongId());
    };
    sync();
    return audioEngine.subscribe(sync);
  }, []);

  useEffect(() => {
    const parsed = parseShareHash(window.location.hash);
    if (parsed) {
      setLandingData({
        song: parsed.song,
        config: parsed.config,
        palette:
          parsed.config.paletteKey === 'auto'
            ? parsed.palette || PRESET_PALETTES.midnight
            : PRESET_PALETTES[parsed.config.paletteKey],
        authorName: parsed.authorName,
        caption: parsed.caption,
      });
    }
  }, []);

  useEffect(() => savePosts(posts), [posts]);
  useEffect(() => saveDrafts(drafts), [drafts]);
  useEffect(() => saveProfile(profile), [profile]);

  const activePalette = useMemo<Palette>(() => {
    if (config.paletteKey === 'auto') {
      return extractedPalette || selectedSong.palette || PRESET_PALETTES.midnight;
    }
    return PRESET_PALETTES[config.paletteKey] || PRESET_PALETTES.midnight;
  }, [config.paletteKey, extractedPalette, selectedSong.palette]);

  const studioShareUrl = useMemo(
    () => buildShareUrl(selectedSong, config, profile.name),
    [selectedSong, config, profile.name]
  );

  const handleToggleTheme = (next: UiTheme) => {
    if (next === theme) return;
    setTheme(next);
    showToast(next === 'light' ? '已切换至「日光唱片」明亮模式' : '已切换至「黑胶暗房」深色模式');
  };

  const handleSelectSong = (nextSong: Song) => {
    audioEngine.stop();
    setSelectedSong(nextSong);
    setConfig((prev) => ({
      ...prev,
      lyric: nextSong.lyric || `正在单曲循环《${nextSong.title}》，把这段旋律留给你。`,
    }));
    if (nextSong.palette) {
      setExtractedPalette(nextSong.palette);
    }
  };

  const handleUpdateSongMeta = (patch: Partial<Song>) => {
    setSelectedSong((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateConfig = (patch: Partial<PosterConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveDraft = (pngUrl: string | null) => {
    const nextDraft: DraftItem = {
      id: `draft-${Date.now()}`,
      song: selectedSong,
      config,
      thumbnailUrl: pngUrl || selectedSong.cover,
      savedAt: Date.now(),
    };
    setDrafts((prev) => [nextDraft, ...prev]);
    showToast('已归档至「我的唱片架 · 草稿」');
  };

  const handlePublishConfirm = (caption: string, tags: string[]) => {
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author: {
        name: profile.name,
        handle: profile.handle,
        avatar: profile.avatar,
        bio: profile.bio,
      },
      song: selectedSong,
      config: { ...config },
      palette: activePalette,
      caption,
      tags,
      thumbnailUrl: publishModal.previewUrl || selectedSong.cover,
      likes: 1,
      likedByMe: true,
      savedByMe: false,
      comments: [],
      createdAt: Date.now(),
      isMine: true,
    };

    setPosts((prev) => [newPost, ...prev]);
    setPublishModal({ open: false, previewUrl: null });
    setActiveTab('square');
    showToast('唱片海报已上架至「唱片墙」');
  };

  const handleToggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likes: p.likedByMe ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p
      )
    );
  };

  const handleToggleSave = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextSaved = !p.savedByMe;
        showToast(nextSaved ? '已收入「我的唱片架」' : '已移出收藏');
        return { ...p, savedByMe: nextSaved };
      })
    );
  };

  const handleAddComment = (postId: string, content: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c-${Date.now()}`,
                  author: profile.name,
                  avatar: profile.avatar,
                  content,
                  createdAt: Date.now(),
                },
              ],
            }
          : p
      )
    );
  };

  const handleRemixStyle = (post: SocialPost) => {
    audioEngine.stop();
    setSelectedSong(post.song);
    setConfig({ ...post.config });
    setExtractedPalette(post.palette);
    setActiveTab('studio');
    showToast(`已载入「${post.author.name}」的同款版式与色调`);
  };

  const handleLoadDraft = (draft: DraftItem) => {
    audioEngine.stop();
    setSelectedSong(draft.song);
    setConfig(draft.config);
    if (draft.song.palette) setExtractedPalette(draft.song.palette);
    setActiveTab('studio');
    showToast(`已恢复草稿《${draft.song.title}》`);
  };

  const handleDownloadFromShareModal = () => {
    if (!shareModal.previewImgUrl) {
      showToast('当前外部封面受跨域限制，请上传本地封面图后导出');
      return;
    }
    const a = document.createElement('a');
    a.href = shareModal.previewImgUrl;
    a.download = `sonic-archive-${selectedSong.title.replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('高清印刷版 PNG 已开始下载');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] studio-grain text-[var(--ink-primary)] pb-20 md:pb-8 transition-colors duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--line-subtle)] bg-[var(--bg-header)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-7 h-16 flex items-center justify-between gap-3">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className="flex items-center gap-3 text-left group shrink-0"
          >
            <div className="w-9 h-9 rounded-full border border-[var(--accent-border)] bg-[var(--bg-panel)] flex items-center justify-center relative">
              <Disc3
                className={`w-5 h-5 text-[var(--accent)] ${
                  isPlaying
                    ? 'animate-spin'
                    : 'group-hover:rotate-45 transition-transform duration-500'
                }`}
                style={{ animationDuration: '5s' }}
              />
              <span
                className={`w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-0.5 ${
                  isPlaying ? 'bg-[var(--heart)]' : 'bg-[var(--ink-muted)]'
                }`}
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-lg font-semibold tracking-wide text-[var(--ink-primary)]">
                  音画
                </span>
                <span className="font-tech text-[10px] tracking-[0.22em] text-[var(--ink-secondary)] uppercase hidden sm:inline">
                  SONIC ARCHIVE
                </span>
              </div>
              <div className="font-tech text-[9px] tracking-[0.16em] text-[var(--ink-muted)] hidden sm:block">
                {theme === 'light' ? 'MORNING VINYL EDITION' : 'ANALOG DARKROOM PRESS'}
              </div>
            </div>
          </button>

          {/* Editorial Underline Navigation */}
          <nav className="hidden md:flex items-center gap-8 h-full">
            {[
              { id: 'studio' as const, code: '01', label: '制片室' },
              { id: 'square' as const, code: '02', label: '唱片墙', count: posts.length },
              { id: 'library' as const, code: '03', label: '我的唱片架' },
            ].map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative h-full flex items-center gap-2 text-xs tracking-wider transition ${
                    active
                      ? 'text-[var(--ink-primary)] font-semibold'
                      : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <span className="font-tech text-[10px] text-[var(--accent)]">{item.code}</span>
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="font-tech text-[10px] text-[var(--ink-muted)]">
                      ({item.count})
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--accent)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Dual-Theme Switcher + Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Tactile Morning Sun / Dark Vinyl Switcher */}
            <div
              className="inline-flex items-center p-0.5 rounded-full hi-fi-inset"
              role="group"
              aria-label="切换界面主题"
            >
              <button
                type="button"
                onClick={() => handleToggleTheme('light')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  theme === 'light'
                    ? 'bg-[var(--bg-panel)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
                title="日光唱片（明亮温暖）"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">日光</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleTheme('dark')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  theme === 'dark'
                    ? 'bg-[var(--bg-elevated)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
                title="黑胶暗房（深邃质感）"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">暗房</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-[var(--line-subtle)] bg-[var(--bg-panel)] hover:border-[var(--accent-border)] transition"
            >
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-xs text-[var(--ink-primary)] max-w-[80px] truncate hidden sm:inline">
                {profile.name}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-7 py-5 sm:py-8">
        {activeTab === 'studio' && (
          <StudioView
            song={selectedSong}
            songs={songs}
            config={config}
            activePalette={activePalette}
            isPlaying={isPlaying && playingSongId === selectedSong.id}
            authorName={profile.name}
            onSelectSong={handleSelectSong}
            onUpdateSongs={setSongs}
            onUpdateSongMeta={handleUpdateSongMeta}
            onUpdateConfig={handleUpdateConfig}
            onPaletteExtracted={setExtractedPalette}
            onToggleAudio={() => void audioEngine.toggle(selectedSong)}
            onOpenShare={(pngUrl, videoUrl) =>
              setShareModal({ open: true, previewImgUrl: pngUrl, videoBlobUrl: videoUrl || null })
            }
            onOpenPublish={(pngUrl) => setPublishModal({ open: true, previewUrl: pngUrl })}
            onSaveDraft={handleSaveDraft}
            showToast={showToast}
          />
        )}

        {activeTab === 'square' && (
          <SocialSquareView
            posts={posts}
            playingSongId={playingSongId}
            isPlaying={isPlaying}
            userProfile={profile}
            onTogglePlayPost={(post) => void audioEngine.toggle(post.song)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onAddComment={handleAddComment}
            onRemixStyle={handleRemixStyle}
            onOpenLandingForPost={(post) =>
              setLandingData({
                song: post.song,
                config: post.config,
                palette: post.palette,
                authorName: post.author.name,
                caption: post.caption,
              })
            }
            onGoToStudio={() => setActiveTab('studio')}
            showToast={showToast}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            profile={profile}
            posts={posts}
            drafts={drafts}
            onUpdateProfile={(next) => {
              setProfile(next);
              showToast('档案资料已更新');
            }}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={(id) => {
              setDrafts((prev) => prev.filter((d) => d.id !== id));
              showToast('已移出草稿箱');
            }}
            onDeletePost={(id) => {
              setPosts((prev) => prev.filter((p) => p.id !== id));
              showToast('已从唱片墙下架');
            }}
            onRemixPost={handleRemixStyle}
            onGoToStudio={() => setActiveTab('studio')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--line-subtle)] bg-[var(--bg-header)] backdrop-blur-md px-4 py-2">
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          {[
            { id: 'studio' as const, label: '制片室', icon: SlidersHorizontal },
            { id: 'square' as const, label: '唱片墙', icon: Radio },
            { id: 'library' as const, label: '唱片架', icon: Library },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] transition ${
                  active ? 'text-[var(--accent)] font-semibold' : 'text-[var(--ink-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <PublishModal
        open={publishModal.open}
        song={selectedSong}
        previewUrl={publishModal.previewUrl}
        defaultCaption={
          config.lyric.trim()
            ? `${config.lyric.trim()} —— 今晚循环《${selectedSong.title}》。`
            : `今晚正在循环《${selectedSong.title}》，留一张唱片海报。`
        }
        onClose={() => setPublishModal({ open: false, previewUrl: null })}
        onConfirmPublish={handlePublishConfirm}
      />

      <ShareModal
        open={shareModal.open}
        song={selectedSong}
        lyric={config.lyric}
        previewImgUrl={shareModal.previewImgUrl}
        videoBlobUrl={shareModal.videoBlobUrl}
        shareUrl={studioShareUrl}
        onClose={() => setShareModal((prev) => ({ ...prev, open: false }))}
        onSavePng={handleDownloadFromShareModal}
        onPreviewLanding={() => {
          setShareModal((prev) => ({ ...prev, open: false }));
          setLandingData({
            song: selectedSong,
            config,
            palette: activePalette,
            authorName: profile.name,
            caption: config.lyric || `分享一张《${selectedSong.title}》给你`,
          });
        }}
        showToast={showToast}
      />

      {landingData && (
        <SharedLandingView
          song={landingData.song}
          config={landingData.config}
          palette={landingData.palette}
          authorName={landingData.authorName}
          caption={landingData.caption}
          isPlaying={isPlaying && playingSongId === landingData.song.id}
          onToggleAudio={() => void audioEngine.toggle(landingData.song)}
          onRemixInStudio={() => {
            setSelectedSong(landingData.song);
            setConfig(landingData.config);
            setExtractedPalette(landingData.palette);
            setLandingData(null);
            setActiveTab('studio');
            if (window.location.hash.includes('share=')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            showToast('已载入同款版式，可继续自由调校');
          }}
          onClose={() => {
            setLandingData(null);
            if (window.location.hash.includes('share=')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Subtle Studio Toast */}
      <div
        className={`pointer-events-none fixed bottom-20 md:bottom-7 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <div className="px-4 py-2.5 rounded-full bg-[var(--bg-panel)] border border-[var(--accent-border)] text-xs text-[var(--ink-primary)] shadow-2xl flex items-center gap-2.5 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>{toast.message}</span>
        </div>
      </div>
    </div>
  );
}
