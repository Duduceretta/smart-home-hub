$inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
$filePath = $inputJson.tool_input.file_path

if (-not $filePath) { exit 0 }

if ($filePath -like "*.cs") {
    dotnet csharpier "$filePath"
}
elseif ($filePath -like "*.ts" -or $filePath -like "*.tsx") {
    Push-Location "$PSScriptRoot\..\..\frontend"
    npx biome format --write "$filePath"
    Pop-Location
}

exit 0