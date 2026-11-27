import type {
  PosterConfig,
  PromoDirectionId,
  PromoPlan,
  PromoThemeStyle,
  Song,
  TemplateId,
} from '../types';

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  vinyl: '旋转黑胶',
  polaroid: '拍立得胶片',
  magazine: '乐评特刊',
  cassette: '模拟磁带',
  cd: '透明 CD 盒',
  glass: '磨砂画框',
};

export type SongMoodId = 'late-night' | 'retro-city' | 'indie-folk' | 'upbeat-pop';

export interface SongMoodProfile {
  id: SongMoodId;
  label: string;
  themeStyle: PromoThemeStyle;
  badge: string;
  subline: string;
  slogan: string;
  s2Heading: string;
  s3Heading: string;
  highlights: PromoPlan['s3Highlights'];
  s4Subline: string;
  s4Cta: string;
}

function detectSongMood(song: Song, config: PosterConfig): SongMoodId {
  const hay = `${song.title} ${song.artist} ${song.album} ${song.lyric} ${config.lyric}`.toLowerCase();
  const bpm = song.bpm || 0;

  if (/city pop|198|199|复古|磁带|卡带|落日|海岸|霓虹|阳台|微醺|cd|disco|synth/.test(hay) || config.template === 'cassette' || config.template === 'cd') {
    return 'retro-city';
  }
  if (/民谣|吉他|森林|松林|山野|海风|清晨|旅途|日记|草地|阳光|warm|folk/.test(hay) || config.template === 'polaroid') {
    return 'indie-folk';
  }
  if (bpm >= 108 || /热歌|舞曲|电音|节拍|狂欢|夏天|summer|dance|club|rock/.test(hay)) {
    return 'upbeat-pop';
  }
  if (bpm > 0 && bpm <= 84) {
    return 'late-night';
  }
  // Check romantic/ballad/night clues
  if (/夜|雨|蓝调|深夜|孤独|想念|爱|初恋|回忆|失眠|jazz|midnight|blue|rain/.test(hay)) {
    return 'late-night';
  }
  return 'indie-folk';
}

function buildMoodProfile(mood: SongMoodId, song: Song, config: PosterConfig): SongMoodProfile {
  const tplName = TEMPLATE_LABELS[config.template] || '黑胶画报';
  const bpmText = song.bpm ? `${song.bpm} BPM` : '立体声';

  switch (mood) {
    case 'late-night':
      return {
        id: 'late-night',
        label: '深夜故事 · 蓝调',
        themeStyle: 'darkroom',
        badge: '深夜循环 · 独家推荐',
        subline: `${song.artist} · 一开口就落进夜色里的旋律`,
        slogan: '适合戴上耳机，在零点后慢慢重听',
        s2Heading: `这一帧夜色，装裱进「${tplName}」`,
        s3Heading: '为什么单曲循环这首歌',
        highlights: [
          { title: '深夜氛围叙事感', sub: `《${song.title}》用克制编曲留住余温`, tag: 'MOOD' },
          { title: '高光词句共鸣', sub: '把最戳心的一句歌词直接印上画面', tag: 'LYRIC' },
          { title: '夜色黑胶级听感', sub: `${bpmText} 律动与模拟纹理同步呼吸`, tag: 'HI-FI' },
        ],
        s4Subline: `${song.artist} · 扫码重温这段深夜旋律`,
        s4Cta: '点击试听 · 留存这一刻',
      };

    case 'retro-city':
      return {
        id: 'retro-city',
        label: '复古霓虹 · 浪漫',
        themeStyle: 'neon',
        badge: 'RETRO WAVE · 复古必听',
        subline: `${song.artist} · 穿过晚风与霓虹的律动节拍`,
        slogan: '把黄金年代的胶片质感与音轨装进兜里',
        s2Heading: `用「${tplName}」定格复古切片`,
        s3Heading: '这一首的复古浪漫密码',
        highlights: [
          { title: '复古合成器律动', sub: `${bpmText} 轻快节拍自带胶片滤镜`, tag: 'VIBE' },
          { title: '实体唱片仪式感', sub: '黑胶/磁带/透明 CD 多形态自由演绎', tag: 'DISK' },
          { title: '多画幅社交直出', sub: '9:16 竖屏故事 & 3:4 图文一键切换', tag: 'SHARE' },
        ],
        s4Subline: `${song.artist} · 扫码开启这场复古漫游`,
        s4Cta: 'SONIC ARCHIVE · 扫码听歌',
      };

    case 'upbeat-pop':
      return {
        id: 'upbeat-pop',
        label: '热歌安利 · 高能',
        themeStyle: 'editorial',
        badge: 'HOT TRACK · 今日强推',
        subline: `${song.artist} · 能量瞬间拉满的循环热单`,
        slogan: '前奏响起的第 3 秒，就忍不住跟着节拍点头',
        s2Heading: `《${song.title}》多维度视觉呈现`,
        s3Heading: '今日歌单第一名推荐理由',
        highlights: [
          { title: '抓耳副歌强记忆点', sub: `《${song.title}》循环率居高不下`, tag: 'TOP 1' },
          { title: '真实音频频谱联动', sub: '每一条声波柱随真实鼓点精准跃动', tag: 'BEAT' },
          { title: '一键导出短视频', sub: '直接生成 9:16 有声 MP4 分享好友', tag: 'MP4' },
        ],
        s4Subline: `${song.artist} · 扫码听原曲并做同款海报`,
        s4Cta: '立即听歌 · 制作同款',
      };

    case 'indie-folk':
    default:
      return {
        id: 'indie-folk',
        label: '治愈叙事 · 胶片',
        themeStyle: 'warm-film',
        badge: 'WARM ARCHIVE · 治愈私藏',
        subline: `${song.artist} · 像一封写给好天气的手写信`,
        slogan: '留住旋律，也留住听歌当下的心境',
        s2Heading: `把《${song.title}》收进「${tplName}」`,
        s3Heading: '值得被好好收藏的三个理由',
        highlights: [
          { title: '温暖通透的声音质感', sub: `《${song.title}》适合漫步与独处时重播`, tag: 'WARM' },
          { title: '文字与光影相衬', sub: '扉页金句搭配自然提取的封面主色调', tag: 'PRINT' },
          { title: '专属可扫码唱片卡', sub: '好友扫码即刻听见你正在循环的歌', tag: 'CARD' },
        ],
        s4Subline: `${song.artist} · 把这段温柔旋律寄给你`,
        s4Cta: '扫码收听 · 收藏这张唱片',
      };
  }
}

/**
 * Generates a curated, song-aware 4-scene PromoPlan with zero external AI model calls.
 * Supports 4 creative directions: smart (auto mood match), single-review, story-emotion, brand-feature.
 */
export function generateSmartPromoPlan(
  song: Song,
  config: PosterConfig,
  lyricsLines: string[] = [],
  direction: PromoDirectionId = 'smart',
  preserveImages: string[] = []
): PromoPlan {
  const mood = detectSongMood(song, config);
  const profile = buildMoodProfile(mood, song, config);
  const title = song.title || '未命名曲目';
  const artist = song.artist || '未知歌手';
  const quoteLine =
    (config.lyric || '').trim() ||
    lyricsLines[0]?.trim() ||
    song.lyric?.trim() ||
    `正在循环《${title}》，把这段旋律留给你。`;

  const s2VisualMode: PromoPlan['s2VisualMode'] =
    preserveImages.length > 0 ? 'custom-images' : 'templates';

  if (direction === 'single-review') {
    return {
      direction,
      themeStyle: 'editorial',
      badgeText: `单曲乐评 · ${artist}`,
      s1Headline: `《${title}》`,
      s1Subline: `${artist} · 本周私藏循环 Top 1`,
      s1Slogan: '不是每一首歌，都值得单独做一张画报',
      s2Heading: `为什么推荐你听《${title}》`,
      s2VisualMode,
      s3Kicker: 'EDITOR REVIEW · 乐评亮点',
      s3Heading: '三个入坑这首歌的瞬间',
      s3Highlights: [
        { title: '开篇即入戏的听感', sub: `《${title}》前奏响起就有画面感`, tag: '01' },
        { title: '越听越耐品的细节', sub: `${artist} 的声线与编曲层次分明`, tag: '02' },
        { title: '最触动人心的那句词', sub: quoteLine.slice(0, 26), tag: '03' },
      ],
      s4Headline: `今晚，把《${title}》放进歌单`,
      s4Subline: `${artist} · 扫码即可试听同款音画`,
      s4Cta: '去听完整版 · 制作同款',
      customImages: preserveImages,
    };
  }

  if (direction === 'story-emotion') {
    return {
      direction,
      themeStyle: 'warm-film',
      badgeText: 'SOUNDTRACK · 情绪切片',
      s1Headline: `把《${title}》留给今晚`,
      s1Subline: `${artist} · 有些话，唱出来才更清楚`,
      s1Slogan: quoteLine.slice(0, 28),
      s2Heading: '每张画面，都是此刻的心境',
      s2VisualMode,
      s3Kicker: 'MOOD & MEMORY · 情绪共鸣',
      s3Heading: '听见这首歌时会想起的事',
      s3Highlights: [
        { title: '耳机里的私人电影', sub: '通勤、夜行或发呆时的绝配 BGM', tag: 'SCENE' },
        { title: '一句词，讲完一段故事', sub: quoteLine.slice(0, 26), tag: 'QUOTE' },
        { title: '把瞬间封存成动态画报', sub: '可保存高清图片或分享给想念的人', tag: 'KEEP' },
      ],
      s4Headline: `《${title}》`,
      s4Subline: `${artist} · 希望这首歌也能陪你一程`,
      s4Cta: '扫码接收这份心情',
      customImages: preserveImages,
    };
  }

  if (direction === 'brand-feature') {
    return {
      direction,
      themeStyle: 'darkroom',
      badgeText: '音画 · SONIC ARCHIVE · 专属宣发',
      s1Headline: `《${title}》`,
      s1Subline: `${artist} · 音画动态黑胶制片示例`,
      s1Slogan: '无需外接模型 · 网页端一键生成动态海报与短视频',
      s2Heading: `《${title}》 · 6 套版式自由切换`,
      s2VisualMode,
      s3Kicker: 'CRAFTED IN BROWSER · 创作力引擎',
      s3Heading: '一首歌，玩转多种内容输出',
      s3Highlights: [
        { title: '真实音频 PCM 频谱同步', sub: `按《${title}》实时音轨逐帧编码`, tag: 'MP4' },
        { title: '4 种画幅全平台适配', sub: '3:4 小红书 · 9:16 抖音 · 1:1 封面', tag: '4x' },
        { title: '零外接模型 · 本地直出', sub: '支持自定义图文策划与高清 PNG', tag: '0 API' },
      ],
      s4Headline: `用《${title}》做一张你的专属画报`,
      s4Subline: `${artist} · 扫码试听并一键制作同款`,
      s4Cta: 'SONIC ARCHIVE · 扫码体验',
      customImages: preserveImages,
    };
  }

  // Default: 'smart' mood-matched bespoke plan
  return {
    direction: 'smart',
    themeStyle: profile.themeStyle,
    badgeText: profile.badge,
    s1Headline: `《${title}》`,
    s1Subline: profile.subline,
    s1Slogan: profile.slogan,
    s2Heading: profile.s2Heading,
    s2VisualMode,
    s3Kicker: `SMART PLAN · ${profile.label}`,
    s3Heading: profile.s3Heading,
    s3Highlights: profile.highlights,
    s4Headline: `《${title}》`,
    s4Subline: profile.s4Subline,
    s4Cta: profile.s4Cta,
    customImages: preserveImages,
  };
}
