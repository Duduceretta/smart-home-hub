using FluentValidation;
using Mediator;
using Microsoft.Extensions.DependencyInjection;
using SmartHomeHub.Application.Common.Behaviors;

namespace SmartHomeHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediator(options => 
        {
            options.ServiceLifetime = ServiceLifetime.Scoped;
        });

        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        return services;
    }
}