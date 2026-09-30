---
name: validation-patterns
description: Usar ao criar ou alterar validação no backend do Nexus Hub — validator FluentValidation de command/query, pipeline behavior de validação do Mediator (source generator, não MediatR), validação de options/config no startup, ou regra cross-field.
paths:
  - "backend/**/*.cs"
---

# Validação — Nexus Hub

## Onde cada tipo de validação mora

| O que validar | Onde |
|---|---|
| Formato/obrigatoriedade de input (command/query) | `AbstractValidator<TCommand>` FluentValidation, ao lado do handler |
| Regra que depende de estado (dispositivo existe, nome único) | Handler, retornando `Result.Failure(new Error(code, ...))` com `code` contendo a palavra-chave certa (`NotFound`/`Conflict`/etc. — skill `exception-handling`) |
| Configuração/options (MQTT broker, Tuya keys, Spotify) | `IValidateOptions<T>` + `ValidateOnStart()` |
| Invariante de banco | Constraint/índice na migration (última linha de defesa) |

Não misturar mecanismos: o repo usa FluentValidation. Não introduzir DataAnnotations em command nem o `AddValidation()` nativo do .NET 10 sem decisão explícita.

## Validator
```csharp
public sealed class SetDeviceStateCommandValidator : AbstractValidator<SetDeviceStateCommand>
{
    public SetDeviceStateCommandValidator()
    {
        RuleFor(x => x.DeviceId).NotEmpty();
        RuleFor(x => x.Brightness).InclusiveBetween(0, 100).When(x => x.Brightness is not null);
    }
}
```
- Um validator por command/query, mesmo nome + `Validator`.
- Validator só valida o input. Consulta a banco (`MustAsync` com DbContext) evitar — isso é regra de estado, vai no handler.
- Registro por assembly scanning (`AddValidatorsFromAssembly...`) — conferir como o repo já registra antes de adicionar.

## Pipeline do Mediator (source generator)
A lib é **Mediator** (martinothamar), não MediatR. Diferenças que quebram código copiado de exemplo:
- Interface `IPipelineBehavior<TMessage, TResponse>` com `ValueTask<TResponse> Handle(TMessage message, MessageHandlerDelegate<TMessage, TResponse> next, CancellationToken ct)`; `TMessage : IMessage`.
- Registro de behaviors difere entre versões (`options.PipelineBehaviors` vs `AddSingleton(typeof(IPipelineBehavior<,>), ...)`). **Olhar como o repo já registra**; na dúvida, context7.
- Behavior genérico é resolvido com o lifetime configurado no `AddMediator` — se injetar algo Scoped, o Mediator precisa estar Scoped (ver regra de lifetimes).

Fluxo real (`ValidationBehavior.cs`): behavior roda os validators e, se `TResponse` é `Result`/`Result<T>` (caso comum), devolve **`Result.Failure(error)`** direto com `error = new Error(firstFailure.PropertyName, firstFailure.ErrorMessage)` — só a **primeira** falha, não a lista inteira. Como o `Code` vira o nome da propriedade (ex.: `"Brightness"`, não algo como `"X.Validation"`), `ToProblemDetails()` não bate em nenhuma palavra-chave e cai no branch default → **`400`**, não `422` (skill `exception-handling`, Caminho 1) — apesar da tabela de `ToProblemDetails()` ter um branch pra `"Validation"`, falha de FluentValidation na prática não passa por ele. Só lança `ValidationException` do FluentValidation quando o handler **não** retorna `Result`/`Result<T>` — nesse caso cai no `GlobalExceptionHandler` genérico e vira `500`, não `400`. Handler nunca recebe input inválido em nenhum dos dois casos.

## Options no startup
```csharp
builder.Services.AddOptions<MqttOptions>()
    .BindConfiguration(MqttOptions.SectionName)
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<MqttOptions>, MqttOptionsValidator>();
```
- Options com `{ get; set; }` (binder precisa mutar).
- Config faltando deve derrubar o boot, não falhar na primeira mensagem MQTT.

## Frontend
Validação no frontend (schema de formulário) é UX, não segurança. Backend sempre valida. A resposta do caminho comum (`Result` → `ToProblemDetails()`) é um `ProblemDetails` com `title`/`detail` de **um único erro** (o primeiro que falhou), não um dicionário `errors` por campo — o formulário não pode assumir múltiplos erros simultâneos vindos do backend nessa via.

## Teste
- Validator: unit test puro (`TestValidate` do FluentValidation).
- Pipeline ligado de verdade: 1 teste de integração via `WebApplicationFactory` enviando payload inválido e esperando `400` com `title`/`detail` do primeiro erro — prova que o behavior está registrado (unit do validator não prova).
