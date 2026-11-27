# Mus.Hub 外部能力密钥配置指南（听歌识曲 / AI 声纹演唱 / Apple Music 官方库）

所有前端界面与 Cloudflare Workers 后端代码已经全部就绪，按需配置以下密钥后功能会自动生效，无需改代码。

---

## 1. 开启「听歌识曲」（ACRCloud · 14 天免费试用，华语+哼唱最准）

1. 注册并登录 [ACRCloud 控制台](https://console.acrcloud.com/)。
2. 新建一个 **Audio & Video Recognition** 项目，勾选 **ACRCloud Music**（可同时勾选 **Humming** 开启哼唱识曲）。
3. 复制控制台里的 3 个值：`Host`、`Access Key`、`Access Secret`。
4. 在项目目录打开 PowerShell，依次执行：
   ```powershell
   wrangler secret put ACR_HOST
   wrangler secret put ACR_ACCESS_KEY
   wrangler secret put ACR_ACCESS_SECRET
   ```
   > 备选：如果你用 [AudD.io](https://audd.io/)（注册送 300 次免费），只需执行一次 `wrangler secret put AUDD_API_TOKEN` 即可。

---

## 2. 开启「AI 声纹唱片 · 30 秒专属演唱」

### 第 1 步：配置作词与 30s 原创作曲（MiniMax Music + 可选 Gemini）
1. 注册 [MiniMax 开放平台](https://platform.minimax.io/) 创建 API Key（单首作曲约 ¥1 / $0.15）。
2. 在项目目录执行：
   ```powershell
   wrangler secret put MINIMAX_API_KEY
   ```
3. （可选）配置 Gemini Flash 让 AI 写的 30s 中文副歌更有诗意：
   ```powershell
   wrangler secret put GEMINI_API_KEY
   ```

### 第 2 步：部署零样本歌声克隆 GPU 服务（Modal.com · 空闲 $0 费用）
1. 安装 Modal CLI 并登录（每月送 $30 免费 GPU 额度，足够跑上千次）：
   ```powershell
   pip install modal
   modal setup
   modal deploy ai-gpu-worker/seed_vc_worker.py
   ```
2. 把终端输出的 `https://...modal.run` 网址配到 Cloudflare Secrets：
   ```powershell
   wrangler secret put VOICE_CLONE_ENDPOINT
   ```

---

## 3. （可选）升级 Apple Music 官方高配额曲库

当你拥有 Apple Developer 账号（$99/年）并生成 MusicKit Developer Token（JWT）后，执行：
```powershell
wrangler secret put APPLE_MUSIC_TOKEN
```
配置后，后端会自动优先走 **Apple Music 官方 Catalog API**（不限流、全球港台/新加坡/大陆/美区全量 30 秒正版试听）。
