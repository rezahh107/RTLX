$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $ScriptDir "install-personal.mjs") @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
