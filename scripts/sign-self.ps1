# Sign dist\aac.exe with a local self-signed code-signing certificate.
# Signing alone does not remove "unknown publisher" for other people, but it
# makes this machine trust it once the certificate is installed (install-cert.bat).
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\sign-self.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$exe = Join-Path $root 'dist\aac.exe'
$full = Join-Path $root 'dist\aac-full.exe'
$cer = Join-Path $root 'dist\aac-codesign.cer'
$subject = 'CN=Example Company Config, O=aac, C=CN'

if (-not (Test-Path $exe)) { throw "not found: $exe" }

$cert = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq $subject -and $_.HasPrivateKey } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $cert) {
  Write-Host '[1/3] creating self-signed code-signing certificate...'
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $subject `
    -KeyUsage DigitalSignature `
    -FriendlyName 'aac local code signing' `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -NotAfter (Get-Date).AddYears(5)
} else {
  Write-Host '[1/3] reusing existing certificate'
}

Write-Host '[2/3] signing executables...'
foreach ($target in @($exe, $full)) {
  if (-not (Test-Path $target)) { continue }
  $sig = Set-AuthenticodeSignature -FilePath $target -Certificate $cert -TimestampServer 'http://timestamp.digicert.com' -ErrorAction SilentlyContinue
  if (-not $sig -or $sig.Status -eq 'UnknownError') {
    # offline or timestamp server unreachable: sign without a timestamp
    $sig = Set-AuthenticodeSignature -FilePath $target -Certificate $cert
  }
  Write-Host ("      " + (Split-Path $target -Leaf) + ": " + $sig.Status)
}

Write-Host '[3/3] exporting public certificate...'
Export-Certificate -Cert $cert -FilePath $cer -Force | Out-Null
Write-Host ("      " + $cer)
Write-Host ''
Write-Host 'Next: run install-cert.bat as administrator once, then the exe shows'
Write-Host '      a verified publisher on THIS machine.'
