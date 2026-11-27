import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookmarkPlus,
  ChevronDown,
  Clapperboard,
  Disc3,
  Download,
  Edit3,
  ExternalLink,
  Film,
  FileText,
  Headphones,
  Loader2,
  Mic,
  Music2,
  Pause,
  Play,
  QrCode,
  Quote,
  Search,
  Send,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Type,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type { FontStyleId, Palette, PaletteKey, PosterConfig, RatioId, Song, TemplateId } from '../types';
import {
  CURATED_SONGS,
  FONT_STYLES,
  INSPIRATION_QUOTES,
  RATIOS,
  TEMPLATES,
} from '../data/curated';
import { PosterCanvas } from './PosterCanvas';
import { withAlpha } from '../utils/color';
import { exportPosterPng, recordDynamicVideoWithAudio } from '../utils/exporter';
import { buildShareUrl } from '../utils/share';
import {
  discoverMusicCategory,
  ensureExternalLinks,
  fetchSongLyrics,
  searchUniversalMusic,
  type DiscoverCategoryId,
} from '../utils/musicSearch';

interface StudioViewProps {
  song: Song;
  songs: Song[];
  config: PosterConfig;
  activePalette: Palette;
  isPlaying: boolean;
  authorName: string;
  onSelectSong: (song: Song) => void;
  onUpdateSongs: (songs: Song[]) => void;
  onUpdateSongMeta: (patch: Partial<Song>) => void;
  onUpdateConfig: (patch: Partial<PosterConfig>) => void;
  onPaletteExtracted: (palette: Palette) => void;
  onToggleAudio: () => void;
  onOpenShare: (pngUrl: string | null, videoUrl?: string | null) => void;
  onOpenPublish: (pngUrl: string | null) => void;
  onOpenRecognize: () => void;
  onOpenAiVoice: () => void;
  onSaveDraft: (pngUrl: string | null) => void;
  showToast: (msg: string) => void;
}

const PALETTE_SWATCHES: Array<{ key: PaletteKey; label: string; bg: string }> = [
  { key: 'auto', label: '封面原色', bg: 'conic-gradient(from 45deg, #d96236, #f5b969, #7a94b8, #8eb69b, #d96236)' },
  { key: 'sunshine', label: '暖阳蜜桃', bg: 'linear-gradient(135deg, #fff6e6 38%, #f29954 78%, #d95d32)' },
  { key: 'sky', label: '晴空柑橘', bg: 'linear-gradient(135deg, #eaf5fb 45%, #8ec7e6 78%, #e06d3b)' },
  { key: 'cream', label: '奶油纸感', bg: 'linear-gradient(135deg, #f4ede1 55%, #7d2025)' },
  { key: 'ivory', label: '画廊留白', bg: 'linear-gradient(135deg, #f7f5f0 60%, #1c1917)' },
  { key: 'sunset', label: '焦糖琥珀', bg: 'linear-gradient(135deg, #2b1812 35%, #e2a35d)' },
  { key: 'midnight', label: '午夜蓝调', bg: 'linear-gradient(135deg, #0f1218 40%, #d4a359)' },
  { key: 'pastel', label: '湾岸雾蓝', bg: 'linear-gradient(135deg, #192338 40%, #d89b82)' },
  { key: 'emerald', label: '雪松森林', bg: 'linear-gradient(135deg, #101915 45%, #8eb69b)' },
];

const DISCOVER_CHANNELS: Array<{ id: DiscoverCategoryId; label: string }> = [
  { id: 'hot_cn', label: '华语热歌' },
  { id: 'pop_west', label: '欧美流行' },
  { id: 'hot_global', label: '全球热榜' },
  { id: 'indie', label: '独立乐队' },
  { id: 'rnb_jazz', label: '爵士 R&B' },
  { id: 'jpop', label: '日系都市' },
  { id: 'cantopop', label: '粤语经典' },
  { id: 'curated', label: '馆藏黑胶' },
];

const SOURCE_LABELS: Record<NonNullable<Song['source']>, string> = {
  itunes: 'Apple',
  'apple-music': 'Apple官方',
  deezer: 'Deezer',
  netease: '网易云',
  qq: 'QQ音乐',
  curated: '馆藏',
  local: '本地',
  'ai-voice': 'AI声纹',
};

type ControlSubTab = 'style' | 'music' | 'details';

export const StudioView: React.FC<StudioViewProps> = ({
  song,
  songs,
  config,
  activePalette,
  isPlaying,
  authorName,
  onSelectSong,
  onUpdateSongs,
  onUpdateSongMeta,
  onUpdateConfig,
  onPaletteExtracted,
  onToggleAudio,
  onOpenShare,
  onOpenPublish,
  onOpenRecognize,
  onOpenAiVoice,
  onSaveDraft,
  showToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tracklistRef = useRef<HTMLDivElement | null>(null);
  const hasAutoLoadedRef = useRef(false);
  const [subTab, setSubTab] = useState<ControlSubTab>('style');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [activeChannel, setActiveChannel] = useState<DiscoverCategoryId | null>('curated');
  const [searchStatus, setSearchStatus] = useState('四源全网曲库 · 实时榜单 + 任意搜歌');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordPercent, setRecordPercent] = useState(0);
  const [editingMeta, setEditingMeta] = useState(false);
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsFetchedFor, setLyricsFetchedFor] = useState<string>('');

  const shareUrl = useMemo(
    () => buildShareUrl(song, config, authorName),
    [song, config, authorName]
  );

  // Silently preload the live 30-track Chinese hot chart once so Shuffle & Music Browser feel rich immediately
  useEffect(() => {
    if (hasAutoLoadedRef.current) return;
    hasAutoLoadedRef.current = true;

    let cancelled = false;
    void discoverMusicCategory('hot_cn').then((tracks) => {
      if (cancelled) return;
      const isLive = tracks.some((t) => t.source && t.source !== 'curated');
      if (isLive && tracks.length > 0) {
        onUpdateSongs(tracks);
        setActiveChannel('hot_cn');
        setSearchStatus(`华语热歌 · 共 ${tracks.length} 首（支持原曲试听）`);
      } else {
        setActiveChannel('curated');
        setSearchStatus(`馆藏黑胶 · 共 ${CURATED_SONGS.length} 首（联网后自动加载全网热榜）`);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch real lyrics for searched/online tracks (cached, NetEase + LRCLIB)
  useEffect(() => {
    const key = `${song.neteaseId || ''}::${song.title}::${song.artist}`;
    if (song.id.startsWith('curated-')) {
      setLyricsLines([]);
      setLyricsFetchedFor('');
      return;
    }
    if (lyricsFetchedFor === key) return;

    let cancelled = false;
    setLyricsLoading(true);
    void fetchSongLyrics(song.title, song.artist, song.neteaseId).then((res) => {
      if (cancelled) return;
      setLyricsLines(res.lines);
      setLyricsFetchedFor(key);
      setLyricsLoading(false);
      // If user hasn't edited lyric yet and we found a great real highlight, offer it seamlessly
      if (res.highlights.length > 0 && config.lyric.startsWith('把这首《')) {
        onUpdateConfig({ lyric: res.highlights[0], showLyric: true });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, song.title, song.artist, song.neteaseId]);

  const handleLoadLyricsManual = async () => {
    setLyricsLoading(true);
    const res = await fetchSongLyrics(song.title, song.artist, song.neteaseId);
    setLyricsLines(res.lines);
    setLyricsFetchedFor(`${song.neteaseId || ''}::${song.title}::${song.artist}`);
    setLyricsLoading(false);
    if (res.found) {
      showToast(`已匹配到 ${res.lines.length} 句真实歌词，点击任意一句即可上墙`);
    } else {
      showToast('暂未检索到该曲目歌词，可直接手动输入金句');
    }
  };

  const handleSelectChannel = async (channelId: DiscoverCategoryId) => {
    const meta = DISCOVER_CHANNELS.find((c) => c.id === channelId);
    const label = meta?.label || '发现频道';
    setSearchQuery('');
    setActiveSearchTerm('');
    setSearchOffset(0);
    setHasMore(false);
    setActiveChannel(channelId);
    setIsLoadingChannel(true);
    setSearchStatus(`正在加载「${label}」歌单...`);

    try {
      const tracks = await discoverMusicCategory(channelId);
      onUpdateSongs(tracks);
      if (tracklistRef.current) tracklistRef.current.scrollTop = 0;

      if (channelId === 'curated') {
        setSearchStatus(`馆藏黑胶 · 共 ${tracks.length} 首（内置高清免跨域）`);
      } else if (tracks.some((t) => t.source && t.source !== 'curated')) {
        setSearchStatus(`${label} · 共 ${tracks.length} 首（支持原曲试听）`);
      } else {
        setSearchStatus(`网络受限，已展示馆藏黑胶 · 共 ${tracks.length} 首`);
        showToast('当前外网连接受限，已切换为馆藏黑胶');
      }
    } finally {
      setIsLoadingChannel(false);
    }
  };

  const performSearch = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) {
      await handleSelectChannel('hot_cn');
      return;
    }

    setActiveChannel(null);
    setActiveSearchTerm(q);
    setSearchOffset(0);
    setHasMore(false);
    setIsSearching(true);
    setSearchStatus('正在聚合四源曲库 (Apple + Deezer + 网易云)...');
    try {
      const res = await searchUniversalMusic(q, 0);
      if (res.songs.length > 0) {
        onUpdateSongs(res.songs);
        onSelectSong(res.songs[0]);
        setHasMore(res.hasMore);
        if (tracklistRef.current) tracklistRef.current.scrollTop = 0;

        if (res.mode === 'hybrid' || res.mode === 'edge') {
          const hint = res.cleanedQuery !== q ? ` · 识别「${res.cleanedQuery}」` : '';
          setSearchStatus(`全网检索到 ${res.songs.length} 首（华语/欧美多源原曲）${hint}`);
        } else if (res.mode === 'direct-fallback') {
          setSearchStatus(`找到 ${res.songs.length} 首正版原曲（支持 30s 试听）`);
        } else {
          setSearchStatus(`网络受限，已展示本地曲库`);
          showToast('当前外网连接受限，可直接使用馆藏曲目或导入本地音频');
        }
      } else {
        onUpdateSongs([]);
        setHasMore(false);
        setSearchStatus('未找到匹配曲目，试试更换歌名/歌手，或导入本地音频');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!activeSearchTerm || isLoadingMore || !hasMore) return;
    const nextOffset = searchOffset + 28;
    setIsLoadingMore(true);
    try {
      const res = await searchUniversalMusic(activeSearchTerm, nextOffset);
      const existingKeys = new Set(
        songs.map((s) => `${s.title.toLowerCase()}::${s.artist.toLowerCase()}`)
      );
      const existingIds = new Set(songs.map((s) => s.id));
      const fresh = res.songs.filter((s) => {
        const key = `${s.title.toLowerCase()}::${s.artist.toLowerCase()}`;
        return !existingIds.has(s.id) && !existingKeys.has(key);
      });

      if (fresh.length > 0) {
        const merged = [...songs, ...fresh];
        onUpdateSongs(merged);
        setSearchOffset(nextOffset);
        setHasMore(res.hasMore);
        setSearchStatus(`全网检索「${res.cleanedQuery}」· 已加载 ${merged.length} 首`);
      } else {
        setHasMore(false);
        showToast('已展示全部匹配曲目');
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || '');
      if (!dataUrl) return;
      onUpdateSongMeta({ cover: dataUrl, palette: null });
      onUpdateConfig({ paletteKey: 'auto' });
      showToast('已更换封面图并提取画面主色调');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^.]+$/, '');
    onUpdateSongMeta({
      previewUrl: url,
      title: cleanTitle || song.title,
    });
    showToast(`已载入音频《${cleanTitle}》，点击试听同步频谱`);
    e.target.value = '';
  };

  const handleRandomQuote = () => {
    const others = INSPIRATION_QUOTES.filter((q) => q !== config.lyric);
    const pick = others[Math.floor(Math.random() * others.length)] || INSPIRATION_QUOTES[0];
    onUpdateConfig({ lyric: pick, showLyric: true });
  };

  const handleRandomSong = () => {
    if (!songs.length || isRecording) return;
    const others = songs.filter((s) => s.id !== song.id);
    const pool = others.length ? others : songs;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onSelectSong(pick);
    showToast(`已切换唱片《${pick.title}》`);
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const url = exportPosterPng(canvasRef.current, song.title, true);
    if (url) {
      showToast('高清静止海报 (PNG) 已开始下载');
    } else {
      showToast('外部封面受跨域限制，请上传本地封面图或使用馆藏曲目导出');
    }
  };

  const handleRecordVideo = async () => {
    if (isRecording || !canvasRef.current) return;
    if (config.mode !== 'dynamic') {
      onUpdateConfig({ mode: 'dynamic' });
    }
    setIsRecording(true);
    setRecordPercent(0);
    try {
      const result = await recordDynamicVideoWithAudio({
        canvas: canvasRef.current,
        song,
        durationMs: 5000,
        onProgress: (pct) => setRecordPercent(pct),
      });
      const pngUrl = exportPosterPng(canvasRef.current, song.title, false);
      showToast(
        result.hasAudio
          ? `5秒有声动态海报 (${result.ext.toUpperCase()}) 已导出`
          : `5秒动态海报 (${result.ext.toUpperCase()}) 已导出`
      );
      onOpenShare(pngUrl, result.blobUrl);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '视频录制失败');
    } finally {
      setIsRecording(false);
      setRecordPercent(0);
    }
  };

  const capturePreviewUrl = (): string | null => {
    if (!canvasRef.current) return null;
    return exportPosterPng(canvasRef.current, song.title, false);
  };

  const subtleTint = `radial-gradient(circle at 50% 42%, ${withAlpha(
    activePalette.accent,
    0.13
  )}, transparent 66%)`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Right Column (Top on Mobile): Gallery Preview Stage */}
      <section className="order-1 lg:order-2 lg:col-span-7 xl:col-span-7 lg:sticky lg:top-22">
        <div className="relative hi-fi-stage rounded-2xl p-4 sm:p-6 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-700"
            style={{ background: subtleTint }}
          />

          {/* Subtle Corner Crop Marks */}
          <span className="pointer-events-none absolute top-3 left-3 w-2.5 h-2.5 border-t border-l border-[var(--line-strong)]" />
          <span className="pointer-events-none absolute top-3 right-3 w-2.5 h-2.5 border-t border-r border-[var(--line-strong)]" />
          <span className="pointer-events-none absolute bottom-3 left-3 w-2.5 h-2.5 border-b border-l border-[var(--line-strong)]" />
          <span className="pointer-events-none absolute bottom-3 right-3 w-2.5 h-2.5 border-b border-r border-[var(--line-strong)]" />

          {/* Hi-Fi Transport Header */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-[var(--line-subtle)]">
            <div className="flex items-center gap-2.5 font-tech text-[11px] text-[var(--ink-secondary)]">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording
                    ? 'bg-[var(--heart)] animate-ping'
                    : config.mode === 'dynamic'
                      ? 'bg-[var(--accent)]'
                      : 'bg-[var(--ink-muted)]'
                }`}
              />
              <span className="tracking-wider">
                {config.mode === 'dynamic' ? 'MOTION DECK' : 'PRINT PROOF'} · {config.ratio}
              </span>
              {config.filmGrain && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--line-subtle)] text-[var(--ink-secondary)] text-[10px]">
                  35MM GRAIN
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRecording}
                onClick={handleRandomSong}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--line-subtle)] bg-[var(--bg-panel)] hover:border-[var(--line-strong)] text-xs text-[var(--ink-primary)] transition disabled:opacity-40"
                title="随机换一张唱片"
              >
                <Shuffle className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">换碟</span>
              </button>

              <button
                type="button"
                onClick={onToggleAudio}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                  isPlaying
                    ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--ink-primary)]'
                    : 'bg-[var(--bg-panel)] hover:border-[var(--line-strong)] border-[var(--line-subtle)] text-[var(--ink-primary)]'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-[var(--heart)]" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-[var(--accent)]" />
                )}
                <span>
                  {isPlaying
                    ? '暂停播放'
                    : song.previewUrl
                      ? '试听原曲'
                      : '试听黑胶音'}
                </span>
                {isPlaying && (
                  <span className="inline-flex items-end gap-[2px] h-3 ml-0.5">
                    <span className="w-[2px] h-full bg-[var(--accent)] origin-bottom vu-bar-1" />
                    <span className="w-[2px] h-full bg-[var(--accent)] origin-bottom vu-bar-2" />
                    <span className="w-[2px] h-full bg-[var(--heart)] origin-bottom vu-bar-3" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Poster Canvas Plinth */}
          <div className="relative z-10 flex items-center justify-center py-2">
            <PosterCanvas
              canvasRef={canvasRef}
              song={song}
              config={config}
              palette={activePalette}
              shareUrl={shareUrl}
              isPlaying={isPlaying}
              isRecording={isRecording}
              onPaletteExtracted={onPaletteExtracted}
              className="max-h-[46vh] sm:max-h-[56vh] lg:max-h-[63vh]"
            />

            {isRecording && (
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-md bg-[var(--bg-panel)]/95 border border-[var(--heart)] text-[var(--ink-primary)] font-tech text-[11px] flex items-center gap-2 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-[var(--heart)] animate-ping" />
                <span>REC {recordPercent}%</span>
              </div>
            )}
          </div>

          {/* Tactile Action Bar */}
          <div className="relative z-10 mt-5 pt-4 border-t border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isRecording}
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] hover:bg-[var(--btn-primary-hover)] transition disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出 PNG</span>
              </button>

              <button
                type="button"
                disabled={isRecording}
                onClick={handleRecordVideo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[var(--ink-primary)] border border-[var(--accent-border)] transition disabled:opacity-40"
              >
                <Clapperboard className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{isRecording ? `录制 ${recordPercent}%` : '录制有声视频'}</span>
              </button>

              <button
                type="button"
                disabled={isRecording}
                onClick={() => onSaveDraft(capturePreviewUrl())}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-transparent hover:bg-[var(--bg-hover)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--line-subtle)] transition disabled:opacity-40"
                title="存到草稿箱"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">存草稿</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => onOpenShare(capturePreviewUrl(), null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[var(--ink-primary)] border border-[var(--line-subtle)] transition disabled:opacity-40"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>扫码分享</span>
              </button>

              <button
                type="button"
                disabled={isRecording}
                onClick={() => onOpenPublish(capturePreviewUrl())}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] transition disabled:opacity-40 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>上架唱片墙</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Left Column: Tactile Console Deck */}
      <section className="order-2 lg:order-1 lg:col-span-5 xl:col-span-5 space-y-4">
        {/* Console Mode Tabs */}
        <div className="hi-fi-panel rounded-xl p-1 grid grid-cols-3 gap-1">
          {[
            { id: 'style' as const, code: 'A', label: '版式与色调' },
            { id: 'music' as const, code: 'B', label: '选曲与音源' },
            { id: 'details' as const, code: 'C', label: '文案与细节' },
          ].map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] border border-[var(--accent-border)]'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-transparent'
                }`}
              >
                <span className="font-tech text-[10px] text-[var(--accent)]">{tab.code}</span>
                <span>{tab.label}</span>
                {tab.id === 'music' && songs.length > 6 && (
                  <span className="font-tech text-[9px] px-1 py-0.2 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                    {songs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* PANEL A: STYLE & TEMPLATES */}
        {subTab === 'style' && (
          <div className="hi-fi-panel rounded-2xl p-5 space-y-6">
            {/* Motion / Static Rocker */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--line-subtle)]">
              <div>
                <div className="text-sm font-semibold text-[var(--ink-primary)]">呈现模式</div>
                <div className="font-tech text-[10px] text-[var(--ink-muted)] mt-0.5 tracking-wider">
                  LIVE MOTION / STATIC ARCHIVE
                </div>
              </div>
              <div className="inline-flex p-0.5 rounded-lg hi-fi-inset">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => onUpdateConfig({ mode: 'dynamic' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    config.mode === 'dynamic'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)]'
                      : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  动态黑胶
                </button>
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => onUpdateConfig({ mode: 'static' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    config.mode === 'static'
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)]'
                      : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  静止印刷
                </button>
              </div>
            </div>

            {/* 6 Numbered Editorial Templates */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--ink-secondary)]">视觉版式</span>
                <span className="font-tech text-[10px] text-[var(--ink-muted)]">01 — 06</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tpl) => {
                  const active = config.template === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      disabled={isRecording}
                      onClick={() => onUpdateConfig({ template: tpl.id as TemplateId })}
                      className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition ${
                        active
                          ? 'bg-[var(--bg-elevated)] border-[var(--accent-border)] text-[var(--ink-primary)]'
                          : 'bg-[var(--bg-inset)] border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:border-[var(--line-strong)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide">{tpl.name}</span>
                        <span
                          className={`font-tech text-[10px] ${
                            active ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'
                          }`}
                        >
                          {tpl.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--ink-muted)] truncate">{tpl.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratios */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--ink-secondary)]">画幅比例</span>
                <span className="font-tech text-[10px] text-[var(--ink-muted)]">AUTO LAYOUT</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(RATIOS) as RatioId[]).map((rKey) => {
                  const item = RATIOS[rKey];
                  const active = config.ratio === rKey;
                  return (
                    <button
                      key={rKey}
                      type="button"
                      disabled={isRecording}
                      onClick={() => onUpdateConfig({ ratio: rKey })}
                      className={`py-2 px-1 rounded-lg text-center transition border ${
                        active
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] border-[var(--btn-primary-bg)] font-semibold'
                          : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-[var(--line-subtle)] hover:border-[var(--line-strong)]'
                      }`}
                    >
                      <div className="font-tech text-xs">{item.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 truncate ${
                          active ? 'opacity-75' : 'text-[var(--ink-muted)]'
                        }`}
                      >
                        {item.desc.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curated Print Palettes (Including new cheerful Sunshine & Sky palettes!) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--ink-secondary)]">
                  海报色调（含暖阳轻快色系）
                </span>
                <span className="text-[11px] font-medium text-[var(--accent)]">
                  {PALETTE_SWATCHES.find((p) => p.key === config.paletteKey)?.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                {PALETTE_SWATCHES.map((sw) => {
                  const active = config.paletteKey === sw.key;
                  return (
                    <button
                      key={sw.key}
                      type="button"
                      title={sw.label}
                      onClick={() => onUpdateConfig({ paletteKey: sw.key })}
                      className={`w-7 h-7 rounded-full transition ${
                        active
                          ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-panel)] scale-110'
                          : 'opacity-85 hover:opacity-100 ring-1 ring-[var(--line-strong)]'
                      }`}
                      style={{ background: sw.bg }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-[var(--ink-secondary)] flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[var(--accent)]" />
                字体气质
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {FONT_STYLES.map((fs) => {
                  const active = config.fontStyle === fs.id;
                  return (
                    <button
                      key={fs.id}
                      type="button"
                      onClick={() => onUpdateConfig({ fontStyle: fs.id as FontStyleId })}
                      className={`py-2 rounded-lg text-xs border transition ${
                        active
                          ? 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--accent-border)] font-medium'
                          : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-[var(--line-subtle)] hover:text-[var(--ink-primary)]'
                      }`}
                      style={{ fontFamily: fs.titleFont }}
                    >
                      {fs.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PANEL B: MUSIC CATALOG & AUDIO IMPORT */}
        {subTab === 'music' && (
          <div className="hi-fi-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--accent)]" />
                全网唱片曲库
              </span>
              <span className="font-tech text-[10px] text-[var(--ink-muted)] truncate max-w-[230px] sm:max-w-none">
                {searchStatus}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void performSearch(searchQuery);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜任意华语/欧美歌名或歌手，如 孙燕姿 逆光、天黑黑、Taylor Swift..."
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-lg hi-fi-inset text-xs sm:text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)] transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      void handleSelectChannel('hot_cn');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || isLoadingChannel}
                className="px-4 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] hover:bg-[var(--btn-primary-hover)] text-xs font-semibold transition shrink-0 disabled:opacity-50"
              >
                {isSearching ? '检索中' : '搜索'}
              </button>
            </form>

            {/* Quick Triggers: Song Recognition & AI Voice 30s Original */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenRecognize}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] hover:border-[var(--accent-border)] text-xs font-medium text-[var(--ink-primary)] transition"
              >
                <Mic className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>听歌识曲</span>
              </button>
              <button
                type="button"
                onClick={onOpenAiVoice}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] border border-[var(--accent-border)] text-xs font-medium text-[var(--accent)] transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI 声纹 30s 演唱</span>
              </button>
            </div>

            {/* 7 Live Discovery Channels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--ink-muted)]">
                  实时发现频道（点选切换歌单）
                </span>
                <span className="font-tech text-[10px] text-[var(--ink-muted)]">
                  APPLE · DEEZER · NETEASE
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DISCOVER_CHANNELS.map((ch) => {
                  const active = activeChannel === ch.id && !activeSearchTerm;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      disabled={isLoadingChannel || isSearching}
                      onClick={() => void handleSelectChannel(ch.id)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition disabled:opacity-50 ${
                        active
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-border)] font-medium'
                          : 'bg-[var(--bg-inset)] text-[var(--ink-secondary)] border-[var(--line-subtle)] hover:text-[var(--ink-primary)] hover:border-[var(--line-strong)]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tracklist */}
            <div
              ref={tracklistRef}
              className="space-y-1.5 max-h-72 overflow-y-auto custom-scroll pr-1"
            >
              {isLoadingChannel || isSearching ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs text-[var(--ink-muted)]">
                  <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
                  <span>正在同步全网唱片库与高清封面...</span>
                </div>
              ) : songs.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--ink-muted)]">
                  没有匹配曲目，可换关键词、切换上方发现频道，或直接导入本地音源
                </div>
              ) : (
                <>
                  {songs.map((item, idx) => {
                    const active = song.id === item.id;
                    const srcLabel = item.source ? SOURCE_LABELS[item.source] : '';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isRecording}
                        onClick={() => onSelectSong(item)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                          active
                            ? 'bg-[var(--bg-elevated)] border-[var(--accent-border)] text-[var(--ink-primary)]'
                            : 'bg-[var(--bg-inset)]/60 border-transparent hover:bg-[var(--bg-hover)] text-[var(--ink-primary)]'
                        }`}
                      >
                        <span className="font-tech text-[10px] text-[var(--ink-muted)] w-5 text-center shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <img
                          src={item.cover}
                          alt={item.title}
                          loading="lazy"
                          className="w-10 h-10 rounded-md object-cover bg-[var(--bg-inset)] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {item.title}
                            </span>
                            {item.previewUrl && (
                              <span className="font-tech text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                                原曲
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                            {item.artist} · {item.album}
                            {srcLabel && item.source !== 'curated' && (
                              <span className="ml-1.5 font-tech text-[9px] opacity-75">
                                [{srcLabel}]
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="font-tech text-[11px] text-[var(--ink-muted)]">
                            {item.duration}
                          </span>
                          {active && <Disc3 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />}
                        </div>
                      </button>
                    );
                  })}

                  {/* Pagination Load More */}
                  {activeSearchTerm && hasMore && (
                    <button
                      type="button"
                      disabled={isLoadingMore}
                      onClick={() => void handleLoadMore()}
                      className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                          <span>正在加载更多曲目...</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>加载更多「{activeSearchTerm}」相关曲目</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* External Full-Song Links for Current Track */}
            {!song.isAiOriginal && (
              <div className="space-y-1.5 pt-3 border-t border-[var(--line-subtle)]">
                <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                  <span className="flex items-center gap-1.5 font-medium text-[var(--ink-secondary)]">
                    <Headphones className="w-3.5 h-3.5 text-[var(--accent)]" />
                    去外部音乐平台听《{song.title}》完整版
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(() => {
                    const ext = ensureExternalLinks(song);
                    return [
                      { label: '网易云', href: ext.netease },
                      { label: 'QQ音乐', href: ext.qq },
                      { label: 'Apple', href: ext.apple },
                      { label: 'Spotify', href: ext.spotify },
                    ].map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-[11px] text-[var(--ink-primary)] transition"
                      >
                        <span className="truncate">{link.label}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-[var(--ink-muted)] shrink-0" />
                      </a>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Local Import */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--line-subtle)]">
              <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>更换封面图</span>
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] border border-[var(--line-subtle)] text-xs text-[var(--ink-primary)] cursor-pointer transition">
                <Music2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>导入 MP3 / WAV</span>
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* PANEL C: COPY, METADATA & PRINT DETAILS */}
        {subTab === 'details' && (
          <div className="hi-fi-panel rounded-2xl p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--ink-secondary)]">
                  唱片扉页文案 / 歌词
                </label>
                <button
                  type="button"
                  onClick={handleRandomQuote}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline transition"
                >
                  随机一句乐评
                </button>
              </div>
              <textarea
                rows={3}
                maxLength={80}
                value={config.lyric}
                onChange={(e) => onUpdateConfig({ lyric: e.target.value })}
                placeholder="写一句歌词或此刻听歌的心境..."
                className="w-full px-3.5 py-2.5 rounded-lg hi-fi-inset text-xs sm:text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent-border)] resize-none"
              />
              <div className="flex items-center justify-between font-tech text-[10px] text-[var(--ink-muted)]">
                <button
                  type="button"
                  onClick={() => void handleLoadLyricsManual()}
                  disabled={lyricsLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-sans text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  <FileText className="w-3 h-3" />
                  {lyricsLoading ? '正在提取真实歌词...' : '提取这首歌的真实歌词'}
                </button>
                <span>{config.lyric.length} / 80</span>
              </div>

              {lyricsLines.length > 0 && (
                <div className="hi-fi-inset rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-medium text-[var(--ink-secondary)]">
                      点击任意一句歌词贴上海报（共 {lyricsLines.length} 句）
                    </span>
                    <button
                      type="button"
                      onClick={() => setLyricsLines([])}
                      className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    >
                      收起
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto custom-scroll space-y-1 pr-1">
                    {lyricsLines.map((line, i) => {
                      const picked = config.lyric.trim() === line.trim();
                      return (
                        <button
                          key={`${i}-${line.slice(0, 12)}`}
                          type="button"
                          onClick={() => {
                            onUpdateConfig({ lyric: line.slice(0, 80), showLyric: true });
                            showToast('已将该句歌词贴上海报');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition ${
                            picked
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)]'
                          }`}
                        >
                          {line}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Editor */}
            <div className="space-y-2.5 pt-3 border-t border-[var(--line-subtle)]">
              <button
                type="button"
                onClick={() => setEditingMeta((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition"
              >
                <span className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  修改歌名 / 歌手 / 专辑名
                </span>
                <span className="font-tech text-[10px] text-[var(--accent)]">
                  {editingMeta ? 'CLOSE' : 'EDIT'}
                </span>
              </button>

              {editingMeta && (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={song.title}
                    onChange={(e) => onUpdateSongMeta({ title: e.target.value })}
                    placeholder="歌曲名"
                    className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={song.artist}
                      onChange={(e) => onUpdateSongMeta({ artist: e.target.value })}
                      placeholder="音乐人"
                      className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
                    />
                    <input
                      type="text"
                      value={song.album}
                      onChange={(e) => onUpdateSongMeta({ album: e.target.value })}
                      placeholder="专辑名称"
                      className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tactile Switches */}
            <div className="space-y-2.5 pt-3 border-t border-[var(--line-subtle)]">
              <span className="text-xs font-medium text-[var(--ink-secondary)]">画面部件与纸质颗粒</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'showLyric' as const, label: '扉页文案', icon: Quote },
                  { key: 'showWave' as const, label: '音频频谱', icon: Activity },
                  { key: 'showProgress' as const, label: '时间轴', icon: SlidersHorizontal },
                  { key: 'showQr' as const, label: '可扫二维码', icon: QrCode },
                  { key: 'filmGrain' as const, label: '胶片微粒', icon: Film },
                ].map((item) => {
                  const Icon = item.icon;
                  const on = config[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onUpdateConfig({ [item.key]: !on })}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs border transition ${
                        on
                          ? 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--accent-border)] font-medium'
                          : 'bg-[var(--bg-inset)] text-[var(--ink-muted)] border-[var(--line-subtle)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${on ? 'text-[var(--accent)]' : ''}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
