# 零外接生成模型视频工程完整指南：从宣发/歌词短视频到自动化科普视频架构（ChatGPT 可直接复用版）

> **文档说明**：这是一份自包含的工程规范与复用蓝图，整合了三部分内容：
> 1. 本项目（`音画 SONIC ARCHIVE`）**宣发视频**与**字幕歌词短视频**的 Skill 地址、导演风格规范与零外接模型双通道实现；
> 2. 三个开源视频 Skill（`adithya-s-k/manim_skill`、`heygen-com/hyperframes`、`lemomo-ai/lemo-wake`）的深度拆解与商用协议边界；
> 3. 面向**无外接生成模型自动化生成科普视频**的融合架构、`storyboard.schema.json` 契约、关键代码范式与可直接交给 ChatGPT 的 System Prompt。

---

## 一、本项目 Skill 地址与核心代码资产索引（宣发视频 & 字幕歌词短视频）

### 1. Skill 与架构规范文档
- **制作指南 Skill**：`c:\DAVYLAB\spark-me\docs\MOTION_STUDIO_SKILL.md`
- **零外接模型融合与量化验收标准**：`c:\DAVYLAB\spark-me\docs\MOTION_FUSION_ACCEPTANCE.md`
- **本地短视频渲染工厂说明**：`c:\DAVYLAB\spark-me\studio-render\README.md`

### 2. 宣发视频与字幕歌词短视频模板 / 导演风格库（`studio-render/`）
- **产品宣发短片（4 幕 12s，9:16）**：
  - 模板：`c:\DAVYLAB\spark-me\studio-render\templates\product-promo.html`
  - 导演规范：`c:\DAVYLAB\spark-me\studio-render\styles\07-product-launch.STYLE.md`
  - 预设参数：`c:\DAVYLAB\spark-me\studio-render\presets\promo-launch.json`
- **字幕歌词音乐短视频（4 幕 15s，9:16）**：
  - 模板：`c:\DAVYLAB\spark-me\studio-render\templates\music-short-mv.html`
  - 导演规范（6 套）：`c:\DAVYLAB\spark-me\studio-render\styles\01-vinyl-darkroom.STYLE.md` ～ `06-liquid-glass.STYLE.md`
  - 预设参数：`c:\DAVYLAB\spark-me\studio-render\presets\demo-song-project.json`
- **动态海报 & 批量渲染**：
  - 模板与清单：`c:\DAVYLAB\spark-me\studio-render\templates\dynamic-poster.html`、`c:\DAVYLAB\spark-me\studio-render\presets\batch-manifest.json`
  - 语义分层 SVG：`c:\DAVYLAB\spark-me\studio-render\assets\sonic-logo.svg`

### 3. 本地渲染核心与 Web 端零模型导出引擎
- **本地工厂核心（Node + Playwright + GSAP + FFmpeg）**：
  - 确定性运行时：`c:\DAVYLAB\spark-me\studio-render\core\hyper-runtime.js`
  - 管道直连渲染器：`c:\DAVYLAB\spark-me\studio-render\core\render-video.mjs`
  - 纯代码和弦 WAV 合成器：`c:\DAVYLAB\spark-me\studio-render\core\synth-audio.mjs`
  - 自动化 QA 探针：`c:\DAVYLAB\spark-me\studio-render\core\qa-probe.mjs`
  - 批量渲染入口：`c:\DAVYLAB\spark-me\studio-render\core\batch-render.mjs`
- **Web 端纯前端导出核心（Canvas 2D + WebCodecs + mp4-muxer）**：
  - 4 幕多镜头导演引擎：`c:\DAVYLAB\spark-me\src\engine\multiSceneRenderer.ts`
  - 时间窗与缓动库：`c:\DAVYLAB\spark-me\src\utils\sceneTimeline.ts`
  - 确定性数学与真 PCM 频谱同步：`c:\DAVYLAB\spark-me\src\utils\deterministicMotion.ts`
  - WebCodecs H.264/AAC MP4 导出器：`c:\DAVYLAB\spark-me\src\utils\exporter.ts`
  - 文案/曲风智能策划：`c:\DAVYLAB\spark-me\src\utils\promoPlanner.ts`

---

## 二、本项目已验证的「宣发 & 字幕歌词短视频」设计规范浓缩

### 1. 四幕结构节奏契约
- **宣发短片（默认基准 12s，支持等比缩放如 6s）**：
  - `S1 (0.0s ~ 2.6s)`：Pixel2Motion 品牌 SVG 描边入场 + 核心定位 Slogan（`power3.out`）。
  - `S2 (2.9s ~ 5.9s)`：多版式/功能卡片矩阵（`back.out(1.2)` 弹性错峰弹出）。
  - `S3 (6.2s ~ 9.2s)`：核心指标/卖点亮眼展示（左侧滑入 + 数值强调）。
  - `S4 (9.5s ~ 12.0s)`：品牌行动号召（CTA）定格收尾 + 音频 `-14 LUFS` 淡出。
- **字幕歌词短视频（默认基准 15s，支持等比缩放如 8s/10s）**：
  - `S1 (0.0s ~ 2.35s)`：品牌矢量片头。
  - `S2 (2.35s ~ 7.5s)`：黑胶唱片恒定角速度旋转 + 封面 2.5D 呼吸缩放 + 斜向玻璃扫光 + 底部声波柱联动。
  - `S3 (7.8s ~ 12.2s)`：歌词金句逐行 `stagger` 浮现与高亮。
  - `S4 (12.45s ~ 15.0s)`：收藏卡/扫码同款定帧结尾。

### 2. 六套基础运动不变量（可直接迁移为科普视频的视觉风格预设）
1. **Vinyl Darkroom（暗房深邃）**：`#0f1218` → `#1c2738` + 暖金 `#e9be78`，恒速旋转圆环 + 35mm 确定性胶片颗粒。
2. **Morning Vinyl（日光纸感）**：暖纸色 `#f4ede1` 配焦糖琥珀 `#e2a35d`，慢速钟摆呼吸 + 温和推拉（Ken Burns）。
3. **Editorial Zine（独立刊物）**：上下高反差压暗 scrim + 衬线大刊头 + 网格辅助线，保障文字绝对可读。
4. **Y2K Acrylic（千禧亚克力）**：圆锥虹彩渐变旋转 + 透明材质斜向高光扫光。
5. **Chrome Cassette（机械工业）**：双转轮同步机械旋转 + 金属盒身微幅悬浮。
6. **Liquid Glass（声学流体）**：外层同心光环受真实音频低频能量脉冲驱动，内层反向 2.5D 视差。

---

## 三、三大开源视频 Skill 深度对比研究

### 1. `adithya-s-k/manim_skill`（数学/科学解释动画大脑）
- **GitHub**：`https://github.com/adithya-s-k/manim_skill`
- **核心架构**：拆分为 **`manim-composer`**（先规划后写代码）+ **`manimce-best-practices`**（Manim 社区版规则）+ **`manimgl-best-practices`**（OpenGL 版规则）。
- **核心工作流**：
  1. 接到选题后不直接写代码，先由 `manim-composer` 调研概念并输出 **`scenes.md` 蓝图**：定义 **Hook（钩子）→ Intuition（直觉）→ Aha Moment（顿悟点）**、语义配色映射（例如输入用蓝色、输出用绿色、高亮用黄色）、逐幕 `Mobject` 元素、动画流与讲解停顿点（`self.wait()`）。
  2. 再交由编码规范技能生成 **ManimCE**（`from manim import *`）代码。
- **可复用核心原则**：
  - **渐进揭示（Progressive Revelation）**：公式与复杂图形必须分步拆解出现，禁止一次全屏堆砌。
  - **视觉连续性（Visual Continuity）**：优先使用 `Transform`、`ReplacementTransform`、`TransformMatchingTex` 让旧元素变形为新元素，减少生硬切屏。
  - **节奏停顿（Pacing）**：关键推导或顿悟后必须留出消化时间。
- **在科普视频中的强项**：数学公式推导、函数图像与切线积分、物理场/波/轨道模拟、算法步骤演示。

### 2. `heygen-com/hyperframes`（HTML/CSS/GSAP 确定性网页转视频引擎）
- **GitHub**：`https://github.com/heygen-com/hyperframes`（Apache-2.0 协议）
- **核心架构**：把任意 HTML/CSS/SVG/Canvas 页面变成帧精确 MP4 的框架（CLI + Core + Puppeteer Engine + Producer + Studio）。
- **核心契约（Render Contract）**：
  1. **HTML 舞台声明**：根元素声明 `data-composition-id`、`data-width`、`data-height`、`data-duration`、`data-fps`、`data-composition-variables`。
  2. **可寻址时间轴**：使用 `gsap.timeline({ paused: true })` 编排转场，并将时间轴注册到 `window.__timelines` / `__hyperSeek(tSec)`，由无头浏览器按 `t = f / fps` 精确步进驱动。
  3. **前置质检（`lint` & `check`）**：静态校验时间线结构，并用无头 Chrome 检测运行时报错、排版溢出与 WCAG 对比度。
- **在科普视频中的强项**：现代排版、高亮动态字幕、知识对比卡片、数据图表（SVG/Canvas/D3）、多画幅适配（16:9 / 9:16）与全片统一转场包装。

### 3. `lemomo-ai/lemo-wake`（单静图解构与纯代码循环动效思路）
- **GitHub**：`https://github.com/lemomo-ai/lemo-wake`
- **核心工作流**：
  1. **`/lemo-wake:layers`**：将单张静图拆解为透明 PNG 图层 + 背景补全 + 深度图，并输出记录坐标、边界框和 `z-index` 层级的 `layers.json` 与 `.psd`。
  2. **`/lemo-wake:wake`**：分析图中文字、主体、形状与光源，编写纯代码动画并首尾闭环（周期函数），本地无头渲染输出 ~5 秒无缝循环 MP4 / GIF / WebP / Live Photo。
- **⚠️ 商用协议红线**：
  - `lemo-wake` 仓库为 **`CC-BY-NC-4.0`（禁止商用）**，且其图像拆分依赖本地视觉模型权重。
  - **正确复用方式**：**严禁复制其代码或模型权重**；仅借鉴其「分层语义结构（`layers.json`）+ 2.5D 呼吸视差 + 光影扫光 + 首尾周期闭合」理念，在自己的程序中用**纯代码/数学函数 + SVG 分层或预制透明图层**实现，100% 规避版权与外接模型依赖。

---

## 四、无外接模型视频生成的核心工程实现（可直接抄作业的 6 个关键机制）

以下机制均已在本项目 `studio-render/` 与 `src/` 中实战验证：

### 1. 确定性时间与伪随机运行时（彻底解决掉帧、闪烁、不可复现）
- 禁止使用未加种子的 `Math.random()`、`Date.now()`、`performance.now()` 和不受控的 CSS `@keyframes`。
- 使用 **Mulberry32 确定性 PRNG** 替代 `Math.random()`（保证颗粒、星尘、噪点在任意机器逐帧一致）：
  ```js
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  ```
- 所有画面渲染写成纯函数 `renderAt(tSec)` 或受控 `gsap.timeline({ paused: true }).seek(tSec, false)`，每次寻址后等待双 `requestAnimationFrame` 再截图，确保浏览器布局与绘制完全落帧。

### 2. 重叠交叉淡入淡出时间窗（零黑帧转场）
- 相邻幕在进度比例上设置 **3%~5% 重叠窗口**（例如 S1 `[0.0, 0.36]`、S2 `[0.32, 0.65]`）。
- 通过 `computeSceneAlpha(globalProgress, win)` + `easeInOutSine` 计算透明度，确保任何帧都至少有一个 Scene 可见，杜绝切幕闪烁。

### 3. 两种零外接模型导出通道（按运行环境二选一）
- **通道 A：纯浏览器直出（Web SaaS / 在线工具首选）**
  - 离屏 `Canvas 2D` 逐帧绘制 + `AudioContext` 离线解码真实音频 PCM（提取多频段能量驱动声波/动效）+ **`WebCodecs`（`VideoEncoder` `avc1.420028` + `AudioEncoder` `mp4a.40.2`）** + **`mp4-muxer`** 内存直出带音轨 H.264 `.mp4`（不支持环境降级 `MediaRecorder`）。
- **通道 B：Node / Python 本地无头工厂（后端批量出片 / 复杂排版首选）**
  - 本地 HTTP 静态服务加载 HTML 舞台 → Playwright 注入 `window.__HYPER_CAPTURE__ = true` 与剧本 JSON → 逐帧调用 `window.__hyperSeek(tSec)` 并 `page.screenshot({ type: 'png' })` → **直接通过 `stdin` 管道（`image2pipe`）喂给 FFmpeg** 实时压制 H.264（`-c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart`），零中间 PNG 落盘 I/O 瓶颈。

### 4. 音频先行（Audio-First）与 `-14 LUFS` 广播级混音母带
- **口播/配乐驱动时长**：有真实音频时，先测量每段口播/音乐的精确时长与时间戳，再反推每一幕的 `startSec` 和 `durationSec`；无外接音频时，可复用纯代码立体声和弦合成器（叠加多倍频正弦波与包络线生成 WAV）。
- **FFmpeg 标准化母带**：统一经过 `afade=t=in:st=0:d=0.35,afade=t=out:st=...,d=0.75,loudnorm=I=-14:TP=-1.5:LRA=11` 混音压制为 AAC `192k / 44100Hz`，确保不同平台播放响度一致。

### 5. 语义分层 SVG（Pixel2Motion）+ 纯代码 2.5D 视差
- 为矢量图关键元素标记语义 ID（如 `#diagram-axis`、`#flow-arrow-1`、`#highlight-ring`），即可通过 GSAP 的 `strokeDasharray / strokeDashoffset` 自动实现“手绘科普板书”描边效果。
- 静态插画通过多层容器实现「背景慢缩放 `1.03 + 0.02*sin(t)` + 主体微位移 + 斜向透明渐变扫光」，零模型做出 2.5D 动效。

### 6. 自动化 QA 探针（出片即验轨）
- **渲染校验**：抽检 `0% / 45% / 98%` 等关键帧，校验零 `pageerror`、PNG 字节数大于白屏阈值、多帧哈希不一致（确认画面真在运动）。
- **成片校验**：调用 `ffprobe -show_entries stream=codec_type,codec_name` 确认输出 MP4 同时具备有效的 `h264` 视频轨和 `aac` 音频轨。

---

## 五、在其他程序中落地「无外接模型科普视频生成器」的推荐架构

结合以上三家之长，科普视频最稳健的工程方案是 **「Manim-Composer 分镜大脑 + Audio-First 时间轴 + HyperFrames HTML/GSAP 主舞台 +（可选）ManimCE 数理子片段」**：

```text
[科普选题 / 原文]
       │
       ▼  Stage 1: 剧本与分镜规划（借鉴 manim_skill/manim-composer）
[storyboard.json] ──> 确定 Hook / 直觉 / 机制 / 公式 / 结论、语义配色、视觉模块类型
       │
       ▼  Stage 2: Audio-First 音频定长（纯代码合成 / 本地 TTS / 用户配音）
[每幕 WAV + 句级时间戳] ──> 锁定各幕真实 durationSec，生成高亮字幕序列
       │
       ▼  Stage 3: 视觉路由（100% 零外接视频/图像模型）
       ├─ 复杂公式/微积分/3D矢量场 ──> ManimCE (Python) 预渲染局部 .mp4 片段
       ├─ 流程图/对比卡/数据图/字幕 ──> HyperFrames HTML + SVG 描边 + GSAP 时间轴
       ├─ 物理/算法动态模拟        ──> Canvas 2D 纯数学时间函数 f(t)
       └─ 已有科普静态配图          ──> 纯代码 2.5D 分层视差 + 光影扫光
       │
       ▼  Stage 4: 统一舞台合成（关键：内嵌 <video> 帧同步）
[Playwright __hyperSeek(t)] ──> 若当前幕含 Manim <video>，同步设置 video.currentTime = localT 并 await 'seeked'
       │
       ▼  Stage 5: PNG Pipe -> FFmpeg (-14 LUFS 混音 + BGM Ducking) -> QA 探针 -> MP4
```

> **核心工程技巧（Manim + HTML 无缝融合）**：
> 在无头浏览器逐帧截图时，如果 HTML 舞台里嵌入了 ManimCE 渲染的 `<video>` 片段，切勿让 `<video>` 自动播放！应在 `window.__hyperSeek(tSec)` 中计算该片段的局部时间 `localT = tSec - clipStart`，执行 `video.pause(); video.currentTime = localT;`，并 `await` 一次 `seeked` 事件后再双 `requestAnimationFrame` 截图。这样网页字幕、图表与 Manim 动画能实现 **100% 帧级对齐**。

---

## 六、标准分镜数据结构参考（`storyboard.schema.json`）

```json
{
  "projectId": "science-black-hole-01",
  "aspectRatio": "9:16",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "palette": {
    "bg1": "#0b1020",
    "bg2": "#162238",
    "primary": "#38bdf8",
    "accent": "#f59e0b",
    "danger": "#f43f5e",
    "text": "#f8fafc"
  },
  "audio": {
    "voiceoverPath": "./assets/narration.wav",
    "bgmMode": "synth-ambient",
    "targetLufs": -14
  },
  "scenes": [
    {
      "id": "S1",
      "role": "hook",
      "title": "为什么光也逃不出黑洞？",
      "subtitle": "不是光变慢了，而是时空本身在向内坠落。",
      "startSec": 0.0,
      "durationSec": 4.2,
      "visualType": "svg-stroke-hero",
      "params": { "highlightWords": ["时空", "坠落"] }
    },
    {
      "id": "S2",
      "role": "mechanism",
      "title": "瀑布模型：逃逸速度 > 光速",
      "subtitle": "当河水流速超过船速，船无论如何也逆流不上。",
      "startSec": 3.9,
      "durationSec": 6.5,
      "visualType": "canvas-physics-sim",
      "params": { "sim": "waterfall-horizon", "cRatio": 1.2 }
    },
    {
      "id": "S3",
      "role": "formula",
      "title": "史瓦西半径公式推导",
      "subtitle": "把地球压缩到 9 毫米，它也会变成一颗黑洞。",
      "startSec": 10.1,
      "durationSec": 7.0,
      "visualType": "manim-clip",
      "params": { "clipPath": "./clips/schwarzschild.mp4", "formula": "R_s = 2GM / c^2" }
    },
    {
      "id": "S4",
      "role": "takeaway",
      "title": "30 秒记住三个核心结论",
      "subtitle": "1. 引力即弯曲 2. 视界是单向膜 3. 质量决定大小",
      "startSec": 16.8,
      "durationSec": 5.0,
      "visualType": "summary-cards",
      "params": { "cards": ["广义相对论预言", "事件视界临界点", "R_s 正比于质量 M"] }
    }
  ]
}
```

---

## 七、可直接交给 ChatGPT 的复用指令模板（System Prompt / `SKILL.md`）

```markdown
# Role & Goal
你是一个精通「确定性代码驱动视频生成」的工程架构师。我需要在不调用任何外接生成式视频/图像模型（如 Sora/Runway/Flux 等）的前提下，在我的其他程序中实现一套自动化【科普视频生成系统】。

# Core Architecture Rules（必须严格遵守）
1. **零外接视频/图像生成模型与协议安全**：
   - 所有画面必须通过 HTML/CSS/SVG/Canvas/GSAP、纯数学物理模拟或本地 ManimCE 渲染生成。
   - 静态图片仅能使用纯代码分层视差、呼吸缩放与扫光，严禁复制或引入 CC-BY-NC-4.0 协议的代码及模型权重（如 `lemo-wake` 原仓库代码）。
2. **双阶段解耦（先分镜剧本，后确定性渲染）**：
   - Stage 1（参考 `manim_skill/manim-composer`）：先输出结构化分镜 `storyboard.json`（含 Hook、直觉、机制、公式/数据、总结、语义配色、每幕时长、视觉组件类型与口播字幕）。遵循「渐进揭示」「视觉连续性」和「顿悟停顿」。
   - Stage 2（参考 `hyperframes` Render Contract）：所有动画必须由 `gsap.timeline({ paused: true })` 或纯时间函数 $f(t)$ 驱动。严禁未加种子的 `Math.random()`（必须用 `mulberry32`）和系统实时时钟（`Date.now()` / `performance.now()`）。
3. **HTML 舞台与帧寻址契约**：
   - 舞台根元素必须声明 `data-composition-id`、`data-width`、`data-height`、`data-duration`、`data-fps`。
   - 必须暴露 `window.__hyperSeek(tSec)`：驱动 GSAP 时间线跳转与 Canvas 重绘；若当前幕嵌入了 ManimCE 渲染的 `<video>` 片段，必须在寻址时 `pause()` 并设置 `video.currentTime = localT`，等待 `seeked` 事件及双 `requestAnimationFrame` 后 resolve。
4. **Audio-First 与平滑转场**：
   - 若有配音或本地 TTS 音频，先测量每幕音频时长反向确定 `startSec` 与 `durationSec`，并生成字/句级高亮字幕；无外接音频时用纯代码合成环境音或按 4.5~5.5 字/秒计算时长。
   - 相邻幕之间保留 3%~5% 重叠时间窗进行交叉淡入淡出，确保零黑帧。
   - 最终音频由 FFmpeg 进行淡入淡出、`bgm` 闪避（ducking）和 `-14 LUFS` 响度标准化（`loudnorm=I=-14:TP=-1.5:LRA=11`）。
5. **高性能管线与自动化 QA 门禁**：
   - 本地渲染使用 Playwright 逐帧截图并通过 `stdin` 管道（`image2pipe`）直喂 FFmpeg 编码 H.264 MP4（`yuv420p`, `+faststart`），避免大量临时图落盘；若为纯前端场景，则使用 `Canvas 2D + WebCodecs + mp4-muxer` 导出。
   - 必须提供自动化 QA 脚本：校验控制台零报错、抽帧非空白、相邻帧存在像素运动差、文本不溢出容器，并用 `ffprobe` 校验 `h264` 与 `aac` 双轨完整。

# Your Task
请阅读我提供的工程规范后，结合我接下来说明的技术栈（Python / Node.js / Web）与科普主题，为我生成可直接运行的：
1. 科普分镜规划器（输出 `storyboard.json`）；
2. 6 类可复用科普视觉组件（Hook 矢量描边 / 概念拆解卡 / SVG 机制流程图 / Canvas 物理模拟或 Manim 片段 / 对比柱状图 / 总结定帧卡）+ 高亮字幕组件；
3. 本地管道直出渲染器、FFmpeg `-14 LUFS` 混音脚本与自动化 QA 探针。
```
