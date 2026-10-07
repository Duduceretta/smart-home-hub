namespace SmartHomeHub.Application.Common.Search;

/// <summary>
/// Query de listagem com busca textual livre. Convive com <c>IPagedQuery</c>: a busca filtra o
/// conjunto inteiro no banco e a paginação corta o resultado já filtrado.
/// </summary>
public interface ISearchableQuery
{
    string? Search { get; }
}
