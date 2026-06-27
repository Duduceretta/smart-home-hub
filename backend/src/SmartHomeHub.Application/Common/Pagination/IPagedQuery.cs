namespace SmartHomeHub.Application.Common.Pagination;

public interface IPagedQuery
{
    int Page { get; }
    int PageSize { get; }
}
