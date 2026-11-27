# 音画 SONIC ARCHIVE · 本地短视频与动态海报渲染工厂 (`studio-render`)

融合 **HyperFrames Render Contract**（HTML/GSAP 确定性时间线）+ **Lemo-Opuscar**（纯时间函数 + `STYLE.md` 导演规范 + `-14 LUFS` FFmpeg 音频母带）+ **Pixel2Motion**（语义分层 SVG 品牌动效 + Playwright QA 探针）。

**特点：0 外接视频/图像生成模型，全部基于代码与本地浏览器 + FFmpeg 渲染。**

## 快速上手

```bash
cd studio-render
npm install

# 1. 渲染 9:16 歌词音乐短视频（可直接传入网页端「导出工程包」下载的 sonic-project-*.json）
node core/render-video.mjs --template templates/music-short-mv.html --vars presets/demo-song-project.json --out out/demo-mv-9x16.mp4

# 2. 渲染 9:16 产品宣发短片
npm run render:promo

# 3. 批量渲染动态海报（MP4 + GIF）
npm run render:batch

# 4. 运行 Pixel2Motion + HyperFrames + ffprobe QA 探针
npm run qa
```

## 常用参数
- `--template`：模板 HTML 路径（`templates/music-short-mv.html`、`templates/product-promo.html`、`templates/dynamic-poster.html`）
- `--vars`：工程配置 JSON（完全兼容网页端导出的 `sonic-project-*.json`）
- `--audio`：可选本地 `.mp3` / `.wav` 原曲路径；若未传则自动用纯代码 WAV 合成器生成配乐，并通过 FFmpeg 统一压制至 `-14 LUFS`
- `--duration`：覆盖视频时长（秒）
- `--fps`：帧率（默认 `30`，可设为 `60`）
- `--gif`：同时输出高画质调色板 GIF
