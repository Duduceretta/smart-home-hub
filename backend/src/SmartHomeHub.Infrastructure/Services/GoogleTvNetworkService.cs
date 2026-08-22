using System.Net;
using System.Net.Sockets;
using AdvancedSharpAdbClient;
using AdvancedSharpAdbClient.Models;
using AdvancedSharpAdbClient.Receivers;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;

namespace SmartHomeHub.Infrastructure.Services;

public class GoogleTvNetworkService : IGoogleTvService
{
    private readonly ILogger<GoogleTvNetworkService> _logger;

    public GoogleTvNetworkService(ILogger<GoogleTvNetworkService> logger)
    {
        _logger = logger;

        var adbPath = @"C:\adb\adb.exe";

        if (File.Exists(adbPath))
        {
            var server = new AdbServer();
            server.StartServer(adbPath, false);
        }
        else
        {
            Console.WriteLine(
                $"[AVISO] Servidor ADB não encontrado em {adbPath}. Comandos da TV falharão."
            );
        }
    }

    public async Task SendKeycodeAsync(
        string ipAddress,
        int keycode,
        CancellationToken cancellationToken = default
    )
    {
        var client = new AdbClient();
        var endpoint = new DnsEndPoint(ipAddress, 5555);

        try
        {
            client.Connect(endpoint);
        }
        catch (Exception ex) when (ex is SocketException or TimeoutException)
        {
            throw new DeviceUnreachableException(ipAddress);
        }

        var targetDevice = client.GetDevices().FirstOrDefault(d => d.Serial.Contains(ipAddress));

        if (targetDevice is null)
            throw new DeviceUnreachableException(ipAddress);

        if (targetDevice.State is DeviceState.Unauthorized or DeviceState.NoPermissions)
            throw new AdbUnauthorizedException(ipAddress);

        var receiver = new ConsoleOutputReceiver();

        try
        {
            await client.ExecuteRemoteCommandAsync(
                $"input keyevent {keycode}",
                targetDevice,
                receiver,
                cancellationToken
            );
        }
        catch (DeviceCommunicationException)
        {
            throw;
        }
        catch (Exception)
        {
            throw new DeviceUnreachableException(ipAddress);
        }
    }

    public async Task<bool> GetPowerStateAsync(
        string ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var client = new AdbClient();
            var endpoint = new DnsEndPoint(ipAddress, 5555);

            client.Connect(endpoint);

            var targetDevice = client
                .GetDevices()
                .FirstOrDefault(d => d.Serial.Contains(ipAddress));

            if (targetDevice is null || targetDevice.State != DeviceState.Online)
            {
                return false;
            }

            var receiver = new ConsoleOutputReceiver();
            await client.ExecuteRemoteCommandAsync(
                "dumpsys power",
                targetDevice,
                receiver,
                cancellationToken
            );

            return ParsePowerState(receiver.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Falha ao consultar o estado de energia da TV em {IpAddress}",
                ipAddress
            );
            return false;
        }
    }

    public static bool ParsePowerState(string? dumpsysOutput)
    {
        if (string.IsNullOrWhiteSpace(dumpsysOutput))
            return false;

        return dumpsysOutput.Contains("mWakefulness=Awake", StringComparison.Ordinal)
            || dumpsysOutput.Contains("Display Power: state=ON", StringComparison.Ordinal)
            || dumpsysOutput.Contains(
                "mHoldingDisplaySuspendBlocker=true",
                StringComparison.Ordinal
            );
    }
}
