$ErrorActionPreference = 'Stop'
$rust = Get-Command rustc.exe -ErrorAction SilentlyContinue
$cargo = Get-Command cargo.exe -ErrorAction SilentlyContinue
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
$cpp = if (Test-Path -LiteralPath $vswhere) { & $vswhere -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath } else { '' }
$webview = Test-Path -LiteralPath (Join-Path ${env:ProgramFiles(x86)} 'Microsoft/EdgeWebView/Application')
$drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($PSScriptRoot))
[PSCustomObject]@{ Node = [bool](Get-Command node.exe -ErrorAction SilentlyContinue); Git = [bool](Get-Command git.exe -ErrorAction SilentlyContinue); Rust = [bool]$rust; Cargo = [bool]$cargo; CppBuildTools = [bool]$cpp; WebView2 = $webview; FreeGB = [math]::Round($drive.AvailableFreeSpace / 1GB,1); NativeBuildReady = [bool]($rust -and $cargo -and $cpp -and $webview) } | ConvertTo-Json
