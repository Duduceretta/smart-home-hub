using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using SmartHomeHub.Api.Endpoints;
using SmartHomeHub.Api.Middlewares;
using SmartHomeHub.Api.Workers;
using SmartHomeHub.Application;
using SmartHomeHub.Infrastructure;
using SmartHomeHub.Infrastructure.BackgroundJobs;
using SmartHomeHub.Infrastructure.Persistence;

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

    // 1. REGISTRO DA POLÍTICA DE CORS
    // Origens lidas de configuração (Cors:AllowedOrigins / Cors:AllowedOriginsDevelopment),
    // não hardcoded, para trocar sem recompilar. Chave separada por ambiente
    // (em vez de deixar appsettings.Development.json "sobrescrever" o array da
    // base) de propósito: array em appsettings faz merge posição-a-posição
    // (Cors:AllowedOrigins:0, :1, ...), não substituição — se a base ganhar
    // uma entrada a mais sem o Development acompanhar em contagem, um domínio
    // de produção vaza silenciosamente pra política de dev. Selecionar a
    // chave inteira por env.IsDevelopment() evita depender de contagem bater.
    var corsSectionKey = builder.Environment.IsDevelopment()
        ? "Cors:AllowedOriginsDevelopment"
        : "Cors:AllowedOrigins";
    var corsAllowedOrigins = builder.Configuration.GetSection(corsSectionKey).Get<string[]>() ?? [];

    if (corsAllowedOrigins.Length == 0)
    {
        // Lista vazia derruba CORS silenciosamente pra TODAS as rotas (preflight
        // vira 204 sem Access-Control-Allow-Origin) — sintoma raro de investigar
        // porque a API sobe normal e as respostas HTTP diretas continuam 200.
        // Causa mais comum: appsettings.json não é encontrado porque o processo
        // rodou com ContentRootPath != pasta do app (ex: "dotnet caminho/app.dll"
        // executado de outro diretório de trabalho).
        Log.Warning(
            "Nenhuma origem CORS configurada em {CorsSectionKey} — todo preflight vai falhar sem Access-Control-Allow-Origin.",
            corsSectionKey
        );
    }

    builder.Services.AddCors(options =>
    {
        options.AddPolicy(
            "AllowFrontend",
            policy =>
            {
                policy
                    .WithOrigins(corsAllowedOrigins)
                    .SetIsOriginAllowedToAllowWildcardSubdomains()
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            }
        );
    });

    builder.Services.AddHttpClient();
    builder.Services.AddMemoryCache();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApplication();
    builder.Services.AddHostedService<MqttListenerWorker>();
    builder.Services.AddHostedService<DeviceHealthCheckWorker>();
    builder.Services.AddHostedService<DeviceStatePollingWorker>();

    if (builder.Environment.IsDevelopment())
    {
        builder.Services.AddHostedService<MockTelemetryWorker>();
    }

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

    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
    }

    // 2. ATIVAÇÃO DO MIDDLEWARE DE CORS (Deve vir ANTES de Authentication/Authorization)
    app.UseCors("AllowFrontend");

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
    app.UseHangfireDashboard("/hangfire");

    app.MapHubEndpoints();
    app.MapDashboardEndpoints();
    app.MapHistoryEndpoints();
    app.MapUserEndpoints();
    app.MapRoomEndpoints();
    app.MapDeviceEndpoints();
    app.MapDeviceGroupEndpoints();
    app.MapAutomationEndpoints();
    app.MapSpotifyEndpoints();
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
