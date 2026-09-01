$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$filePath = $json.toolCall.args.TargetFile

if (-not $filePath) {
    Write-Output '{}'
    exit 0
}

if ($filePath -like "*.cs") {
    dotnet csharpier "$filePath" | Out-Null
}
elseif ($filePath -like "*.ts" -or $filePath -like "*.tsx") {
    Push-Location "$PSScriptRoot\..\..\frontend"
    npx biome format --write "$filePath" | Out-Null
    Pop-Location
}

Write-Output '{}'