param([switch]$Install)
$ErrorActionPreference = 'Stop'
if (-not $Install) {
    & (Join-Path $PSScriptRoot 'check-windows.ps1')
    Write-Output 'To install the official C++ and Rust build prerequisites after freeing space: npm run setup:windows -- -Install'
    exit
}
$drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($PSScriptRoot))
if ($drive.AvailableFreeSpace -lt 20GB) { throw 'Free at least 20 GB before installing build tools. No installation was started.' }
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$installers = Join-Path $projectRoot 'runtime/installers'
New-Item -ItemType Directory -Force $installers | Out-Null
$vs = Join-Path $installers 'vs-buildtools.exe'
& curl.exe --fail --location --retry 2 'https://aka.ms/vs/stable/vs_BuildTools.exe' --output $vs
if ($LASTEXITCODE -ne 0) { throw 'Could not download the official Microsoft installer.' }
$signature = Get-AuthenticodeSignature -LiteralPath $vs
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation') { throw 'Microsoft installer signature could not be verified.' }
$result = Start-Process -FilePath $vs -ArgumentList @('--passive','--wait','--norestart','--add','Microsoft.VisualStudio.Workload.VCTools','--includeRecommended') -Verb RunAs -Wait -PassThru -WindowStyle Hidden
if ($result.ExitCode -notin @(0,3010)) { throw 'C++ Build Tools installation did not complete.' }
$rust = Join-Path $installers 'rustup-init.exe'
$rustUrl = 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe'
& curl.exe --fail --location --retry 2 $rustUrl --output $rust
if ($LASTEXITCODE -ne 0) { throw 'Could not download official rustup.' }
$hashFile = Join-Path $installers 'rustup-init.sha256'
& curl.exe --fail --location --retry 2 ($rustUrl + '.sha256') --output $hashFile
if ($LASTEXITCODE -ne 0) { throw 'Rust checksum download failed.' }
$expected = ([IO.File]::ReadAllText($hashFile).Trim() -split '\s+')[0]
if ((Get-FileHash -LiteralPath $rust).Hash -ne $expected) { throw 'Rust installer checksum mismatch.' }
$env:CARGO_HOME = Join-Path $projectRoot 'runtime/cargo'
$env:RUSTUP_HOME = Join-Path $projectRoot 'runtime/rustup'
& $rust -y --profile minimal --default-toolchain stable --default-host x86_64-pc-windows-msvc --no-modify-path
if ($LASTEXITCODE -ne 0) { throw 'Rust installation did not complete.' }
Write-Output 'Build prerequisites installed. If Windows requests a restart, restart before npm run build:windows.'
