using SmartHomeHub.Infrastructure;
using SmartHomeHub.Api.Endpoints;
using SmartHomeHub.Application;
using SmartHomeHub.Api.Middlewares;
using SmartHomeHub.Api.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddHostedService<MqttListenerWorker>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();

app.MapUserEndpoints();
app.MapRoomEndpoints();
app.MapDeviceEndpoints();

app.Run();