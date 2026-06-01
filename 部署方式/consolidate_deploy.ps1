# consolidate_deploy.ps1
# Find copies (indexMonaco.html outside repo root) and consolidate into 部署方式\网页部署
$ErrorActionPreference = 'Stop'
$repoRoot = 'D:\WysProgrammingTest\wysJSON'
$deploy = Join-Path $repoRoot '部署方式\网页部署'
Write-Host "Deploy root: $deploy"
New-Item -ItemType Directory -Force -Path $deploy | Out-Null

# Find any indexMonaco.html instances not in repo root
$copies = Get-ChildItem -Path $repoRoot -Recurse -Filter 'indexMonaco.html' -File -ErrorAction SilentlyContinue | Where-Object { $_.DirectoryName -ne $repoRoot }
if ($copies -and $copies.Count -gt 0) {
    Write-Host "Found copies:"
    $copies | ForEach-Object { Write-Host " - " $_.FullName }
    foreach ($c in $copies) {
        $srcDir = $c.DirectoryName
        Write-Host "Copying from $srcDir to $deploy"
        Copy-Item -LiteralPath (Join-Path $srcDir '*') -Destination $deploy -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "No duplicate copies found."
}

# Ensure src/help and src/pic from repo root are copied
if (Test-Path (Join-Path $repoRoot 'src\help')) {
    Write-Host "Copying src/help from repo root"
    New-Item -ItemType Directory -Force -Path (Join-Path $deploy 'src\help') | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot 'src\help\*') -Destination (Join-Path $deploy 'src\help') -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path (Join-Path $repoRoot 'src\pic')) {
    Write-Host "Copying src/pic from repo root"
    New-Item -ItemType Directory -Force -Path (Join-Path $deploy 'src\pic') | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot 'src\pic\*') -Destination (Join-Path $deploy 'src\pic') -Recurse -Force -ErrorAction SilentlyContinue
}

# Ensure monaco min is present
$monacoSrc = Join-Path $repoRoot 'node_modules\monaco-editor\min'
if (Test-Path $monacoSrc) {
    Write-Host "Copying monaco min"
    New-Item -ItemType Directory -Force -Path (Join-Path $deploy 'node_modules\monaco-editor') | Out-Null
    Copy-Item -LiteralPath $monacoSrc -Destination (Join-Path $deploy 'node_modules\monaco-editor') -Recurse -Force -ErrorAction SilentlyContinue
}

# Ensure indexMonaco.html from root is present
if (Test-Path (Join-Path $repoRoot 'indexMonaco.html')) {
    Copy-Item -LiteralPath (Join-Path $repoRoot 'indexMonaco.html') -Destination $deploy -Force -ErrorAction SilentlyContinue
}

Write-Host "Consolidation complete. Listing top-level deploy folder:"
Get-ChildItem -LiteralPath $deploy | Select-Object Name,Mode,Length | Format-Table -AutoSize

Write-Host "Done."
