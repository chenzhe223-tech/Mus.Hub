# Mus.Hub（音画 · SONIC ARCHIVE）零外接模型视频与动效融合升级规范及验收标准

> **核心目标**：融合 `heygen-com/hyperframes`、`lemomo-ai/lemo-opuscar`、`nolangz/pixel2motion` 的工程优势与 `lemo-wake` 的纯代码分层视差理念，**在不依赖任何外部生成式视频/图像模型的前提下**，实现：
> 1. **C 端用户侧（Web App）**：稳定、不掉帧、直接导出高画质有声 `.mp4` 短视频（支持 `9:16`、`3:4`、`1:1`、`4:5` 与 `5s / 10s / 15s`）及 2.5D 动态海报；
> 2. **开发者/创作者侧（`studio-render/` 本地短视频工厂）**：基于 HyperFrames Render Contract + Lemo-Opuscar 风格体系 + FFmpeg `-14 LUFS` 母带管线，批量生产 **多镜头音乐歌词短视频、产品宣发短片、批量动态海报**。

---

## 一、不可违背的工程红线（Rules）

1. **R1 · 零外接生成模型 & 商用协议安全**
   - 严禁调用任何外部云端视频/图像生成模型（如 Sora/Runway/Flux 等）来渲染短视频或海报画面。
   - 严禁直接复制或引入 `lemomo-ai/lemo-wake` 代码及其本地 AI 模型权重（因其为 `CC BY-NC 4.0` 非商用协议）；仅使用纯前端数学计算实现分层呼吸视差与光影扫光。
   - 仅采用 Apache-2.0 / MIT 许可的架构规范与依赖包（`mp4-muxer`、`gsap`、`playwright`、`hyperframes` 契约）。
2. **R2 · Cloudflare 线上零回归与打包隔离**
   - 严格继承并满足 [QA_ACCEPTANCE_RULES.md](./QA_ACCEPTANCE_RULES.md) 中全部 `P0-1 ~ P0-7`。
   - 本地渲染工厂 `studio-render/` 与风格资产 `styles/` **严禁**被 Vite 打包进 `dist/` 或 Cloudflare Workers 包体。
   - `Song`、`PosterConfig`、`Palette` 保持向后兼容，新增字段一律可选。
3. **R3 · 单一确定性时间契约（Determinism Contract）**
   - `posterRenderer.ts` 必须支持显式注入确定性渲染上下文 `deterministic?: { tSec: number; bars?: number[]; progress?: number; currentLabel?: string }`。
   - 实时交互播放使用 `nowMs - startMs`；离线逐帧导出（WebCodecs 或 Playwright）**禁止**依赖 `performance.now()`、`Date.now()` 与未加种子的 `Math.random()`，确保相同输入在任意机器导出逐帧一致。
4. **R4 · HyperFrames Render Contract 契约（`studio-render/`）**
   - 每个多镜头短视频模板均需符合标准 HTML 时间轴契约：`data-composition-id`、`data-width`、`data-height`、`data-duration`、`data-fps`、`data-composition-variables`。
   - 动效时间轴必须暴露 `window.__hyperSeek(tSec)`（内部驱动 `gsap.timeline({ paused: true }).seek(tSec)` 与 Canvas `renderPoster`），支持无头浏览器逐帧精确步进截图。
5. **R5 · 真实音画同步与 `-14 LUFS` 音频规范**
   - Web 端逐帧导出使用离线 `decodeAudioData` 提取真实曲目多帧 FFT/RMS 频谱包络，画面波形与原曲节拍真实同步。
   - 本地 `studio-render/` 使用 FFmpeg 执行音频裁剪、淡入淡出及 `-14 LUFS` 响度标准化混音（`loudnorm=I=-14:TP=-1.5:LRA=11`）。

---

## 二、量化验收标准（Acceptance Criteria）

### A. Web 端升级验收（通道 A）
| 编号 | 验收项 | 量化通过标准 | 验证方式 |
| :--- | :--- | :--- | :--- |
| **F-A1** | **确定性渲染一致性** | 给定同一 `Song + PosterConfig + deterministic.tSec`，连续两次渲染输出像素 100% 一致（含胶片颗粒与飘浮微粒，无 `Math.random()` 抖动）。 | 自动化单测校验 PRNG 与渲染契约 |
| **F-A2** | **2.5D 纯代码视差与动效** | 6 套模板在 `dynamic` 模式下均具备平滑层间呼吸视差/高光扫光，6 套 × 4 比例 × 双主题无遮挡、无溢出、零控制台报错。 | Playwright 多尺寸巡检 / 截图检查 |
| **F-A3** | **真 MP4 逐帧导出 + 兜底** | 支持 `5s / 10s / 15s` 时长选择；支持 `WebCodecs` 的桌面/现代浏览器导出标准 H.264 `.mp4` 且含真实音轨（不支持环境平滑降级 `MediaRecorder`）；`ShareModal` 下载文件名后缀与真实 `ext` 一致（不再硬编码 `.webm`）。 | 单测 + 浏览器实测 |
| **F-A4** | **一键导出本地工程包** | Studio 面板可一键导出 `sonic-project-*.json`（含 `song`、`config`、`palette`、`lyricsLines`、`durationSec`），结构可直接被 `studio-render/` 消费。 | JSON Schema 校验 + 端到端渲染测试 |

### B. 本地短视频工厂验收（通道 B：`studio-render/`）
| 编号 | 验收项 | 量化通过标准 | 验证方式 |
| :--- | :--- | :--- | :--- |
| **F-B1** | **品牌矢量 SVG 动效（Pixel2Motion）** | 产出语义分层 SVG（`#mark-disc`、`#mark-wave`、`#wordmark-cn`、`#wordmark-en`），具备优雅缓动入场与**末帧精确收敛**。 | SVG 结构审计 + Playwright 连续性探针 |
| **F-B2** | **C 端风格短视频输出（9:16 歌词 MV）** | 输入任意 `sonic-project.json`（含音频或曲目数据），本地一键渲染出 `1080×1920`（或自定义比例）`30/60fps` MP4，包含：品牌片头 → 2.5D 动态海报 → 歌词动态排版 → 扫码定帧结尾，且与音频混音。 | 实际跑通渲染 + `ffprobe` 校验音视频轨 |
| **F-B3** | **B 端产品宣发短片 & 批量海报** | 内置「音画 SONIC ARCHIVE 产品宣发短片」多镜头模板及批量清单脚本，可一次生成宣发 MP4 + 批量动态海报 GIF/MP4。 | 实际跑通渲染 + `ffprobe` 校验 + 抽帧接触表人工目检 |
| **F-B4** | **导演风格库 `STYLE.md`** | 沉淀不少于 6 套核心视觉导演风格文件（对齐 6 套模板并扩充多镜头转场规则）与自动化 QA 探针脚本。 | 目录与文档完整性检查 |

### C. 上线门禁回归（与现有 QA 联动）
- **G-1**：`npx tsc -b` 零错误。
- **G-2**：`npm run build` 零报错，且 `dist/` 内不含任何 `studio-render/` 或服务端脚本。
- **G-3**：`npx wrangler deploy --dry-run` 退出码 `0`。
- **G-4**：全部新增单测、本地视频实测渲染与 `ffprobe` 检查通过。

---

## 三、线上 Web 端多镜头短视频与转场监看验收标准（Phase 4）

> 目标：在**零新增后端算力与外接模型**的前提下，让线上 Cloudflare Workers 部署的 Web App 直接具备「4 幕歌词短视频」「6 秒产品宣发短片」的实时预览、转场慢放监看与真 MP4 导出能力。

| 编号 | 验收项 | 量化通过标准 | 验证方式 |
| :--- | :--- | :--- | :--- |
| **F-C1** | **成片形态向后兼容** | `PosterConfig.productionMode`（`'poster' \| 'lyric-mv' \| 'promo'`）为可选字段，旧草稿/唱片墙/分享链接无该字段时默认按 `'poster'` 渲染，零破坏性变更。 | `tsc -b` + `share.ts` 兼容检查 |
| **F-C2** | **纯前端 4 幕多镜头导演引擎** | `multiSceneRenderer.ts` 支持 `'lyric-mv'` 与 `'promo'` 在 `9:16 / 3:4 / 1:1 / 4:5` 全画幅及任意时长（`6s / 10s / 15s`）下确定性渲染 `renderMultiSceneAt(tSec)`；4 幕时间划分严格覆盖 `[0, durationSec]`，过渡区无黑屏、无 `NaN`、不依赖外部图片/字体网络阻塞。 | Node 单测 + Playwright React 实测抽帧 |
| **F-C3** | **Web 端导演监看条** | 切换到「歌词短视频」或「产品宣发片」时，舞台下方呈现导演监看条：支持播放/暂停、`0.25x / 0.5x / 1x` 慢放、`-1F / +1F`（`1/30s`）单帧步进、带 4 幕刻度线的时间轴拖拽及当前幕次/帧号/秒数实时读数。 | 浏览器交互实测 + 控制台零报错 |
| **F-C4** | **多镜头真 MP4 导出** | 在 `'lyric-mv'` 或 `'promo'` 模式下点击「导出视频」，`WebCodecs + mp4-muxer` 直接离屏按当前选择时长（如 6s 宣发片 / 10s 歌词 MV）逐帧编码 H.264 `.mp4` 并混入真实曲目或合成和弦音轨；不支持环境平滑回退 `MediaRecorder`。 | 代码级门禁 + 浏览器导出校验 |

---

## 四、专属宣发智能策划与自定义系统验收标准（Phase 5）

| 编号 | 验收项 | 量化通过标准 | 验证方式 |
| :--- | :--- | :--- | :--- |
| **F-D1** | **曲风智能策划匹配** | `generateSmartPromoPlan(song, config, lyricsLines)` 能依据歌名/歌手/BPM/关键词自动匹配出至少 4 套差异化策划方案（深夜蓝调、复古浪漫、治愈民谣、热歌安利/品牌推广），生成专属 `badgeText`、`s1Subline`、`s3Highlights` 与 `themeStyle`。 | 自动化单测验证不同曲目生成差异化策划 |
| **F-D2** | **S1~S4 文案全自由定制** | 用户可实时修改 S1~S4 标题、副文案、3 张卖点卡（标题/副文/标签）与结尾 CTA，支持一键切回智能匹配或套用 4 类策划方向预设；Canvas 同步渲染且遵循整词换行与防溢出。 | Web E2E 交互改字 + Canvas 非空校验 |
| **F-D3** | **多图上传自定义展示** | 支持上传 1~3 张本地图片（`data:` URL），预加载为 `HTMLImageElement[]` 后在 S2 呈现 2.5D 图集卡片动画；支持单张删除与切回多版式矩阵。 | 单元测试 + E2E 上传渲染校验 |
| **F-D4** | **安全隔离与零回归** | 不将上传的 base64 图片写入 `share.ts` 二维码 URL hash；`npm run qa`（8/8）、`npm run qa:motion` 与 `npm run qa:web` 全部退出码 `0`。 | 全量门禁脚本 |


