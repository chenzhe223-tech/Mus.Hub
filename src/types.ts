export type PosterMode = 'dynamic' | 'static';

export type TemplateId =
  | 'vinyl'
  | 'polaroid'
  | 'glass'
  | 'cassette'
  | 'cd'
  | 'magazine';

export type RatioId = '3:4' | '9:16' | '1:1' | '4:5';

export type UiTheme = 'dark' | 'light';

export type PaletteKey =
  | 'auto'
  | 'midnight'
  | 'sunset'
  | 'pastel'
  | 'cream'
  | 'emerald'
  | 'ivory'
  | 'sunshine'
  | 'sky';

export type FontStyleId = 'modern' | 'serif' | 'retro' | 'poetic';

export interface Palette {
  bg1: string;
  bg2: string;
  accent: string;
  accent2?: string;
  text: string;
  muted: string;
  light: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover: string;
  lyric: string;
  palette?: Palette | null;
  previewUrl?: string | null;
  chordFreqs?: number[];
  bpm?: number;
  externalUrl?: string;
  externalLinks?: {
    netease?: string;
    qq?: string;
    apple?: string;
    spotify?: string;
  };
  source?: 'curated' | 'itunes' | 'apple-music' | 'deezer' | 'netease' | 'qq' | 'local' | 'ai-voice';
  neteaseId?: string;
  qqMid?: string;
  isAiOriginal?: boolean;
}

export interface PosterConfig {
  mode: PosterMode;
  template: TemplateId;
  ratio: RatioId;
  paletteKey: PaletteKey;
  fontStyle: FontStyleId;
  lyric: string;
  showLyric: boolean;
  showWave: boolean;
  showProgress: boolean;
  showQr: boolean;
  filmGrain: boolean;
}

export interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  content: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    bio?: string;
  };
  song: Song;
  config: PosterConfig;
  palette: Palette;
  caption: string;
  tags: string[];
  thumbnailUrl?: string;
  likes: number;
  likedByMe: boolean;
  savedByMe: boolean;
  comments: CommentItem[];
  createdAt: number;
  isMine?: boolean;
}

export interface UserProfile {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
}

export interface DraftItem {
  id: string;
  song: Song;
  config: PosterConfig;
  thumbnailUrl: string;
  savedAt: number;
}

export type AppTab = 'studio' | 'square' | 'library';
