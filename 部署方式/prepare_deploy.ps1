# prepare_deploy.ps1
# Usage: run from any location; it uses absolute paths to project root below.

$repoRoot = "D:\WysProgrammingTest\wysJSON"
$deploy = Join-Path $repoRoot "部署方式\网页部署"

Write-Host "Preparing deployment folder: $deploy"

# Ensure deploy folder exists
New-Item -ItemType Directory -Force -Path $deploy | Out-Null

# Copy main HTML
$srcHtml = Join-Path $repoRoot 'indexMonaco.html'
if (Test-Path $srcHtml) {
    Copy-Item -LiteralPath $srcHtml -Destination $deploy -Force
    Write-Host "Copied indexMonaco.html"
} else { Write-Host "indexMonaco.html not found at $srcHtml" }

# Copy src/pic images (and keep relative path)
$srcPic = Join-Path $repoRoot 'src\pic'
$destPic = Join-Path $deploy 'src\pic'
if (Test-Path $srcPic) {
    New-Item -ItemType Directory -Force -Path $destPic | Out-Null
    Copy-Item -Path (Join-Path $srcPic '*') -Destination $destPic -Recurse -Force
    Write-Host "Copied src/pic/* to deployment folder"
} else { Write-Host "No src/pic directory found at $srcPic" }

# Optionally copy media files if exist
$maybeMedia = @('media','package.nls.json','package.nls.zh-CN.json')
foreach ($m in $maybeMedia) {
    $src = Join-Path $repoRoot $m
    if (Test-Path $src) {
        $dest = Join-Path $deploy $m
        if ((Test-Path $src) -and (Get-Item $src).PSIsContainer) {
            Copy-Item -Path $src -Destination $dest -Recurse -Force
            Write-Host "Copied folder: $m"
        } else {
            New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
            Copy-Item -Path $src -Destination $dest -Force
            Write-Host "Copied file: $m"
        }
    }
}

# Copy monaco-editor (if present). We expect monaco under node_modules\monaco-editor\min
$monacoSrc = Join-Path $repoRoot 'node_modules\monaco-editor\min'
if (Test-Path $monacoSrc) {
    $monacoDestRoot = Join-Path $deploy 'node_modules\monaco-editor'
    New-Item -ItemType Directory -Force -Path $monacoDestRoot | Out-Null
    Copy-Item -Path $monacoSrc -Destination $monacoDestRoot -Recurse -Force
    Write-Host "Copied monaco-editor/min to deployment folder (preserved relative path)."
} else {
    Write-Host "monaco-editor/min not found under node_modules. If you need local Monaco, run 'npm install' in project root first."
}

Write-Host "Prepare-deploy finished. Inspect $deploy to confirm files."