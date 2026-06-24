using System.Data.Common;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Respawn;
using SmartHomeHub.Infrastructure.Persistence;

namespace SmartHomeHub.IntegrationTests.Setup;

// O uso de [Collection] obriga o xUnit a rodar os testes desta coleção sequencialmente,
// compartilhando a mesma Factory (e o mesmo banco Docker), economizando muita CPU.
[Collection("ExtensionsCollection")]
public abstract class BaseIntegrationTest : IAsyncLifetime
{
    protected readonly IntegrationTestWebAppFactory Factory;
    protected readonly HttpClient Client;
    protected readonly IServiceScope Scope;
    protected readonly AppDbContext DbContext;

    private Respawner _respawner = default!;
    private DbConnection _dbConnection = default!;

    protected BaseIntegrationTest(IntegrationTestWebAppFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
        Client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { AllowAutoRedirect = false }
        );
        Scope = factory.Services.CreateScope();
        DbContext = Scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    public async ValueTask InitializeAsync()
    {
        _dbConnection = DbContext.Database.GetDbConnection();
        await _dbConnection.OpenAsync();

        _respawner = await Respawner.CreateAsync(
            _dbConnection,
            new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                SchemasToInclude = ["public"],
                WithReseed = true,
                TablesToIgnore = ["__EFMigrationsHistory"],
            }
        );

        await _respawner.ResetAsync(_dbConnection);
    }

    public async ValueTask DisposeAsync()
    {
        await _dbConnection.CloseAsync();
        Scope.Dispose();
        await DbContext.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
