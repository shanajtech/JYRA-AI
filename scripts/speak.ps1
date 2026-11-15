param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding
$inputData = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $gender = if ($inputData.profile -eq 'male') { [System.Speech.Synthesis.VoiceGender]::Male } else { [System.Speech.Synthesis.VoiceGender]::Female }
    $speaker.SelectVoiceByHints($gender)
    $speaker.Rate = if ($inputData.profile -eq 'child') { 1 } else { -1 }
    $speaker.SetOutputToWaveFile($OutputPath)
    $safeText = [System.Security.SecurityElement]::Escape([string]$inputData.text)
    $safeText = [regex]::Replace($safeText, '(?i)\b(?:zyra|jyra)\b', '<phoneme alphabet="ipa" ph="d&#x292;a&#x26A;r&#x251;">Jyra</phoneme>')
    $speaker.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">' + $safeText + '</speak>')
    $speaker.SetOutputToNull()
} finally { $speaker.Dispose() }
