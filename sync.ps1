# Mirror anoslide plugins into every dsh profile node_modules location.
# The repo under this folder stays the single source of truth.
# Usage: run  .\sync.ps1  (or use this file from any shell)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$dests = @(
    (Join-Path $env:USERPROFILE '.dsh\profiles\node_modules\@anoslide'),
    (Join-Path $env:USERPROFILE '.dsh\profiles\web\node_modules\@anoslide')
)

foreach ($name in @('dsh-host-files', 'dsh-client-vscode-layout')) {
    $srcDir = Join-Path $repo $name
    if (-not (Test-Path $srcDir)) {
        Write-Host "missing dir $srcDir" -ForegroundColor Red
        continue
    }
    foreach ($dest in $dests) {
        Write-Host "sync $name -> $dest"
        robocopy $srcDir (Join-Path $dest $name) /MIR /R:1 /W:1 /NP /NFL /NDL | Out-Null
        if ($LASTEXITCODE -ge 8) {
            Write-Host "sync $name to $dest failed (robocopy exit=$LASTEXITCODE)" -ForegroundColor Red
        } else {
            Write-Host "synced $name"
        }
    }
}

Write-Host ''
Write-Host 'Done. Host-side changes need a dsh web restart; client-side changes need a page refresh.' -ForegroundColor Yellow
