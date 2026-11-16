function Enable-JyraWindowsTools {
    param([string]$ProjectRoot)
    $candidates = @()
    if ($env:ZYRA_WINDOWS_TOOLS) { $candidates += $env:ZYRA_WINDOWS_TOOLS }
    $candidates += (Join-Path $ProjectRoot 'runtime')
    # Existing tools from this PC's previously authorized isolated build.
    $candidates += 'D:\ZYRA-Build-20261114-01\tools'
    foreach ($candidate in $candidates) {
        $cargoBin = Join-Path $candidate 'cargo/bin'
        $rustupDir = Join-Path $candidate 'rustup'
        if ((Test-Path -LiteralPath (Join-Path $cargoBin 'cargo.exe')) -and (Test-Path -LiteralPath $rustupDir)) {
            $env:CARGO_HOME = Join-Path $candidate 'cargo'
            $env:RUSTUP_HOME = $rustupDir
            $env:PATH = $cargoBin + ';' + $env:PATH
            return
        }
    }
}
