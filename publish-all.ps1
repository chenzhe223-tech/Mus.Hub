$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot

$repoUrl = 'https://github.com/chenzhe223-tech/Mus.Hub.git'
$logFile = Join-Path $PSScriptRoot 'publish-log.txt'
"" | Set-Content -Path $logFile -Encoding UTF8

function Write-Step($msg) {
  Write-Host ""
  Write-Host $msg -ForegroundColor Yellow
  Add-Content -Path $logFile -Value $msg -Encoding UTF8
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Mus.Hub (SONIC ARCHIVE) - 一键推送 GitHub 并部署上线" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

Write-Step "[1/4] 正在打包前端与全网音乐接口 (npm run build)..."
& npm.cmd run build 2>&1 | Tee-Object -FilePath $logFile -Append
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[失败] 打包出错，完整日志已保存到 publish-log.txt" -ForegroundColor Red
  Read-Host "按回车键退出"
  exit 1
}

Write-Step "[2/4] 准备 Git 仓库并提交最新代码..."
if (-not (Test-Path (Join-Path $PSScriptRoot '.git'))) {
  & git init -b main 2>&1 | Tee-Object -FilePath $logFile -Append
}
$existingOrigin = & git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
  & git remote add origin $repoUrl 2>&1 | Tee-Object -FilePath $logFile -Append
} elseif ($existingOrigin.Trim() -ne $repoUrl) {
  & git remote set-url origin $repoUrl 2>&1 | Tee-Object -FilePath $logFile -Append
}
& git branch -M main 2>&1 | Tee-Object -FilePath $logFile -Append
& git add -A 2>&1 | Tee-Object -FilePath $logFile -Append
$statusOut = & git status --porcelain
if ($statusOut) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm'
  & git commit -m "chore: update Mus.Hub catalog and studio ($ts)" 2>&1 | Tee-Object -FilePath $logFile -Append
}

Write-Step "[3/4] 正在推送到 GitHub ($repoUrl)..."
$pushOut = & git push -u origin main 2>&1 | Tee-Object -FilePath $logFile -Append | Out-String
if ($LASTEXITCODE -ne 0) {
  if ($pushOut -match "fetch first|non-fast-forward|rejected") {
    Write-Host "检测到远程仓库已有初始文件，正在自动合并并重新推送..." -ForegroundColor Yellow
    & git pull origin main --allow-unrelated-histories --no-edit -X ours 2>&1 | Tee-Object -FilePath $logFile -Append
    & git push -u origin main 2>&1 | Tee-Object -FilePath $logFile -Append
  }
}
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[提示] GitHub 推送未成功，可能是未登录或网络代理原因。" -ForegroundColor Red
  Write-Host "可先在终端执行 gh auth login 登录后再双击重试，日志已保存到 publish-log.txt" -ForegroundColor Yellow
  Read-Host "按回车键退出"
  exit 1
}
Write-Host "GitHub 仓库推送成功！" -ForegroundColor Green

Write-Step "[4/4] 正在部署上线到 Cloudflare Workers..."
$whoamiOut = & wrangler.cmd whoami 2>&1 | Out-String
Add-Content -Path $logFile -Value $whoamiOut -Encoding UTF8
if ($LASTEXITCODE -ne 0 -or $whoamiOut -match "not authenticated|login") {
  Write-Host "尚未登录 Cloudflare，正在为你打开浏览器进行授权登录..." -ForegroundColor Green
  & wrangler.cmd login 2>&1 | Tee-Object -FilePath $logFile -Append
}
$deployOut = & wrangler.cmd deploy 2>&1 | Tee-Object -FilePath $logFile -Append | Out-String
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "[失败] Cloudflare 部署未成功，完整日志已保存到 publish-log.txt" -ForegroundColor Red
  Read-Host "按回车键退出"
  exit 1
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  全部完成！已同步推送 GitHub 并部署上线！" -ForegroundColor Green
Write-Host ("  GitHub 仓库: " + $repoUrl) -ForegroundColor Cyan

$urlMatch = [regex]::Match($deployOut, 'https://[a-zA-Z0-9.-]+\.workers\.dev')
if ($urlMatch.Success) {
  $liveUrl = $urlMatch.Value
  Write-Host ("  公网在线网址: " + $liveUrl) -ForegroundColor Cyan
  Write-Host "  正在为你打开浏览器..." -ForegroundColor Green
  Start-Process $liveUrl
}
Write-Host "=========================================================" -ForegroundColor Green
Read-Host "按回车键关闭窗口"
