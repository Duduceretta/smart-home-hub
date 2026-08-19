using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NSubstitute;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace SmartHomeHub.IntegrationTests.Setup;

public class IntegrationTestWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder(
        "timescale/timescaledb:latest-pg15"
    )
        .WithDatabase("smarthomehub_test_db")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    public async ValueTask InitializeAsync()
    {
        await _dbContainer.StartAsync();
    }

    public new async ValueTask DisposeAsync()
    {
        await _dbContainer.DisposeAsync();
        GC.SuppressFinalize(this);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();

            services.Configure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.AuthenticationScheme;
                options.DefaultChallengeScheme = TestAuthHandler.AuthenticationScheme;
                options.DefaultScheme = TestAuthHandler.AuthenticationScheme;
            });

            services
                .AddAuthentication(defaultScheme: TestAuthHandler.AuthenticationScheme)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.AuthenticationScheme,
                    options => { }
                );

            services.AddAuthorization(options =>
            {
                options.AddPolicy(
                    "TestPolicy",
                    policy =>
                    {
                        policy.AuthenticationSchemes.Add(TestAuthHandler.AuthenticationScheme);
                        policy.RequireAuthenticatedUser();
                    }
                );
                options.DefaultPolicy = options.GetPolicy("TestPolicy")!;
            });

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseNpgsql(_dbContainer.GetConnectionString());
            });

            // Descoberta de dispositivos: substitui os scanners reais (rede/UDP/MQTT) por um
            // scanner controlável pelos testes, e o notificador SignalR por um spy NSubstitute
            // (Singleton, para ser visível a todos os IServiceScope abertos pelo DeviceDiscoveryManager).
            services.RemoveAll<IDeviceDiscoveryScanner>();
            services.AddSingleton<TestDiscoveryScanner>();
            services.AddSingleton<IDeviceDiscoveryScanner>(sp =>
                sp.GetRequiredService<TestDiscoveryScanner>()
            );

            services.RemoveAll<IRealtimeNotificationService>();
            services.AddSingleton(_ => Substitute.For<IRealtimeNotificationService>());

            var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Database.Migrate();
        });
    }
}
