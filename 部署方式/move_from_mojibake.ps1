# move_from_mojibake.ps1
# Move contents from the mojibake directory (created by earlier script) into the intended deploy folder.
$ErrorActionPreference = 'Stop'

$src = 'D:\WysProgrammingTest\wysJSON\閮ㄧ讲鏂瑰紡\缃戦〉閮ㄧ講'
$dst = 'D:\WysProgrammingTest\wysJSON\部署方式\网页部署'

Write-Host "Source: $src"
Write-Host "Destination: $dst"

if (-not (Test-Path $src)) {
    Write-Host "Source folder not found: $src"
    exit 1
}

New-Item -ItemType Directory -Force -Path $dst | Out-Null

Write-Host "Copying contents..."
Copy-Item -LiteralPath (Join-Path $src '*') -Destination $dst -Recurse -Force

Write-Host "Copy complete. Deployment folder listing:"
Get-ChildItem -LiteralPath $dst | Select-Object Name,Mode,Length | Format-Table -AutoSize

# Optionally, do not remove the source automatically. Caller can remove if desired.
