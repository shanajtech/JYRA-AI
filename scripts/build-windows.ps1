$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'windows-tools.ps1')
Enable-JyraWindowsTools -ProjectRoot $projectRoot
Push-Location $projectRoot
try { & npm.cmd run tauri -- build; if ($LASTEXITCODE -ne 0) { throw 'Native build did not complete. See prerequisite check and build output.' } }
finally { Pop-Location }
