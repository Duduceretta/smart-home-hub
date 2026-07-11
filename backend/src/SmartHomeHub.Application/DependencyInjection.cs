using FluentValidation;
using Mediator;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Behaviors;
using SmartHomeHub.Application.Common.Mappings;

namespace SmartHomeHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediator(options =>
        {
            options.ServiceLifetime = ServiceLifetime.Scoped;
        });

        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));

        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        MapsterConfiguration.RegisterMappings();

        return services;
    }
}
