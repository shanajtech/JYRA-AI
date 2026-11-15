$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.vercel/project.json'))) { throw 'Link this project to your Vercel account first.' }
Write-Host 'JYRA server setup. Enter secrets here, never in chat. No paid plan is created.'
Write-Host 'Keep your Groq account on the plan you intend to use. Prepare your own persistent Upstash Redis database.'
$existing = (& npx.cmd --yes vercel env ls --environment production 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'Could not check Vercel settings. Sign in to Vercel and retry.' }
function Read-PrivateValue([string]$label) {
    $secureValue = Read-Host $label -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim() }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secureValue.Dispose() }
}
function Save-ServerValue([string]$name,[string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { throw ('No value supplied for ' + $name) }
    # Values travel via stdin, never command-line arguments, files or console output.
    $value | & npx.cmd --yes vercel env add $name --environment production --sensitive --force --yes
    if ($LASTEXITCODE -ne 0) { throw ('Could not save ' + $name + '. No deployment was started.') }
    Write-Host ($name + ' saved as a server secret.')
}
$value = Read-PrivateValue 'Groq API key'
if ($value -notmatch '^gsk_[A-Za-z0-9_-]{20,200}$') { throw 'The Groq key format is invalid.' }
Save-ServerValue 'GROQ_API_KEY' $value
$value = $null
$value = Read-PrivateValue 'Upstash REST URL (https://...upstash.io)'
$redisAddress = $null
if (-not [Uri]::TryCreate($value,[UriKind]::Absolute,[ref]$redisAddress) -or $redisAddress.Scheme -ne 'https' -or -not $redisAddress.Host.EndsWith('.upstash.io') -or $redisAddress.AbsolutePath -ne '/') { throw 'Use the HTTPS REST URL from your own Upstash database.' }
Save-ServerValue 'UPSTASH_REDIS_REST_URL' $value
$value = $null
$value = Read-PrivateValue 'Upstash REST token'
Save-ServerValue 'UPSTASH_REDIS_REST_TOKEN' $value
$value = $null
if ($existing -match '\bZYRA_SESSION_SECRET\b') {
    Write-Host 'Existing session/encryption secret kept. Rotating it would invalidate sessions and existing cloud backups.'
} else {
    $random = New-Object byte[] 48
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($random) } finally { $generator.Dispose() }
    Save-ServerValue 'ZYRA_SESSION_SECRET' ([Convert]::ToBase64String($random))
    [Array]::Clear($random,0,$random.Length)
}
Write-Host 'Required values are saved. Deploying the existing project now.'
& npx.cmd --yes vercel deploy --prod --yes
if ($LASTEXITCODE -ne 0) { throw 'Deployment did not complete. Your server settings remain saved; retry deployment.' }
Write-Host 'Open Conversation > Online chat. Test chat and cloud backup before release.'
Write-Host 'SMTP support sender, spoken replies, phone push and general PC control require separate setup/work.'
