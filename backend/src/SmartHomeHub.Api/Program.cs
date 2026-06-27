using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using SmartHomeHub.Api.Endpoints;
using SmartHomeHub.Api.Middlewares;
using SmartHomeHub.Api.Workers;
using SmartHomeHub.Application;
using SmartHomeHub.Infrastructure;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/smarthome-log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    Log.Information("Iniciando o motor da API Smart Home Hub...");

    DotNetEnv.Env.TraversePath().Load();

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    builder.Services.AddHttpClient();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApplication();
    builder.Services.AddHostedService<MqttListenerWorker>();
    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();
    builder.Services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer(
            (document, context, cancellationToken) =>
            {
                document.Components ??= new OpenApiComponents();

                var scheme = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Insira o token JWT gerado na aba Dev Utilities.",
                };
                document.AddComponent("Bearer", scheme);

                document.Security ??= [];
                document.Security.Add(
                    new OpenApiSecurityRequirement
                    {
                        {
                            new OpenApiSecuritySchemeReference("Bearer", document),
                            new List<string>()
                        },
                    }
                );

                return Task.CompletedTask;
            }
        );
    });

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();

        app.MapScalarApiReference(options =>
        {
            options
                .WithTitle("Smart Home Hub API")
                .WithTheme(ScalarTheme.DeepSpace)
                .WithDefaultHttpClient(ScalarTarget.JavaScript, ScalarClient.Fetch);
        });
    }

    app.UseExceptionHandler();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapUserEndpoints();
    app.MapRoomEndpoints();
    app.MapDeviceEndpoints();
    app.MapDeviceGroupEndpoints();
    app.MapDevEndpoints(app.Environment);

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Falha catastrófica durante a inicialização do host.");
}
finally
{
    Log.CloseAndFlush();
}
