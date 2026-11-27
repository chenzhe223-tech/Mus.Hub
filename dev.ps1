[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SONIC ARCHIVE / 音画 Studio 启动中..." -ForegroundColor Cyan
Write-Host "  网址: http://localhost:5173" -ForegroundColor Green
Write-Host "  提示: 使用期间请不要关闭本窗口" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

Start-Job -ScriptBlock {
  Start-Sleep -Seconds 2
  Start-Process "http://localhost:5173"
} | Out-Null

& npm.cmd run dev
Read-Host "服务已停止，按回车键关闭窗口"
