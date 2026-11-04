# One-command deploy: tests -> dist -> API Worker -> Pages (production) -> live smoke check.
# Usage: powershell -File scripts/deploy.ps1 [-Branch main]
param([string]$Branch = 'main')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

node --test tests/lib.test.mjs tests/site.test.mjs tests/snapshot.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Tests failed, deploy aborted.' }

node scripts/build.mjs
if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }

Push-Location workers/site-api
wrangler deploy
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Worker deploy failed.' }
Pop-Location

wrangler pages deploy dist --project-name ahmet-rifat-albuz --branch $Branch --commit-dirty=true
if ($LASTEXITCODE -ne 0) { throw 'Pages deploy failed.' }

if ($Branch -eq 'main') {
    Start-Sleep -Seconds 5
    node tests/live-site.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Live smoke check failed.' }
}
Write-Host 'DEPLOY OK'
