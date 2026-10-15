$ErrorActionPreference = "Stop"

$build_script = Join-Path $PSScriptRoot "build_engine.ps1"
Write-Host "1. Building C Engine..."
& $build_script

$c_engine_dir = Join-Path $PSScriptRoot "backend\c_engine"
cd $c_engine_dir

Write-Host "`n2. Running test_engine.exe (C DSA Engine Tests)..."
.\test_engine.exe
if ($LASTEXITCODE -ne 0) {
    Write-Error "C Tests Failed."
    exit 1
}
Write-Host "C Tests Passed." -ForegroundColor Green

cd $PSScriptRoot

Write-Host "`n3. Running Python API tests..."
$venv_dir = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venv_dir)) {
    Write-Host "Virtual environment not found. Building..."
    python -m venv $venv_dir
}

$python_exe = Join-Path $venv_dir "Scripts\python.exe"
$pip_exe = Join-Path $venv_dir "Scripts\pip.exe"
$req_file = Join-Path $PSScriptRoot "backend\api\requirements.txt"
& $pip_exe install -q -r $req_file

# Start FastAPI temporarily for testing
$api_dir = Join-Path $PSScriptRoot "backend\api"
$processArgs = @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000")
$process = Start-Process -FilePath $python_exe -ArgumentList $processArgs -WorkingDirectory $api_dir -PassThru -WindowStyle Hidden

Write-Host "Waiting for FastAPI to start..."
Start-Sleep -Seconds 3

try {
    & $python_exe test_api.py
    $testResult = $LASTEXITCODE
} finally {
    Write-Host "Stopping FastAPI test server..."
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

if ($testResult -ne 0) {
    Write-Error "Python API Tests Failed."
    exit 1
}
Write-Host "Python API Tests Passed." -ForegroundColor Green
Write-Host "`nAll project validations PASS!" -ForegroundColor Green
