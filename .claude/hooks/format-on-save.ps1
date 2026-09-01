$inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
$filePath = $inputJson.tool_input.file_path

if (-not $filePath) { exit 0 }

$exitCode = 0

if ($filePath -like "*.cs") {
    Push-Location "$PSScriptRoot\..\..\backend"
    dotnet csharpier format "$filePath"
    $exitCode = $LASTEXITCODE
    Pop-Location
}
elseif ($filePath -like "*.ts" -or $filePath -like "*.tsx") {
    Push-Location "$PSScriptRoot\..\..\frontend"
    npx biome format --write "$filePath"
    $exitCode = $LASTEXITCODE
    Pop-Location
}

exit $exitCode
