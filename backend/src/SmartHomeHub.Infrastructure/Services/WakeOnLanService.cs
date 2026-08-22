using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services;

public sealed partial class WakeOnLanService(ILogger<WakeOnLanService> logger) : IWakeOnLanService
{
    public async Task SendMagicPacketAsync(
        string macAddress,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var packet = BuildMagicPacket(macAddress);

            using var udpClient = new UdpClient();
            udpClient.EnableBroadcast = true;
            var broadcastEndpoint = new IPEndPoint(IPAddress.Broadcast, 9);

            await udpClient.SendAsync(packet, packet.Length, broadcastEndpoint);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Falha ao enviar Magic Packet WoL para {MacAddress}",
                macAddress
            );
        }
    }

    public static byte[] BuildMagicPacket(string macAddress)
    {
        var cleanMac = MacSeparatorRegex().Replace(macAddress, "");
        if (cleanMac.Length != 12)
            throw new ArgumentException("Formato de MAC Address inválido.", nameof(macAddress));

        var macBytes = new byte[6];
        for (var i = 0; i < 6; i++)
        {
            macBytes[i] = Convert.ToByte(cleanMac.Substring(i * 2, 2), 16);
        }

        var packet = new byte[102];
        for (var i = 0; i < 6; i++)
            packet[i] = 0xFF;
        for (var i = 1; i <= 16; i++)
            Buffer.BlockCopy(macBytes, 0, packet, i * 6, 6);

        return packet;
    }

    [GeneratedRegex("[-|:]")]
    private static partial Regex MacSeparatorRegex();
}
