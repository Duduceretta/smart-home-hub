using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Application.Common.Search;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Features.Scenes;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Common.Search;

// ApplySearch é o bloco reutilizável de busca textual: roda contra o PostgreSQL real porque
// depende da extensão unaccent e do LIKE com escape, que não existem no provider em memória.
public class ApplySearchTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private async Task SeedRoomsAsync(CancellationToken ct, params string[] names)
    {
        var user = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        DbContext.Rooms.AddRange(names.Select(name => new Room { UserId = user.Id, Name = name }));
        await DbContext.SaveChangesAsync(ct);
    }

    private async Task<List<string>> SearchAsync(
        string? term,
        CancellationToken ct,
        bool includeIcon = false
    )
    {
        var query = includeIcon
            ? DbContext.Rooms.ApplySearch(term, room => room.Name, room => room.Icon)
            : DbContext.Rooms.ApplySearch(term, room => room.Name);

        return await query.OrderBy(room => room.Name).Select(room => room.Name).ToListAsync(ct);
    }

    [Fact]
    public async Task ApplySearch_ShouldIgnoreCaseAndAccents()
    {
        var ct = TestContext.Current.CancellationToken;
        await SeedRoomsAsync(ct, "Cozinha", "Área de Serviço", "Sala");

        (await SearchAsync("AREA", ct)).Should().Equal("Área de Serviço");
        (await SearchAsync("serviço", ct)).Should().Equal("Área de Serviço");
    }

    [Fact]
    public async Task ApplySearch_BlankTerm_ShouldNotFilter()
    {
        var ct = TestContext.Current.CancellationToken;
        await SeedRoomsAsync(ct, "Cozinha", "Sala");

        (await SearchAsync(null, ct)).Should().Equal("Cozinha", "Sala");
        (await SearchAsync("   ", ct)).Should().Equal("Cozinha", "Sala");
    }

    [Fact]
    public async Task ApplySearch_ShouldTreatLikeWildcardsAsLiteralText()
    {
        var ct = TestContext.Current.CancellationToken;
        await SeedRoomsAsync(ct, "Sala 100%", "Sala_2", "Sala 3", "Caminho\\Final");

        (await SearchAsync("%", ct)).Should().Equal("Sala 100%");
        (await SearchAsync("_", ct)).Should().Equal("Sala_2");
        (await SearchAsync("\\", ct)).Should().Equal("Caminho\\Final");
    }

    [Fact]
    public async Task ApplySearch_WithSeveralFields_ShouldMatchAnyOfThemAndSurviveNullFields()
    {
        var ct = TestContext.Current.CancellationToken;
        var user = await ScenesTestData.SeedUserAsync(DbContext, cancellationToken: ct);
        DbContext.Rooms.AddRange(
            new Room
            {
                UserId = user.Id,
                Name = "Sala",
                Icon = "sofa",
            },
            new Room { UserId = user.Id, Name = "Quarto" },
            new Room
            {
                UserId = user.Id,
                Name = "Garagem",
                Icon = "car",
            }
        );
        await DbContext.SaveChangesAsync(ct);

        (await SearchAsync("sofa", ct, includeIcon: true)).Should().Equal("Sala");
        (await SearchAsync("a", ct, includeIcon: true)).Should().Equal("Garagem", "Quarto", "Sala");
    }
}
