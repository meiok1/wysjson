# copy_monaco_min.ps1
$ErrorActionPreference = 'Stop'
$repoRoot = 'D:\WysProgrammingTest\wysJSON'
$src = Join-Path $repoRoot 'node_modules\monaco-editor\min\*'
$deploy = Join-Path $repoRoot '部署方式\网页部署'
$dest = Join-Path $deploy 'node_modules\monaco-editor\min'
Write-Host "Copying monaco min from: $src"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -LiteralPath $src -Destination $dest -Recurse -Force
Write-Host "Copied monaco min to: $dest"
Get-ChildItem -LiteralPath $dest | Select-Object Name,Mode,Length | Format-Table -AutoSize
