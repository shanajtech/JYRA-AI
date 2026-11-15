$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (Test-Path -LiteralPath (Join-Path $projectRoot 'runtime/cargo/bin/cargo.exe')) {
    $env:CARGO_HOME = Join-Path $projectRoot 'runtime/cargo'
    $env:RUSTUP_HOME = Join-Path $projectRoot 'runtime/rustup'
    $env:PATH = (Join-Path $env:CARGO_HOME 'bin') + ';' + $env:PATH
}
Push-Location $projectRoot
try { & npm.cmd run tauri -- build; if ($LASTEXITCODE -ne 0) { throw 'Native build did not complete. See prerequisite check and build output.' } }
finally { Pop-Location }
