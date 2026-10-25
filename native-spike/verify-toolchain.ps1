$ErrorActionPreference = "Stop"
$required = @("cargo", "rustc", "uniffi-bindgen")
$missing = @()
foreach ($name in $required) {
  if (Get-Command $name -ErrorAction SilentlyContinue) {
    & $name --version
    if ($LASTEXITCODE -ne 0) { throw "$name --version failed with exit code $LASTEXITCODE" }
  } else {
    $missing += $name
  }
}
if ($missing.Count -gt 0) {
  Write-Host ("Native toolchain incomplete; missing: " + ($missing -join ", "))
  exit 2
}

& cargo fmt --manifest-path native-spike/Cargo.toml -- --check
if ($LASTEXITCODE -ne 0) { throw "cargo fmt check failed with exit code $LASTEXITCODE" }
& cargo test --manifest-path native-spike/Cargo.toml
if ($LASTEXITCODE -ne 0) { throw "cargo test failed with exit code $LASTEXITCODE" }
& cargo clippy --manifest-path native-spike/Cargo.toml -- -D warnings
if ($LASTEXITCODE -ne 0) { throw "cargo clippy failed with exit code $LASTEXITCODE" }

$tempOutput = Join-Path ([IO.Path]::GetTempPath()) ("tetrio-mobile-uniffi-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempOutput | Out-Null
try {
  & uniffi-bindgen generate native-spike/tetrio_mobile.udl --language kotlin --out-dir $tempOutput
  if ($LASTEXITCODE -ne 0) { throw "uniffi-bindgen generation failed with exit code $LASTEXITCODE" }
  if (-not (Get-ChildItem -LiteralPath $tempOutput -File)) { throw "uniffi-bindgen produced no files" }
} finally {
  if (Test-Path -LiteralPath $tempOutput) {
    Remove-Item -LiteralPath $tempOutput -Recurse -Force
  }
}
Write-Host "native toolchain and UDL gate: ok"