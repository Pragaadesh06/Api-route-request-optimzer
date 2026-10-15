$ErrorActionPreference = "Stop"

Write-Host "Verifying Python is available..."
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH."
    exit 1
}

Write-Host "Verifying GCC is available..."
if (-not (Get-Command "gcc" -ErrorAction SilentlyContinue)) {
    Write-Error "gcc is not installed or not in PATH. Cannot build C Engine."
    exit 1
}

$c_engine_dir = Join-Path $PSScriptRoot "backend\c_engine"
$engine_exe = Join-Path $c_engine_dir "engine.exe"

if (-not (Test-Path $engine_exe)) {
    Write-Host "engine.exe not found. Building..."
    $build_script = Join-Path $PSScriptRoot "build_engine.ps1"
    & $build_script
} else {
    Write-Host "C Engine found."
}

$venv_dir = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venv_dir)) {
    Write-Host "Creating virtual environment .venv..."
    python -m venv $venv_dir
}

Write-Host "Activating virtual environment..."
$activate_script = Join-Path $venv_dir "Scripts\Activate.ps1"
. $activate_script

Write-Host "Installing requirements..."
$req_file = Join-Path $PSScriptRoot "backend\api\requirements.txt"
pip install -q -r $req_file

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "RouteFlow Backend is Starting on 127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "To use the frontend, open index.html in your browser!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

$api_dir = Join-Path $PSScriptRoot "backend\api"
cd $api_dir
python -m uvicorn main:app --host 127.0.0.1 --port 8000
