using Mediator;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Common.Mappings;

namespace SmartHomeHub.Application.Features.Scenes.Queries.GetSceneRooms;

/// <summary>
/// Ambientes que aparecem em alguma cena do usuário (dispositivo fora de ambiente conta como
/// "Sem cômodo"), em ordem alfabética: alimenta o filtro de ambiente da lista de cenas sem
/// depender da página carregada. Não segue IPagedQuery: o conjunto é limitado pelos ambientes
/// do usuário, como as queries de estatística agregada.
/// </summary>
public record GetSceneRoomsQuery(string FirebaseUid) : IQuery<List<string>>;

public class GetSceneRoomsQueryHandler(IAppDbContext dbContext)
    : IQueryHandler<GetSceneRoomsQuery, List<string>>
{
    public async ValueTask<List<string>> Handle(
        GetSceneRoomsQuery request,
        CancellationToken cancellationToken
    )
    {
        return await dbContext
            .Scenes.AsNoTracking()
            .Where(scene => scene.User.ExternalAuthUid == request.FirebaseUid)
            .SelectMany(scene => scene.Items)
            .Select(item => item.Device.Room != null ? item.Device.Room.Name : RoomNames.NoRoom)
            .Distinct()
            .OrderBy(name => name)
            .ToListAsync(cancellationToken);
    }
}
