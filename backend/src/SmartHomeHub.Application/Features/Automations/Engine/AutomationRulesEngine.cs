using System.Collections.Concurrent;
using System.Text.Json;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.Domain.ValueObjects;

namespace SmartHomeHub.Application.Features.Automations.Engine;

public interface IAutomationRulesEngine
{
    /// <summary>
    /// Avalia uma automação contra o contexto atual, utilizando cache de compilação estática.
    /// </summary>
    bool Evaluate(Automation automation, AutomationEvaluationContext context);
}

public sealed class AutomationRulesEngine(IAutomationConditionCompiler compiler)
    : IAutomationRulesEngine
{
    private record CacheEntry(
        DateTimeOffset PayloadVersion,
        Func<AutomationEvaluationContext, bool> Evaluator
    );

    // Dicionário concorrente para thread-safety no hot path. Chave = Automation.Id
    private readonly ConcurrentDictionary<Guid, CacheEntry> _cache = new();

    public bool Evaluate(Automation automation, AutomationEvaluationContext context)
    {
        // Invalidação por hash SHA256 do payload, recalculado a cada
        // avaliação, custava mais do que o cache economizava — o objetivo
        // era invalidar "na escrita", não recomputar um hash criptográfico
        // por evento. UpdatedAt já é mantido automaticamente pelo
        // AppDbContext.SaveChangesAsync em todo Modified (inclusive quando
        // o usuário edita a regra no editor), então serve de versão sem
        // custo extra: é só uma comparação de DateTimeOffset.
        var currentVersion = automation.UpdatedAt ?? automation.CreatedAt;

        // 1. Tenta pegar do cache e verifica se a versão do payload ainda é a mesma.
        // Se bater, ignora o JSON e executa a Lambda nativa direto da memória.
        if (
            _cache.TryGetValue(automation.Id, out var entry)
            && entry.PayloadVersion == currentVersion
        )
        {
            return entry.Evaluator(context);
        }

        // 2. Cache miss ou o payload mudou (usuário editou a regra na UI) -> Recompila.
        var payloadObj = JsonSerializer.Deserialize<AutomationPayload>(
            automation.RulePayload,
            AutomationPayloadJsonOptions.Default
        );

        var compiledFunc = compiler.Compile(payloadObj?.Conditions);

        // 3. Atualiza o cache (sobrescreve a versão antiga se existir)
        _cache[automation.Id] = new CacheEntry(currentVersion, compiledFunc);

        return compiledFunc(context);
    }
}
