$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimePath = Join-Path $projectRoot 'runtime'
$modelsPath = Join-Path $projectRoot 'data/models'
New-Item -ItemType Directory -Force $runtimePath,$modelsPath | Out-Null
function Get-VerifiedFile($url,$path,$sha) {
    if ((Test-Path -LiteralPath $path) -and (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -eq $sha) { return }
    & curl.exe --fail --location --retry 2 $url --output ($path + '.download')
    if ($LASTEXITCODE -ne 0) { throw 'Download failed. Please try again.' }
    if ((Get-FileHash -LiteralPath ($path + '.download') -Algorithm SHA256).Hash -ne $sha) { throw 'Checksum mismatch. File was not installed.' }
    Move-Item -LiteralPath ($path + '.download') -Destination $path -Force
}
Get-VerifiedFile 'https://github.com/ggml-org/llama.cpp/releases/download/b12375/llama-b12375-bin-win-cpu-x64.zip' (Join-Path $runtimePath 'llama.zip') '3aa7046f1b310c404418625d4e7e7b057c2d0e0eef5557925561381373d8f026'
Expand-Archive -LiteralPath (Join-Path $runtimePath 'llama.zip') -DestinationPath (Join-Path $runtimePath 'llama') -Force
Get-VerifiedFile 'https://huggingface.co/bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen_Qwen3-4B-Instruct-2507-Q4_K_M.gguf' (Join-Path $modelsPath 'Qwen_Qwen3-4B-Instruct-2507-Q4_K_M.gguf') '2fde00ce69dd4899c70d020845e2638353015bba0fdf161b3eb965f2bca4464e'
Write-Output 'Local AI is ready. Start ZYRA with npm run dev:all.'
