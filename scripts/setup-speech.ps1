$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimePath = Join-Path $projectRoot 'runtime'
$modelsPath = Join-Path $projectRoot 'data/models'
New-Item -ItemType Directory -Force $runtimePath,$modelsPath | Out-Null
function Get-VerifiedFile($url,$path,$sha) {
    if ((Test-Path -LiteralPath $path) -and (Get-FileHash -LiteralPath $path).Hash -eq $sha) { return }
    & curl.exe --fail --location --retry 2 $url --output ($path + '.download')
    if ($LASTEXITCODE -ne 0) { throw 'Download failed. Try again.' }
    if ((Get-FileHash -LiteralPath ($path + '.download')).Hash -ne $sha) { throw 'Checksum mismatch; not installed.' }
    Move-Item -LiteralPath ($path + '.download') -Destination $path -Force
}
Get-VerifiedFile 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip' (Join-Path $runtimePath 'whisper.zip') '6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb'
Expand-Archive -LiteralPath (Join-Path $runtimePath 'whisper.zip') -DestinationPath (Join-Path $runtimePath 'whisper') -Force
Get-VerifiedFile 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin' (Join-Path $modelsPath 'ggml-base.bin') '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe'
Write-Output 'Offline speech recognition is ready. Restart ZYRA.'
