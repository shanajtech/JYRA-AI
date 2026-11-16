$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'windows-tools.ps1')
Enable-JyraWindowsTools -ProjectRoot $projectRoot
Push-Location $projectRoot
try {
    & npm.cmd run tauri -- build
    if ($LASTEXITCODE -ne 0) { throw 'Native build did not complete. See prerequisite check and build output.' }
    & node.exe scripts/package-desktop-model.mjs
    if ($LASTEXITCODE -ne 0) { throw 'The app built, but the offline model sidecar could not be copied.' }
}
finally { Pop-Location }
