using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Infrastructure.Discovery;
using SmartHomeHub.Infrastructure.Discovery.Scanners;
using SmartHomeHub.Infrastructure.HealthCheck;
using SmartHomeHub.Infrastructure.Messaging;
using SmartHomeHub.Infrastructure.Persistence;
using SmartHomeHub.Infrastructure.Realtime.Services;
using SmartHomeHub.Infrastructure.Services;

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

        services.AddTransient<IDeviceDiscoveryScanner, MdnsDiscoveryScanner>();
        services.AddTransient<IDeviceDiscoveryScanner, SsdpDiscoveryScanner>();
        services.AddTransient<IDeviceDiscoveryScanner, TuyaUdpDiscoveryScanner>();
        services.AddTransient<IDeviceDiscoveryScanner, MqttDiscoveryScanner>();
        services.AddSingleton<IDeviceDiscoveryManager, DeviceDiscoveryManager>();

        services.AddSignalR();
        services.AddScoped<IRealtimeNotificationService, RealtimeNotificationService>();

        services.AddSingleton<IDeviceProbeService, DeviceProbeService>();

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
