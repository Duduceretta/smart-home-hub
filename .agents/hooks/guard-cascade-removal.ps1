$inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json
$toolName = $inputJson.toolCall.name
$toolArgs = $inputJson.toolCall.args

$oldText = ""
$newText = ""

if ($toolName -eq "replace_file_content") {
    $oldText = $toolArgs.TargetContent
    $newText = $toolArgs.ReplacementContent
}
elseif ($toolName -eq "multi_replace_file_content") {
    foreach ($chunk in $toolArgs.ReplacementChunks) {
        $oldText += "`n" + $chunk.TargetContent
        $newText += "`n" + $chunk.ReplacementContent
    }
}

$pattern = "DeleteBehavior\.(Cascade|SetNull|Restrict)"
$hadCascade = $oldText -match $pattern
$stillHasCascade = $newText -match $pattern
$hasJustification = $newText -match "cascade-removal-ok"

if ($hadCascade -and -not $stillHasCascade -and -not $hasJustification) {
    $output = @{
        decision = "deny"
        reason = "Essa edicao remove um DeleteBehavior.Cascade/SetNull/Restrict existente sem justificativa. Nao e proibido por padrao (ver backend/docs/database.md). Se for intencional, inclua um comentario // cascade-removal-ok: <motivo> na edicao."
    }
}
else {
    $output = @{ decision = "allow" }
}

$output | ConvertTo-Json -Compress