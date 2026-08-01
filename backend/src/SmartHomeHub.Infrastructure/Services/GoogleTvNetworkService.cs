using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using AdvancedSharpAdbClient;
using AdvancedSharpAdbClient.Receivers;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services;

public partial class GoogleTvNetworkService : IGoogleTvService
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

    public async Task WakeUpAsync(string macAddress, CancellationToken cancellationToken = default)
    {
        var cleanMac = MyRegex().Replace(macAddress, "");
        if (cleanMac.Length != 12)
            throw new ArgumentException("Formato de MAC Address inválido.", nameof(macAddress));

        var macBytes = new byte[6];
        for (int i = 0; i < 6; i++)
        {
            macBytes[i] = Convert.ToByte(cleanMac.Substring(i * 2, 2), 16);
        }

        var packet = new byte[102];
        for (int i = 0; i < 6; i++)
            packet[i] = 0xFF;
        for (int i = 1; i <= 16; i++)
            Buffer.BlockCopy(macBytes, 0, packet, i * 6, 6);

        using var udpClient = new UdpClient();
        udpClient.EnableBroadcast = true;
        var broadcastEndpoint = new IPEndPoint(IPAddress.Broadcast, 9);

        await udpClient.SendAsync(packet, packet.Length, broadcastEndpoint);
    }

    public async Task SendKeycodeAsync(
        string ipAddress,
        int keycode,
        CancellationToken cancellationToken = default
    )
    {
        var client = new AdbClient();
        var endpoint = new DnsEndPoint(ipAddress, 5555);

        client.Connect(endpoint);

        var targetDevice =
            client.GetDevices().FirstOrDefault(d => d.Serial.Contains(ipAddress))
            ?? throw new InvalidOperationException(
                $"Não foi possível estabelecer conexão ADB com a TV no IP: {ipAddress}"
            );

        var receiver = new ConsoleOutputReceiver();
        await client.ExecuteRemoteCommandAsync(
            $"input keyevent {keycode}",
            targetDevice,
            receiver,
            cancellationToken
        );
    }

    [GeneratedRegex("[-|:]")]
    private static partial Regex MyRegex();
}
