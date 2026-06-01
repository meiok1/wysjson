# deploy_site.ps1
# Copies required files into 部署方式\网页部署. Aborts if required root/src files are missing.
$ErrorActionPreference = 'Stop'

$repoRoot = 'D:\WysProgrammingTest\wysJSON'
$deploy = Join-Path $repoRoot '部署方式\网页部署'
Write-Host "Deploy root: $deploy"

# Ensure clean deploy folder
if (Test-Path $deploy) {
    Write-Host "Clearing existing deploy folder contents..."
    Get-ChildItem -LiteralPath $deploy -Force | Where-Object { $_.Name -ne '.' -and $_.Name -ne '..' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Force -Path $deploy | Out-Null
}

# Helper to copy folder if present
function Copy-FolderIfExists($src, $dst) {
    if (Test-Path $src) {
        Write-Host "Copying $src -> $dst"
        New-Item -ItemType Directory -Force -Path $dst | Out-Null
        Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
        return $true
    } else {
        Write-Host "Missing: $src"
        return $false
    }
}

# Required files
$required = @(
    (Join-Path $repoRoot 'indexMonaco.html'),
    (Join-Path $repoRoot 'src\help\jsonokok.html'),
    (Join-Path $repoRoot 'node_modules\monaco-editor\min\vs\loader.js'),
    (Join-Path $repoRoot 'src\pic\kaoPuGuiWeChat.jpg'),
    (Join-Path $repoRoot 'src\pic\zanShangMa.jpg')
)

$missing = @()
foreach ($r in $required) {
    if (-not (Test-Path $r)) { $missing += $r }
}
if ($missing.Count -gt 0) {
    Write-Host "Missing required files, aborting deployment:`n"
    $missing | ForEach-Object { Write-Host " - $_" }
    exit 2
}

# Copy essential files
Write-Host "Copying indexMonaco.html"
Copy-Item -Path (Join-Path $repoRoot 'indexMonaco.html') -Destination $deploy -Force

# Copy monaco min
$monacoSrc = Join-Path $repoRoot 'node_modules\monaco-editor\min'
$monacoDestRoot = Join-Path $deploy 'node_modules\monaco-editor'
New-Item -ItemType Directory -Force -Path $monacoDestRoot | Out-Null
Copy-Item -Path $monacoSrc -Destination $monacoDestRoot -Recurse -Force

# Copy src/help and src/pic
Copy-FolderIfExists (Join-Path $repoRoot 'src\help') (Join-Path $deploy 'src\help') | Out-Null
Copy-FolderIfExists (Join-Path $repoRoot 'src\pic') (Join-Path $deploy 'src\pic') | Out-Null

# Copy media if exists
Copy-FolderIfExists (Join-Path $repoRoot 'media') (Join-Path $deploy 'media') | Out-Null

# Optional metadata files
$optional = @('README.md','package.json','package-lock.json','package.nls.json','package.nls.zh-CN.json')
foreach ($f in $optional) {
    $src = Join-Path $repoRoot $f
    if (Test-Path $src) { Copy-Item -Path $src -Destination $deploy -Force }
}

Write-Host "Deployment folder contents:"
Get-ChildItem -LiteralPath $deploy | Select-Object Name,Mode,Length | Format-Table -AutoSize

Write-Host "Deployment completed successfully."
