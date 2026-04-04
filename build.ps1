# Code Mark Highlighter — One-Click Build Script
# Double-click this file or run: powershell -ExecutionPolicy Bypass -File build.ps1
# It will: install deps → copy icon → compile TypeScript → package .vsix

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Code Mark Highlighter Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ── Step 1: Copy icon ─────────────────────────────────────────────────────────
Write-Host "[1/4] Copying icon..." -ForegroundColor Yellow
$IconSrc = "C:\Users\rumit\.gemini\antigravity\brain\5453c8c8-ed29-4a99-8354-4983326d4b78\devmarks_icon_1775320581050.png"
$IconDst = "resources\devmarks-icon.png"
if (Test-Path $IconSrc) {
    Copy-Item $IconSrc -Destination $IconDst -Force
    Write-Host "    Icon copied OK" -ForegroundColor Green
} elseif (Test-Path $IconDst) {
    Write-Host "    Icon already exists, skipping" -ForegroundColor Gray
} else {
    Write-Host "    WARNING: Icon not found — extension will still work, just without marketplace icon" -ForegroundColor DarkYellow
    # Remove icon reference from package.json so vsce doesn't fail
    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $pkg.PSObject.Properties.Remove("icon")
    $pkg | ConvertTo-Json -Depth 20 | Set-Content "package.json"
}

# ── Step 2: npm install ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Installing dependencies (npm install)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "    Dependencies installed OK" -ForegroundColor Green

# ── Step 3: Compile TypeScript ────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Compiling TypeScript (npm run compile)..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TypeScript compilation failed! See errors above." -ForegroundColor Red
    exit 1
}
Write-Host "    Compilation OK" -ForegroundColor Green

# ── Step 4: Package .vsix ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Packaging extension (.vsix)..." -ForegroundColor Yellow

# Install vsce if not already installed
$vsceCheck = npx @vscode/vsce --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Installing vsce..." -ForegroundColor Gray
    npm install -g @vscode/vsce
}

# Package (--no-dependencies skips node_modules check, --allow-missing-repository skips git check)
npx @vscode/vsce package --no-dependencies --allow-missing-repository 2>&1
if ($LASTEXITCODE -ne 0) {
    # Try without flags for older vsce
    npx vsce package 2>&1
}

# Find the generated .vsix file
$vsix = Get-ChildItem -Path $ScriptDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($vsix) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  VSIX file: $($vsix.Name)" -ForegroundColor Green
    Write-Host "  Size:      $([math]::Round($vsix.Length/1KB, 1)) KB" -ForegroundColor Green
    Write-Host ""
    Write-Host "To install locally in VS Code:" -ForegroundColor Cyan
    Write-Host "  1. Open VS Code" -ForegroundColor White
    Write-Host "  2. Press Ctrl+Shift+P" -ForegroundColor White
    Write-Host "  3. Type: Extensions: Install from VSIX" -ForegroundColor White
    Write-Host "  4. Select: $($vsix.Name)" -ForegroundColor White
    Write-Host ""
    Write-Host "To publish to Marketplace: see PUBLISHING_GUIDE.md" -ForegroundColor Cyan
} else {
    Write-Host "WARNING: Could not find .vsix file. Packaging may have failed." -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
