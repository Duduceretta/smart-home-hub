$envFile = "$PSScriptRoot\.env.production"

if (-not (Test-Path $envFile)) {
    Write-Error "Arquivo .env.production não encontrado em backend\. Crie ele primeiro."
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

Set-Location "$PSScriptRoot\src\SmartHomeHub.Api"
dotnet watch --no-launch-profile --urls "http://localhost:5252"