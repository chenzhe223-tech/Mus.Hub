import type { DraftItem, SocialPost, UiTheme, UserProfile } from '../types';
import { buildAvatarDataUrl, INITIAL_SOCIAL_POSTS } from '../data/curated';

const KEYS = {
  posts: 'sparkme_posts_v3',
  drafts: 'sparkme_drafts_v3',
  profile: 'sparkme_profile_v3',
  theme: 'sparkme_theme_v1',
};

export function loadTheme(): UiTheme {
  try {
    const raw = localStorage.getItem(KEYS.theme);
    return raw === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: UiTheme): void {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    // Ignore
  }
}

export const DEFAULT_PROFILE: UserProfile = {
  name: '黑胶漫游者',
  handle: '@sonic.archive',
  avatar: buildAvatarDataUrl('音', '#24201c', '#d4a359'),
  bio: '用一张唱片海报，留住今晚单曲循环的时刻。',
};

export function loadPosts(): SocialPost[] {
  try {
    const raw = localStorage.getItem(KEYS.posts);
    if (!raw) return INITIAL_SOCIAL_POSTS;
    const parsed = JSON.parse(raw) as SocialPost[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SOCIAL_POSTS;
  } catch {
    return INITIAL_SOCIAL_POSTS;
  }
}

export function savePosts(posts: SocialPost[]): void {
  try {
    // Cap stored posts to prevent localStorage quota overflow
    localStorage.setItem(KEYS.posts, JSON.stringify(posts.slice(0, 40)));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function loadDrafts(): DraftItem[] {
  try {
    const raw = localStorage.getItem(KEYS.drafts);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: DraftItem[]): void {
  try {
    localStorage.setItem(KEYS.drafts, JSON.stringify(drafts.slice(0, 16)));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEYS.profile);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(KEYS.profile, JSON.stringify(profile));
  } catch {
    // Ignore
  }
}
