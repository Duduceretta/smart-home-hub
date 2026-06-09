using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Infrastructure.Messaging;
using SmartHomeHub.Infrastructure.Persistence;

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
            });

        services.AddAuthorization();

        return services;
    }
}
