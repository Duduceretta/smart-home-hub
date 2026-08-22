using System.Net;
using System.Net.Sockets;
using AdvancedSharpAdbClient;
using AdvancedSharpAdbClient.Models;
using AdvancedSharpAdbClient.Receivers;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Domain.Common.Exceptions;

namespace SmartHomeHub.Infrastructure.Services;

public class GoogleTvNetworkService : IGoogleTvService
{
    public GoogleTvNetworkService()
    {
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
}
