using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace SmartHomeHub.Application.Common.Search;

public static class SearchExtensions
{
    /// <summary>
    /// Tamanho máximo do termo de busca. O que passar disso é cortado, não recusado: query que
    /// não devolve <c>Result</c> falharia a validação como exceção (500), e um termo gigante
    /// não tem uso legítimo.
    /// </summary>
    public const int MaxTermLength = 100;

    /// <summary>Caractere de escape do <c>LIKE</c>; passe-o como 4º argumento de <c>EF.Functions.Like</c>.</summary>
    public const string EscapeCharacter = "\\";

    private static readonly MethodInfo LikeWithEscape = typeof(DbFunctionsExtensions).GetMethod(
        nameof(DbFunctionsExtensions.Like),
        [typeof(DbFunctions), typeof(string), typeof(string), typeof(string)]
    )!;

    private static readonly MethodInfo UnaccentMethod = typeof(SearchFunctions).GetMethod(
        nameof(SearchFunctions.Unaccent),
        [typeof(string)]
    )!;

    private static readonly MethodInfo ToLowerMethod = typeof(string).GetMethod(
        nameof(string.ToLower),
        Type.EmptyTypes
    )!;

    /// <summary>
    /// Padrão <c>LIKE</c> "contém" para o termo: minúsculo, sem espaços nas pontas e com
    /// <c>%</c>, <c>_</c> e <c>\</c> escapados (o usuário digita texto, não curinga). Devolve
    /// <c>null</c> quando o termo é vazio, e então a busca não filtra nada.
    /// </summary>
    public static string? CreatePattern(string? term)
    {
        var trimmed = term?.Trim();

        if (string.IsNullOrEmpty(trimmed))
            return null;

        if (trimmed.Length > MaxTermLength)
            trimmed = trimmed[..MaxTermLength];

        var escaped = trimmed
            .ToLowerInvariant()
            .Replace(EscapeCharacter, EscapeCharacter + EscapeCharacter)
            .Replace("%", EscapeCharacter + "%")
            .Replace("_", EscapeCharacter + "_");

        return $"%{escaped}%";
    }

    /// <summary>
    /// Filtra a query pelos campos de texto informados (qualquer um que contenha o termo serve),
    /// sem distinguir caixa nem acento. Termo vazio não filtra. Para busca que passa por coleções
    /// (ex.: cena que contém um dispositivo), monte o predicado com <see cref="CreatePattern"/> e
    /// <see cref="SearchFunctions.Unaccent"/> na própria query.
    /// </summary>
    public static IQueryable<T> ApplySearch<T>(
        this IQueryable<T> query,
        string? term,
        params Expression<Func<T, string?>>[] fields
    )
    {
        var pattern = CreatePattern(term);

        if (pattern is null || fields.Length == 0)
            return query;

        var parameter = Expression.Parameter(typeof(T), "entity");
        var patternHolder = Expression.Property(
            Expression.Constant(new PatternHolder(pattern)),
            nameof(PatternHolder.Value)
        );
        var normalizedPattern = Expression.Call(UnaccentMethod, patternHolder);

        Expression? body = null;

        foreach (var field in fields)
        {
            var value = new ParameterReplacer(field.Parameters[0], parameter).Visit(field.Body);
            var normalizedValue = Expression.Call(
                UnaccentMethod,
                Expression.Call(Expression.Coalesce(value, Expression.Constant("")), ToLowerMethod)
            );
            var like = Expression.Call(
                LikeWithEscape,
                Expression.Constant(EF.Functions),
                normalizedValue,
                normalizedPattern,
                Expression.Constant(EscapeCharacter)
            );

            body = body is null ? like : Expression.OrElse(body, like);
        }

        return query.Where(Expression.Lambda<Func<T, bool>>(body!, parameter));
    }

    // Closure explícita para o padrão virar parâmetro SQL (e não constante inlinada na query).
    private sealed record PatternHolder(string Value);

    private sealed class ParameterReplacer(ParameterExpression from, ParameterExpression to)
        : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == from ? to : base.VisitParameter(node);
    }
}
