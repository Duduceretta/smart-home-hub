$inputJson = [Console]::In.ReadToEnd() | ConvertFrom-Json

if ($inputJson.tool_name -ne "Edit") { exit 0 }

$old = $inputJson.tool_input.old_string
$new = $inputJson.tool_input.new_string

$hadCascade = $old -match "DeleteBehavior\.(Cascade|SetNull|Restrict)"
$stillHasCascade = $new -match "DeleteBehavior\.(Cascade|SetNull|Restrict)"
$hasJustification = $new -match "cascade-removal-ok"

if ($hadCascade -and -not $stillHasCascade -and -not $hasJustification) {
    [Console]::Error.WriteLine("Bloqueado: essa edicao remove um DeleteBehavior.Cascade/SetNull/Restrict existente. Isso e uma configuracao fisica real do schema (ver backend/docs/database-iot.md), nao e proibida por padrao. Se a remocao for mesmo intencional, inclua um comentario '// cascade-removal-ok: <motivo>' na edicao.")
    exit 2
}

exit 0