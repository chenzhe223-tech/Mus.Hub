$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot

$logFile = Join-Path $PSScriptRoot 'deploy-log.txt'
"" | Set-Content -Path $logFile -Encoding UTF8

function Write-Step($msg) {
  Write-Host ""
  Write-Host $msg -ForegroundColor Yellow
  Add-Content -Path $logFile -Value $msg -Encoding UTF8
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  SONIC ARCHIVE / 音画 Studio - Cloudflare Workers 部署" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

Write-Step "[1/3] 正在打包前端与音乐搜索接口 (npm run build)..."
& npm.cmd run build 2>&1 | Tee-Object -FilePath $logFile -Append
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[失败] 打包出错，完整日志已保存到 deploy-log.txt" -ForegroundColor Red
  Read-Host "按回车键退出"
  exit 1
}

Write-Step "[2/3] 检查 Cloudflare 登录状态 (wrangler whoami)..."
$whoamiOut = & wrangler.cmd whoami 2>&1 | Out-String
Add-Content -Path $logFile -Value $whoamiOut -Encoding UTF8
if ($LASTEXITCODE -ne 0 -or $whoamiOut -match "not authenticated|login") {
  Write-Host "尚未登录 Cloudflare，正在为你打开浏览器进行授权登录..." -ForegroundColor Green
  & wrangler.cmd login 2>&1 | Tee-Object -FilePath $logFile -Append
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[失败] Cloudflare 登录未完成，请检查网络或代理设置。" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit 1
  }
} else {
  Write-Host "已登录 Cloudflare 账号。" -ForegroundColor Green
}

Write-Step "[3/3] 正在部署到 Cloudflare Workers..."
$deployOut = & wrangler.cmd deploy 2>&1 | Tee-Object -FilePath $logFile -Append | Out-String
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[失败] 部署未成功，请将上方红色错误信息或 deploy-log.txt 发给我，我立刻帮你修！" -ForegroundColor Red
  Read-Host "按回车键退出"
  exit 1
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  部署成功！" -ForegroundColor Green

$urlMatch = [regex]::Match($deployOut, 'https://[a-zA-Z0-9.-]+\.workers\.dev')
if ($urlMatch.Success) {
  $liveUrl = $urlMatch.Value
  Write-Host ("  你的公网网址: " + $liveUrl) -ForegroundColor Cyan
  Write-Host "  正在为你打开浏览器..." -ForegroundColor Green
  Start-Process $liveUrl
} else {
  Write-Host "  请复制上方显示的 https://...workers.dev 网址打开即可！" -ForegroundColor Cyan
}
Write-Host "=========================================================" -ForegroundColor Green
Read-Host "按回车键关闭窗口"
