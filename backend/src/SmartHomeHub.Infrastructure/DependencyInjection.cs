using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Infrastructure.BackgroundJobs;
using SmartHomeHub.Infrastructure.Discovery;
using SmartHomeHub.Infrastructure.Discovery.Scanners;
using SmartHomeHub.Infrastructure.HealthCheck;
using SmartHomeHub.Infrastructure.Messaging;
using SmartHomeHub.Infrastructure.Persistence;
using SmartHomeHub.Infrastructure.Realtime.Services;
using SmartHomeHub.Infrastructure.Scheduling;
using SmartHomeHub.Infrastructure.Services;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"))
        );

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.AddSingleton<IMqttService, MqttService>();

        services.AddTransient<IGoogleTvService, GoogleTvNetworkService>();

        services.AddScoped<IChromecastWakeService, ChromecastWakeService>();

        services.AddSingleton<IWakeOnLanService, WakeOnLanService>();

        services.AddTransient<IDeviceDiscoveryScanner, MdnsDiscoveryScanner>();
        services.AddTransient<IDeviceDiscoveryScanner, SsdpDiscoveryScanner>();
        // Registrado também pelo tipo concreto: TuyaLocalControlService precisa reaproveitar
        // o mesmo scanner (com o mesmo ReuseAddress já configurado) pra redescoberta de IP,
        // em vez de abrir um segundo listener concorrente nas portas 6666/6667.
        services.AddTransient<TuyaUdpDiscoveryScanner>();
        services.AddTransient<IDeviceDiscoveryScanner>(provider =>
            provider.GetRequiredService<TuyaUdpDiscoveryScanner>()
        );
        services.AddTransient<ITuyaUdpDiscoveryScanner>(provider =>
            provider.GetRequiredService<TuyaUdpDiscoveryScanner>()
        );
        services.AddTransient<IDeviceDiscoveryScanner, MqttDiscoveryScanner>();
        services.AddSingleton<IDeviceDiscoveryManager, DeviceDiscoveryManager>();

        services.AddTransient<TuyaNetProtocolClient>();
        services.AddTransient<ITuyaProtocolClientFactory, TuyaProtocolClientFactory>();
        // Singleton, não Transient: o semáforo por dispositivo e a coalescência
        // de comandos vivem em campos de instância (_deviceLocks, _pendingBatches)
        // — como Transient cria uma instância nova por resolução do DI (uma por
        // requisição HTTP), esses dois mecanismos nunca compartilhariam estado
        // entre requisições concorrentes, ficando sem efeito nenhum em produção.
        // Dependências (ITuyaProtocolClientFactory, ITuyaUdpDiscoveryScanner,
        // ILogger) não guardam estado scoped — seguro capturar como singleton.
        services.AddSingleton<ITuyaLocalControlService, TuyaLocalControlService>();

        services.AddSignalR();
        services.AddScoped<IRealtimeNotificationService, RealtimeNotificationService>();

        services.AddSingleton<IDeviceProbeService, DeviceProbeService>();

        services.AddDataProtection();
        services.AddSingleton<ISpotifyTokenCipher, SpotifyTokenCipher>();
        services.AddSingleton<ISpotifyOAuthStateStore, SpotifyOAuthStateStore>();
        services.AddHttpClient<ISpotifyMediaService, SpotifyMediaService>();

        services.AddSingleton<IAutomationEventQueue, AutomationEventQueue>();

        services.AddHostedService<AutomationExecutionWorker>();
        services.AddScoped<IAutomationActionDispatcher, AutomationActionDispatcher>();
        services.AddScoped<IAutomationSchedulerService, AutomationSchedulerService>();
        services.AddScoped<IAutomationTimeTriggerJob, AutomationTimeTriggerJob>();

        services.AddHangfire(config =>
            config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(options =>
                {
                    options.UseNpgsqlConnection(
                        configuration.GetConnectionString("DefaultConnection")
                    );
                })
        );

        // Adiciona o processo em background (Worker) do Hangfire
        services.AddHangfireServer(options =>
        {
            // Limitar workers é essencial aqui. Garante que os retries lentos de hardware
            // não roubem 100% da CPU, deixando espaço para o nosso Channel<T> rodar liso.
            options.WorkerCount = Math.Min(Environment.ProcessorCount, 10);
        });

        var firebaseProjectId = configuration["Firebase:ProjectId"];

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",
                    ValidateAudience = true,
                    ValidAudience = firebaseProjectId,
                    ValidateLifetime = true,
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }
}
