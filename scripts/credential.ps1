param([ValidateSet('protect','unprotect')][string]$Mode)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
Add-Type -AssemblyName System.Security
$data = [Console]::In.ReadToEnd()
$entropy = [Text.Encoding]::UTF8.GetBytes('ZYRA Gmail credential v1')
if ($Mode -eq 'protect') {
    $bytes = [Text.Encoding]::UTF8.GetBytes($data)
    [Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)))
} else {
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($data),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    [Console]::Write([Text.Encoding]::UTF8.GetString($bytes))
}
