# Mus.Hub · 音画 SONIC ARCHIVE

一款面向华语与全球乐迷的 **高质感音乐海报创作与社交唱片墙 Web 应用**。支持全网华语/欧美流行音乐搜索、30 秒正版原曲试听、真实中文/全球歌词提取、6 套编辑级动态黑胶/磁带/CD/拍立得/杂志海报模板、高清 PNG 与有声动态视频导出，以及一键扫码分享与唱片墙发布。

## 核心亮点

- **全网多源音乐检索与 30 秒原曲试听**
  - 内置简繁中文自动扩展与 100+ 华语/欧美/日韩歌手中英别名引擎（如搜「孙燕姿」「逆光」「天黑黑」「霉霉」「火星哥」均可秒出正版原曲）。
  - Cloudflare Edge API（Apple Music TW/CN/US + Deezer 全球库 + 网易云搜索 + 边缘缓存）与浏览器端 JSONP 直连双轨融合，不受共享 IP 限流影响。
  - 内置 8 大实时发现频道：**华语热歌、欧美流行、全球热榜、独立乐队、爵士 R&B、日系都市、粤语经典、馆藏黑胶**，支持搜索翻页加载更多。
- **模拟 Hi-Fi 双主题美学**
  - **日光唱片**（明快暖阳纸感）与 **黑胶暗房**（深邃黑胶质感）一键切换。
  - 6 套编辑级海报版式（黑胶唱片、拍立得、独立杂志、卡带机、透明 CD、雾面玻璃），4 种画幅比例（`3:4`、`4:5`、`9:16`、`1:1`）自适应防重叠排版。
- **真实歌词提取 & 有声动态视频导出**
  - 自动匹配网易云中文歌词与 LRCLIB 全球歌词，点选任意金句上墙。
  - 基于 Web Audio API 实时驱动频谱与进度条，支持导出高清 PNG 与带原声的动态视频。
- **社交唱片墙与零后端链接分享**
  - 支持上架社交唱片墙、生成可扫码访问的专属试听海报卡片。

## 技术栈

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + HTML5 Canvas + Web Audio API
- **Edge Backend & Hosting**: Cloudflare Workers + Static Assets (`worker/index.ts` + `shared/musicApi.ts`)

## 本地开发与部署

```bash
# 安装依赖
npm install

# 本地启动（同时运行前端与 /api/* 音乐代理服务）
npm run dev

# 构建生产包
npm run build

# 部署到 Cloudflare Workers
npx wrangler deploy
```

Windows 用户也可直接双击根目录脚本：
- `启动音画Studio.bat` — 启动本地开发服务器
- `一键部署上线.bat` — 仅部署到 Cloudflare Workers
- `一键推送GitHub并上线.bat` — 一键打包、推送 GitHub 仓库并同步上线 Cloudflare Workers
