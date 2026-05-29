using Microsoft.Extensions.DependencyInjection;

namespace SmartHomeHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediator(); 

        return services;
    }
}