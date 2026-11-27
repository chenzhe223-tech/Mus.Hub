import type { FontStyleId, Palette, PaletteKey, RatioId, SocialPost, Song, TemplateId } from '../types';

function svgToDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.trim());
}

export function buildAvatarDataUrl(initial: string, bg: string, fg = '#f2ede4'): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="60" fill="${bg}"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="${fg}" stroke-opacity="0.22" stroke-width="1.5"/>
      <text x="60" y="73" text-anchor="middle" fill="${fg}" font-family="Georgia, 'Songti SC', serif" font-size="42" font-weight="600">${initial}</text>
    </svg>
  `);
}

/**
 * Editorial, art-directed vinyl sleeve covers (inspired by Blue Note, ECM Records, Japanese Jazz & Indie Print)
 */
function buildMidnightBlueNoteCover(): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#131924"/>
          <stop offset="58%" stop-color="#1c2738"/>
          <stop offset="100%" stop-color="#0b0e14"/>
        </linearGradient>
        <radialGradient id="lamp" cx="62%" cy="34%" r="42%">
          <stop offset="0%" stop-color="#e9be78" stop-opacity="0.72"/>
          <stop offset="48%" stop-color="#b46b3b" stop-opacity="0.24"/>
          <stop offset="100%" stop-color="#131924" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect width="800" height="800" fill="url(#lamp)"/>
      <rect x="42" y="42" width="716" height="716" fill="none" stroke="#e9be78" stroke-opacity="0.24" stroke-width="1.5"/>
      <circle cx="492" cy="272" r="146" fill="#e9be78" opacity="0.1"/>
      <circle cx="492" cy="272" r="92" fill="#f3dfc1" opacity="0.9"/>
      <rect x="42" y="458" width="716" height="2" fill="#f2ede4" opacity="0.2"/>
      <g fill="#0a0d12" opacity="0.88">
        <rect x="64" y="340" width="92" height="196"/>
        <rect x="172" y="294" width="68" height="242"/>
        <rect x="256" y="378" width="110" height="158"/>
        <rect x="576" y="318" width="118" height="218"/>
      </g>
      <g fill="#e9be78" opacity="0.78">
        <rect x="190" y="324" width="10" height="18"/><rect x="212" y="324" width="10" height="18"/>
        <rect x="190" y="360" width="10" height="18"/><rect x="610" y="352" width="14" height="22"/>
        <rect x="638" y="352" width="14" height="22"/>
      </g>
      <g stroke="#e9be78" stroke-linecap="round" opacity="0.4">
        <line x1="418" y1="566" x2="564" y2="566" stroke-width="3.5"/>
        <line x1="444" y1="596" x2="540" y2="596" stroke-width="2.5"/>
        <line x1="464" y1="624" x2="520" y2="624" stroke-width="2"/>
      </g>
      <text x="68" y="106" fill="#e9be78" font-family="Georgia, serif" font-size="20" letter-spacing="8">BLUE HOUR PRESS</text>
      <text x="68" y="726" fill="#f2ede4" opacity="0.82" font-family="'SFMono-Regular', monospace" font-size="18" letter-spacing="6">TOKYO RAIN · 02:14 · 33⅓ RPM</text>
    </svg>
  `);
}

function buildAmberDuskCover(): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2b1812"/>
          <stop offset="44%" stop-color="#7c3820"/>
          <stop offset="76%" stop-color="#c97a40"/>
          <stop offset="100%" stop-color="#ecd2a9"/>
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#612917"/>
          <stop offset="100%" stop-color="#170d0a"/>
        </linearGradient>
      </defs>
      <rect width="800" height="510" fill="url(#sky)"/>
      <circle cx="400" cy="430" r="126" fill="#f6e7cb" opacity="0.94"/>
      <rect x="0" y="504" width="800" height="296" fill="url(#sea)"/>
      <line x1="0" y1="504" x2="800" y2="504" stroke="#f6e7cb" stroke-opacity="0.45" stroke-width="2"/>
      <g fill="#f6e7cb" opacity="0.48">
        <rect x="308" y="532" width="184" height="6" rx="3"/>
        <rect x="334" y="558" width="132" height="5" rx="2.5" opacity="0.8"/>
        <rect x="356" y="584" width="88" height="4" rx="2" opacity="0.6"/>
        <rect x="372" y="610" width="56" height="3" rx="1.5" opacity="0.45"/>
      </g>
      <rect x="44" y="44" width="712" height="712" fill="none" stroke="#f6e7cb" stroke-opacity="0.24" stroke-width="1.5"/>
      <text x="400" y="114" text-anchor="middle" fill="#f6e7cb" opacity="0.88" font-family="Georgia, serif" font-size="24" letter-spacing="10">COASTLINE FILM</text>
      <text x="400" y="726" text-anchor="middle" fill="#ecd2a9" opacity="0.72" font-family="'SFMono-Regular', monospace" font-size="16" letter-spacing="7">ANALOG ARCHIVE · SIDE A</text>
    </svg>
  `);
}

function buildVelvetJazzCover(): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f3ece0"/>
          <stop offset="100%" stop-color="#ded1bc"/>
        </linearGradient>
        <radialGradient id="burgundy" cx="50%" cy="46%" r="46%">
          <stop offset="0%" stop-color="#7c2026"/>
          <stop offset="100%" stop-color="#350c10"/>
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#paper)"/>
      <rect x="42" y="42" width="716" height="716" fill="none" stroke="#47231e" stroke-width="1.8" opacity="0.3"/>
      <circle cx="400" cy="368" r="212" fill="url(#burgundy)"/>
      <circle cx="400" cy="368" r="176" fill="none" stroke="#dfc18b" stroke-width="1.2" opacity="0.5"/>
      <circle cx="400" cy="368" r="118" fill="none" stroke="#f3ece0" stroke-width="1" opacity="0.35"/>
      <circle cx="400" cy="368" r="64" fill="#d8b578"/>
      <circle cx="400" cy="368" r="12" fill="#2c0b0e"/>
      <path d="M518 156 L562 436" stroke="#241412" stroke-width="11" stroke-linecap="round"/>
      <circle cx="518" cy="156" r="20" fill="#a87e42"/>
      <text x="400" y="666" text-anchor="middle" fill="#321614" font-family="Georgia, serif" font-size="32" letter-spacing="11">VELVET QUARTET</text>
      <text x="400" y="704" text-anchor="middle" fill="#73584b" font-family="'SFMono-Regular', monospace" font-size="15" letter-spacing="6">STEREO LP · 180G PRESSING</text>
    </svg>
  `);
}

function buildJapaneseCityCover(): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#192338"/>
          <stop offset="56%" stop-color="#354b6e"/>
          <stop offset="100%" stop-color="#c48a78"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect x="44" y="44" width="712" height="712" fill="none" stroke="#f5eee6" stroke-opacity="0.3" stroke-width="1.5"/>
      <circle cx="560" cy="224" r="92" fill="#f5eee6" opacity="0.92"/>
      <circle cx="592" cy="202" r="84" fill="#23324d"/>
      <path d="M44 552 Q210 492 380 546 T756 520 L756 756 L44 756 Z" fill="#182030" opacity="0.9"/>
      <path d="M44 624 Q240 584 440 626 T756 606 L756 756 L44 756 Z" fill="#101521"/>
      <line x1="88" y1="112" x2="210" y2="112" stroke="#f5eee6" stroke-opacity="0.55" stroke-width="1.5"/>
      <text x="88" y="96" fill="#f5eee6" opacity="0.88" font-family="'SFMono-Regular', monospace" font-size="16" letter-spacing="6">1989 EDITION</text>
      <text x="88" y="706" fill="#f5eee6" opacity="0.9" font-family="Georgia, serif" font-size="26" letter-spacing="9">MOONLIGHT BALCONY</text>
    </svg>
  `);
}

function buildCedarForestCover(): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#17241e"/>
          <stop offset="52%" stop-color="#283d33"/>
          <stop offset="100%" stop-color="#0d1411"/>
        </linearGradient>
        <radialGradient id="mist" cx="50%" cy="34%" r="48%">
          <stop offset="0%" stop-color="#d8dfd2" stop-opacity="0.42"/>
          <stop offset="100%" stop-color="#17241e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect width="800" height="800" fill="url(#mist)"/>
      <circle cx="400" cy="272" r="82" fill="#eceee6" opacity="0.86"/>
      <path d="M0 536 L146 392 L268 518 L412 346 L568 504 L694 388 L800 486 L800 800 L0 800 Z" fill="#121c17"/>
      <path d="M0 634 L190 506 L360 622 L532 496 L690 610 L800 556 L800 800 L0 800 Z" fill="#0b110e"/>
      <rect x="44" y="44" width="712" height="712" fill="none" stroke="#d8dfd2" stroke-opacity="0.22" stroke-width="1.5"/>
      <text x="400" y="724" text-anchor="middle" fill="#d8dfd2" opacity="0.82" font-family="Georgia, serif" font-size="22" letter-spacing="10">PINE &amp; MORNING MIST</text>
    </svg>
  `);
}

function buildMinimalistEcmCover(): string {
  return svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#19191b"/>
          <stop offset="100%" stop-color="#2c2a27"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect x="52" y="52" width="696" height="696" fill="none" stroke="#e5dfd5" stroke-opacity="0.2" stroke-width="1.5"/>
      <circle cx="400" cy="390" r="228" fill="none" stroke="#e5dfd5" stroke-opacity="0.16" stroke-width="1.5"/>
      <circle cx="400" cy="390" r="168" fill="none" stroke="#d4a359" stroke-opacity="0.42" stroke-width="2"/>
      <circle cx="400" cy="390" r="108" fill="none" stroke="#e5dfd5" stroke-opacity="0.25" stroke-width="1.2"/>
      <line x1="120" y1="390" x2="680" y2="390" stroke="#d94e34" stroke-opacity="0.72" stroke-width="2"/>
      <circle cx="400" cy="390" r="10" fill="#d94e34"/>
      <text x="86" y="114" fill="#e5dfd5" opacity="0.8" font-family="'SFMono-Regular', monospace" font-size="16" letter-spacing="6">ECM / MONO SESSION 432HZ</text>
      <text x="86" y="706" fill="#e5dfd5" opacity="0.88" font-family="Georgia, serif" font-size="26" letter-spacing="8">NORTHERN FREQUENCIES</text>
    </svg>
  `);
}

export const CURATED_SONGS: Song[] = [
  {
    id: 'curated-1',
    title: '霓虹雨夜慢行',
    artist: '林澈 & Midnight Trio',
    album: '雨落东京 02:14',
    duration: '03:48',
    cover: buildMidnightBlueNoteCover(),
    lyric: '路灯落在积水的街角，耳机里刚好循环到最温柔的副歌。',
    palette: {
      bg1: '#0f131b',
      bg2: '#1f2837',
      accent: '#d9ab66',
      accent2: '#7a94b8',
      text: '#f3eee6',
      muted: '#b5afa4',
      light: false,
    },
    previewUrl: null,
    chordFreqs: [220, 261.63, 329.63, 392.0, 493.88],
    bpm: 84,
  },
  {
    id: 'curated-2',
    title: '落日海岸线',
    artist: '苏屿 Summer Shore',
    album: '琥珀色浪潮',
    duration: '04:12',
    cover: buildAmberDuskCover(),
    lyric: '海风把黄昏吹成橘色胶片，这一刻只想把旋律留给晚霞。',
    palette: {
      bg1: '#1d120d',
      bg2: '#552b19',
      accent: '#e2a35d',
      accent2: '#c95e3a',
      text: '#f6efe4',
      muted: '#d8c2ab',
      light: false,
    },
    previewUrl: null,
    chordFreqs: [196.0, 246.94, 293.66, 369.99, 440.0],
    bpm: 92,
  },
  {
    id: 'curated-3',
    title: '绒面爵士午后',
    artist: '陆沉 Quartet',
    album: '酒红与奶油胶片',
    duration: '04:26',
    cover: buildVelvetJazzCover(),
    lyric: '黑胶针尖落下时，咖啡香气和萨克斯一同漫过整个下午。',
    palette: {
      bg1: '#f4ede1',
      bg2: '#dfd1bc',
      accent: '#7d2025',
      accent2: '#a87d43',
      text: '#231614',
      muted: '#6e5c52',
      light: true,
    },
    previewUrl: null,
    chordFreqs: [174.61, 220.0, 261.63, 329.63, 392.0],
    bpm: 76,
  },
  {
    id: 'curated-4',
    title: '微醺月光阳台',
    artist: '星野晴子 City Pop',
    album: '湾岸 1989',
    duration: '03:35',
    cover: buildJapaneseCityCover(),
    lyric: '晚风掠过海岸线与半弯新月，城市在鼓点里慢慢亮起灯火。',
    palette: {
      bg1: '#151c2c',
      bg2: '#31415f',
      accent: '#d89b82',
      accent2: '#89a3c4',
      text: '#f5f0ea',
      muted: '#bcc4d2',
      light: false,
    },
    previewUrl: null,
    chordFreqs: [261.63, 329.63, 392.0, 493.88, 587.33],
    bpm: 108,
  },
  {
    id: 'curated-5',
    title: '晨雾松林日记',
    artist: '山谷回声 Echo Valley',
    album: '雪松白噪音',
    duration: '03:54',
    cover: buildCedarForestCover(),
    lyric: '推开木屋窗户的那秒，风声与指弹吉他恰好落在同一拍。',
    palette: {
      bg1: '#101915',
      bg2: '#23352c',
      accent: '#8eb69b',
      accent2: '#c8b48a',
      text: '#edf1eb',
      muted: '#a6b3aa',
      light: false,
    },
    previewUrl: null,
    chordFreqs: [164.81, 246.94, 293.66, 369.99, 493.88],
    bpm: 80,
  },
  {
    id: 'curated-6',
    title: '极光频率 432Hz',
    artist: 'Nordic Pulse',
    album: 'Northern Frequencies',
    duration: '04:05',
    cover: buildMinimalistEcmCover(),
    lyric: '在零下十度的夜空下，听见模拟合成器像雾一样缓缓铺开。',
    palette: {
      bg1: '#131314',
      bg2: '#272522',
      accent: '#d94e34',
      accent2: '#d4a359',
      text: '#f2ede4',
      muted: '#a8a196',
      light: false,
    },
    previewUrl: null,
    chordFreqs: [233.08, 293.66, 349.23, 440.0, 523.25],
    bpm: 98,
  },
];

export const PRESET_PALETTES: Record<Exclude<PaletteKey, 'auto'>, Palette> = {
  midnight: {
    bg1: '#0f1218',
    bg2: '#1f2532',
    accent: '#d4a359',
    accent2: '#7a94b8',
    text: '#f3eee6',
    muted: '#a9a296',
    light: false,
  },
  sunset: {
    bg1: '#1d120d',
    bg2: '#552b19',
    accent: '#e2a35d',
    accent2: '#d94e34',
    text: '#f6efe4',
    muted: '#d8c2ab',
    light: false,
  },
  pastel: {
    bg1: '#161d2b',
    bg2: '#32435e',
    accent: '#d89b82',
    accent2: '#89a3c4',
    text: '#f4efe9',
    muted: '#b8c0ce',
    light: false,
  },
  cream: {
    bg1: '#f4ede1',
    bg2: '#dfd1bc',
    accent: '#7d2025',
    accent2: '#a87d43',
    text: '#221513',
    muted: '#6e5c52',
    light: true,
  },
  emerald: {
    bg1: '#101915',
    bg2: '#23352c',
    accent: '#8eb69b',
    accent2: '#c8b48a',
    text: '#edf1eb',
    muted: '#a6b3aa',
    light: false,
  },
  ivory: {
    bg1: '#f7f5f0',
    bg2: '#e8e3d9',
    accent: '#1c1917',
    accent2: '#c2410c',
    text: '#161412',
    muted: '#635c54',
    light: true,
  },
  sunshine: {
    bg1: '#fff8ec',
    bg2: '#fde3c2',
    accent: '#d95d32',
    accent2: '#eab308',
    text: '#291b14',
    muted: '#7a5a44',
    light: true,
  },
  sky: {
    bg1: '#f1f7fb',
    bg2: '#d8ebf5',
    accent: '#e06d3b',
    accent2: '#2d8bb5',
    text: '#172733',
    muted: '#526b7c',
    light: true,
  },
};

export const RATIOS: Record<RatioId, { w: number; h: number; label: string; desc: string }> = {
  '3:4': { w: 900, h: 1200, label: '3:4', desc: '小红书 / 经典' },
  '4:5': { w: 960, h: 1200, label: '4:5', desc: '画廊黄金比' },
  '9:16': { w: 720, h: 1280, label: '9:16', desc: '竖屏故事' },
  '1:1': { w: 1000, h: 1000, label: '1:1', desc: '唱片方封' },
};

export const TEMPLATES: Array<{
  id: TemplateId;
  code: string;
  name: string;
  desc: string;
}> = [
  { id: 'vinyl', code: '01', name: '旋转黑胶', desc: '唱臂落针 · 唱片光影' },
  { id: 'polaroid', code: '02', name: '拍立得胶片', desc: '复古相纸 · 漏光印戳' },
  { id: 'magazine', code: '03', name: '乐评特刊', desc: '全幅大片 · 杂志刊头' },
  { id: 'cassette', code: '04', name: '模拟磁带', desc: '双轮卷轴 · 铬带随身听' },
  { id: 'cd', code: '05', name: '透明 CD 盒', desc: '亚克力壳 · 激光彩虹碟' },
  { id: 'glass', code: '06', name: '磨砂画框', desc: '通透层叠 · 声波光晕' },
];

export const FONT_STYLES: Array<{
  id: FontStyleId;
  name: string;
  titleFont: string;
  bodyFont: string;
}> = [
  {
    id: 'serif',
    name: '杂志衬线',
    titleFont: 'Georgia, "Songti SC", "Noto Serif SC", "STSong", serif',
    bodyFont: 'Georgia, "Songti SC", "STSong", serif',
  },
  {
    id: 'modern',
    name: '瑞士黑体',
    titleFont: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif',
    bodyFont: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif',
  },
  {
    id: 'retro',
    name: '器材等宽',
    titleFont: '"SFMono-Regular", Consolas, "PingFang SC", monospace',
    bodyFont: '"SFMono-Regular", Consolas, "PingFang SC", monospace',
  },
  {
    id: 'poetic',
    name: '手记楷韵',
    titleFont: '"Kaiti SC", "STKaiti", "KaiTi", Georgia, serif',
    bodyFont: '"Kaiti SC", "STKaiti", "KaiTi", Georgia, serif',
  },
];

export const INSPIRATION_QUOTES: string[] = [
  '有些旋律一响起，就把某年夏天的晚风重新带回眼前。',
  '耳机隔绝了喧嚣，留下一整个只属于此刻的安静宇宙。',
  '把循环了一百遍的副歌印成一张唱片，寄给今晚还没睡的你。',
  '城市很吵，但在这三分钟四十八秒里，世界安静得刚刚好。',
  '喜欢一首歌，常常是因为它替我们说出了没来得及寄出的话。',
  '雨停之前，再把这张黑胶从 A 面放到 B 面吧。',
  '所有温柔的重逢，都配得上一首恰到好处的配乐。',
];

export const MOOD_TAGS: string[] = [
  '全部',
  '深夜循环',
  '黑胶馆',
  '落日漫步',
  '爵士午后',
  '山野白噪音',
  '千禧唱片',
  '独处配乐',
];

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'post-seed-1',
    author: {
      name: '林深见鹿',
      handle: '@linshen.fm',
      avatar: buildAvatarDataUrl('林', '#272b36', '#e9be78'),
      bio: '收集凌晨两点的蓝调与城市雨声',
    },
    song: CURATED_SONGS[0],
    config: {
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
    },
    palette: CURATED_SONGS[0].palette!,
    caption: '下班路上遇到一场小雨，这首蓝调黑胶配雨声太舒服了，分享给今晚也在路上的朋友。',
    tags: ['深夜循环', '黑胶馆'],
    likes: 186,
    likedByMe: false,
    savedByMe: true,
    comments: [
      {
        id: 'c-1',
        author: '橘子汽水',
        avatar: buildAvatarDataUrl('橘', '#542c1d', '#f3dfc1'),
        content: '黑胶唱臂和暗金配色太有唱片行质感了，点做同款试试。',
        createdAt: Date.now() - 1000 * 60 * 35,
      },
      {
        id: 'c-2',
        author: '阿泽在听歌',
        avatar: buildAvatarDataUrl('泽', '#1e2c3a', '#e2d7c5'),
        content: '旋律很克制也很温柔，戴上耳机一秒进东京雨夜。',
        createdAt: Date.now() - 1000 * 60 * 12,
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 48,
  },
  {
    id: 'post-seed-2',
    author: {
      name: '夏至未眠',
      handle: '@summer.film',
      avatar: buildAvatarDataUrl('夏', '#612d1a', '#f6e7cb'),
      bio: '胶片摄影 & 落日音乐收藏者',
    },
    song: CURATED_SONGS[1],
    config: {
      mode: 'dynamic',
      template: 'polaroid',
      ratio: '3:4',
      paletteKey: 'sunset',
      fontStyle: 'poetic',
      lyric: CURATED_SONGS[1].lyric,
      showLyric: true,
      showWave: true,
      showProgress: false,
      showQr: true,
      filmGrain: true,
    },
    palette: PRESET_PALETTES.sunset,
    caption: '用拍立得相纸模板配了这首《落日海岸线》，胶片日期印戳和焦糖琥珀色绝配。',
    tags: ['落日漫步', '独处配乐'],
    likes: 342,
    likedByMe: true,
    savedByMe: false,
    comments: [
      {
        id: 'c-3',
        author: '晚风寄信',
        avatar: buildAvatarDataUrl('风', '#332822', '#e2a35d'),
        content: '这个暖琥珀色配手记楷韵太有温度了，已经收藏。',
        createdAt: Date.now() - 1000 * 60 * 95,
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 140,
  },
  {
    id: 'post-seed-3',
    author: {
      name: '旧唱片店主',
      handle: '@velvet.records',
      avatar: buildAvatarDataUrl('旧', '#5e1a1e', '#f4ede1'),
      bio: '每天推荐一张适合配黑咖啡的唱片',
    },
    song: CURATED_SONGS[2],
    config: {
      mode: 'static',
      template: 'magazine',
      ratio: '3:4',
      paletteKey: 'cream',
      fontStyle: 'serif',
      lyric: CURATED_SONGS[2].lyric,
      showLyric: true,
      showWave: false,
      showProgress: true,
      showQr: true,
      filmGrain: true,
    },
    palette: PRESET_PALETTES.cream,
    caption: '周末午后咖啡馆常驻的爵士四重奏，奶油纸感和酒红色太像真实印刷的唱片特刊。',
    tags: ['爵士午后', '黑胶馆'],
    likes: 229,
    likedByMe: false,
    savedByMe: false,
    comments: [],
    createdAt: Date.now() - 1000 * 60 * 320,
  },
  {
    id: 'post-seed-4',
    author: {
      name: '湾岸漫游者',
      handle: '@bay1989.cd',
      avatar: buildAvatarDataUrl('湾', '#26344a', '#e8c4b4'),
      bio: 'City Pop 与千禧实体 CD 收藏',
    },
    song: CURATED_SONGS[3],
    config: {
      mode: 'dynamic',
      template: 'cd',
      ratio: '3:4',
      paletteKey: 'pastel',
      fontStyle: 'retro',
      lyric: CURATED_SONGS[3].lyric,
      showLyric: true,
      showWave: true,
      showProgress: true,
      showQr: true,
      filmGrain: true,
    },
    palette: PRESET_PALETTES.pastel,
    caption: '谁能拒绝透明亚克力 CD 盒啊，City Pop 配雾蓝灰与陶土色直接回到 1989。',
    tags: ['千禧唱片', '落日漫步'],
    likes: 418,
    likedByMe: false,
    savedByMe: true,
    comments: [
      {
        id: 'c-4',
        author: '星河巡航',
        avatar: buildAvatarDataUrl('星', '#212936', '#d4a359'),
        content: '实体碟的透明壳反光太舒服了，动起来非常耐看。',
        createdAt: Date.now() - 1000 * 60 * 18,
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 480,
  },
  {
    id: 'post-seed-5',
    author: {
      name: '山野收集癖',
      handle: '@forest.tape',
      avatar: buildAvatarDataUrl('山', '#1c2f26', '#d8dfd2'),
      bio: '把大自然和民谣装进铬带磁带里',
    },
    song: CURATED_SONGS[4],
    config: {
      mode: 'dynamic',
      template: 'cassette',
      ratio: '3:4',
      paletteKey: 'emerald',
      fontStyle: 'modern',
      lyric: CURATED_SONGS[4].lyric,
      showLyric: true,
      showWave: true,
      showProgress: true,
      showQr: true,
      filmGrain: true,
    },
    palette: PRESET_PALETTES.emerald,
    caption: '看书和写字时的常驻配乐，复古磁带双轮慢慢转，心一下就静下来了。',
    tags: ['山野白噪音', '独处配乐'],
    likes: 154,
    likedByMe: false,
    savedByMe: false,
    comments: [],
    createdAt: Date.now() - 1000 * 60 * 720,
  },
  {
    id: 'post-seed-6',
    author: {
      name: '北欧频率台',
      handle: '@ecm.radio',
      avatar: buildAvatarDataUrl('北', '#1f1d1b', '#d94e34'),
      bio: '环境音乐 · ECM 风格 · 模拟合成器',
    },
    song: CURATED_SONGS[5],
    config: {
      mode: 'dynamic',
      template: 'glass',
      ratio: '3:4',
      paletteKey: 'auto',
      fontStyle: 'retro',
      lyric: CURATED_SONGS[5].lyric,
      showLyric: true,
      showWave: true,
      showProgress: true,
      showQr: true,
      filmGrain: true,
    },
    palette: CURATED_SONGS[5].palette!,
    caption: '深夜戴上监听耳机听 432Hz 环境电子，极简炭黑配一抹朱砂红真的高级。',
    tags: ['深夜循环', '独处配乐'],
    likes: 271,
    likedByMe: false,
    savedByMe: false,
    comments: [],
    createdAt: Date.now() - 1000 * 60 * 960,
  },
];
