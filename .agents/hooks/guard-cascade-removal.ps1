$json = [Console]::In.ReadToEnd() | ConvertFrom-Json
$toolName = $json.toolCall.name
$toolArgs = $json.toolCall.args

$oldText = ""
$newText = ""

if ($toolName -eq "replace_file_content") {
    $oldText = $toolArgs.TargetContent
    $newText = $toolArgs.ReplacementContent
}
elseif ($toolName -eq "multi_replace_file_content") {
    # Formato exato de cada item em ReplacementChunks não confirmado na doc oficial —
    # assume TargetContent/ReplacementContent por chunk, igual ao replace_file_content.
    # Se não bater, ajuste os nomes de campo aqui.
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
        reason = "Essa edicao remove um DeleteBehavior.Cascade/SetNull/Restrict existente sem justificativa. Nao e proibido por padrao (ver backend/docs/database-iot.md). Se for intencional, inclua um comentario // cascade-removal-ok: <motivo> na edicao."
    }
}
else {
    $output = @{ decision = "allow" }
}

$output | ConvertTo-Json -Compress