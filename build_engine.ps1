$ErrorActionPreference = "Stop"

Write-Host "Verifying GCC is available..."
if (-not (Get-Command "gcc" -ErrorAction SilentlyContinue)) {
    Write-Error "gcc is not installed or not in PATH."
    exit 1
}

$c_engine_dir = Join-Path $PSScriptRoot "backend\c_engine"
if (-not (Test-Path $c_engine_dir)) {
    Write-Error "Cannot find backend\c_engine directory."
    exit 1
}

cd $c_engine_dir

Write-Host "Compiling engine.exe..."
gcc -Wall -Wextra -Wpedantic -std=c11 -O2 -o engine.exe main.c graph.c priority_queue.c routing.c input_parser.c output.c
if ($LASTEXITCODE -ne 0) {
    Write-Error "Compilation of engine.exe failed."
    exit 1
}

Write-Host "Compiling test_engine.exe..."
gcc -Wall -Wextra -Wpedantic -std=c11 -O2 -o test_engine.exe test_engine.c graph.c priority_queue.c routing.c input_parser.c output.c
if ($LASTEXITCODE -ne 0) {
    Write-Error "Compilation of test_engine.exe failed."
    exit 1
}

Write-Host "C Engine built successfully!" -ForegroundColor Green
