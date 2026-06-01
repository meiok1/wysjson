# fix_monaco_layout.ps1
$ErrorActionPreference = 'Stop'
$deploy = 'D:\WysProgrammingTest\wysJSON\部署方式\网页部署'
$monaco = Join-Path $deploy 'node_modules\monaco-editor'
$vs = Join-Path $monaco 'vs'
$min = Join-Path $monaco 'min'
Write-Host "Deploy path: $deploy"
if (-not (Test-Path $monaco)) {
    Write-Host "Monaco folder not found at $monaco"
    exit 0
}
if (Test-Path $min) {
    Write-Host "min folder already exists."
    if (Test-Path (Join-Path $min 'vs')) {
        Write-Host "min\\vs already exists; nothing to move."
        exit 0
    }
}
New-Item -ItemType Directory -Force -Path $min | Out-Null
if (Test-Path $vs) {
    Move-Item -LiteralPath $vs -Destination $min -Force
    Write-Host "Moved vs -> min\\vs"
} else {
    Write-Host "No vs folder found; nothing to move."
}
Write-Host "monaco contents:"
Get-ChildItem -LiteralPath $monaco | Select-Object Name,Mode | Format-Table -AutoSize
