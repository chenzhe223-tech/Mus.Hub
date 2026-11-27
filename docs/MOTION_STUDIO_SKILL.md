# Skill: 音画 SONIC ARCHIVE 零模型视频与动效制作指南

当你需要不依赖任何外接生成式视频/图像模型，直接用代码生成 **短视频（9:16 歌词 MV / 产品宣发片）** 或 **批量动态海报** 时，遵循本规范：

1. **导出工程包（可选）**：在 Web 制片室（`StudioView`）选好歌曲、版式、歌词与色调，点击「工程包」下载 `sonic-project-*.json`。
2. **选定导演风格**：查阅 `studio-render/styles/*.STYLE.md`（黑胶暗房、日光唱片、独立杂志、千禧 CD、铬带磁带、液态玻璃、产品宣发）。
3. **遵循 HyperFrames Render Contract**：
   - HTML 根舞台声明 `data-composition-id`、`data-width`、`data-height`、`data-duration`、`data-fps`。
   - 加载 `/core/hyper-runtime.js`，用 `gsap.timeline({ paused: true })` 编排转场，禁止未加种子的 `Math.random()`。
   - 调用 `window.registerHyperComposition({ id, timeline, onFrame })` 暴露确定性时间推进钩子。
4. **本地一键出片与 QA 验轨**：
   ```bash
   cd studio-render
   npm run render:mv     # 9:16 歌词音乐短视频 (MP4, -14 LUFS)
   npm run render:promo  # 9:16 产品宣发短片 (MP4, -14 LUFS)
   npm run render:batch  # 批量动态海报 (MP4 + GIF)
   npm run qa            # Pixel2Motion SVG + 动效连续性 + ffprobe 验轨
   ```
