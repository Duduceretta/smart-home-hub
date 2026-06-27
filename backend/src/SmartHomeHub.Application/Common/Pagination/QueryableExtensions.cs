using Microsoft.EntityFrameworkCore;

namespace SmartHomeHub.Application.Common.Pagination;

public static class QueryableExtensions
{
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default
    )
    {
        page = page < 1 ? 1 : page;
        pageSize =
            pageSize < 1 ? 10
            : pageSize > 100 ? 100
            : pageSize;

        var count = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return PagedResult<T>.Create(items, page, pageSize, count);
    }
}
