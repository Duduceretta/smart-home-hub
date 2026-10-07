namespace SmartHomeHub.Application.Common.Search;

/// <summary>
/// Funções do banco usadas na busca textual. Só existem para o EF traduzir: o mapeamento para o
/// <c>unaccent</c> do PostgreSQL fica no <c>AppDbContext</c>, e chamar o método fora de uma query
/// é um erro de uso.
/// </summary>
public static class SearchFunctions
{
    public static string Unaccent(string value) =>
        throw new NotSupportedException(
            "Unaccent só pode ser usado dentro de uma query traduzida pelo EF Core."
        );
}
