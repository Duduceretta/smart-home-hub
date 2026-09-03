using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using AdvancedSharpAdbClient;
using AdvancedSharpAdbClient.Models;
using AdvancedSharpAdbClient.Receivers;
using Microsoft.Extensions.Logging;
using SmartHomeHub.Application.Common.Interfaces;
using SmartHomeHub.Application.Features.Devices.Common;
using SmartHomeHub.Domain.Common.Exceptions;

namespace SmartHomeHub.Infrastructure.Services;

public class GoogleTvNetworkService : IGoogleTvService
{
    private readonly ILogger<GoogleTvNetworkService> _logger;

    // O serviço é Transient (nova instância a cada resolução de DI), então o
    // estado de "já avisei que essa TV está inalcançável" precisa sobreviver
    // entre instâncias — daí static em vez de campo de instância. Evita
    // repetir o mesmo WRN a cada ciclo de sondagem (12s) enquanto o IP
    // estiver errado/a TV estiver offline; loga de novo só na mudança de
    // estado (ficou inalcançável / voltou a responder).
    private static readonly ConcurrentDictionary<string, bool> UnreachableWarned = new();

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
        var (client, targetDevice) = Connect(ipAddress);
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
            var (client, targetDevice) = Connect(ipAddress);

            var receiver = new ConsoleOutputReceiver();
            await client.ExecuteRemoteCommandAsync(
                "dumpsys power",
                targetDevice,
                receiver,
                cancellationToken
            );

            var isAwake = ParsePowerState(receiver.ToString());

            if (UnreachableWarned.TryRemove(ipAddress, out _))
            {
                _logger.LogInformation("TV em {IpAddress} voltou a responder via ADB.", ipAddress);
            }

            return isAwake;
        }
        catch (Exception ex)
        {
            if (UnreachableWarned.TryAdd(ipAddress, true))
            {
                _logger.LogWarning(
                    ex,
                    "Falha ao consultar o estado de energia da TV em {IpAddress}",
                    ipAddress
                );
            }

            return false;
        }
    }

    public async Task<int> GetVolumePercentAsync(
        string ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var (client, targetDevice) = Connect(ipAddress);

            var receiver = new ConsoleOutputReceiver();
            await client.ExecuteRemoteCommandAsync(
                "dumpsys audio",
                targetDevice,
                receiver,
                cancellationToken
            );

            var (current, max) = ParseStreamVolume(receiver.ToString());
            return max <= 0 ? 0 : (int)Math.Round(current / (double)max * 100);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao consultar o volume da TV em {IpAddress}", ipAddress);
            return 0;
        }
    }

    public async Task SetVolumePercentAsync(
        string ipAddress,
        int volumePercent,
        CancellationToken cancellationToken = default
    )
    {
        var (client, targetDevice) = Connect(ipAddress);

        int max;
        try
        {
            var readReceiver = new ConsoleOutputReceiver();
            await client.ExecuteRemoteCommandAsync(
                "dumpsys audio",
                targetDevice,
                readReceiver,
                cancellationToken
            );
            (_, max) = ParseStreamVolume(readReceiver.ToString());
        }
        catch (DeviceCommunicationException)
        {
            throw;
        }
        catch (Exception)
        {
            throw new DeviceUnreachableException(ipAddress);
        }

        if (max <= 0)
            throw new DeviceUnreachableException(ipAddress);

        var level = (int)Math.Clamp(Math.Round(volumePercent / 100.0 * max), 0, max);

        try
        {
            var setReceiver = new ConsoleOutputReceiver();
            await client.ExecuteRemoteCommandAsync(
                $"cmd media_session volume --stream 3 --set {level}",
                targetDevice,
                setReceiver,
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

    public async Task<MediaSessionInfo?> GetMediaSessionInfoAsync(
        string ipAddress,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var (client, targetDevice) = Connect(ipAddress);

            var receiver = new ConsoleOutputReceiver();
            await client.ExecuteRemoteCommandAsync(
                "dumpsys media_session",
                targetDevice,
                receiver,
                cancellationToken
            );

            return ParseMediaSession(receiver.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Falha ao consultar a sessão de mídia da TV em {IpAddress}",
                ipAddress
            );
            return null;
        }
    }

    private static (AdbClient Client, DeviceData Device) Connect(string ipAddress)
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

        return (client, targetDevice);
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

    public static (int Current, int Max) ParseStreamVolume(string? dumpsysAudioOutput)
    {
        if (string.IsNullOrWhiteSpace(dumpsysAudioOutput))
            return (0, 0);

        var streamIndex = dumpsysAudioOutput.IndexOf("STREAM_MUSIC", StringComparison.Ordinal);
        if (streamIndex < 0)
            return (0, 0);

        var block = dumpsysAudioOutput[streamIndex..];
        var nextStreamIndex = block.IndexOf("- STREAM_", 1, StringComparison.Ordinal);
        if (nextStreamIndex > 0)
            block = block[..nextStreamIndex];

        var maxMatch = Regex.Match(block, @"Max:\s*(\d+)");
        var currentMatch = Regex.Match(block, @"Current:\s*\d+\s*\([^)]*\):\s*(\d+)");

        var max = maxMatch.Success ? int.Parse(maxMatch.Groups[1].Value) : 0;
        var current = currentMatch.Success ? int.Parse(currentMatch.Groups[1].Value) : 0;

        return (current, max);
    }

    public static MediaSessionInfo? ParseMediaSession(string? dumpsysMediaSessionOutput)
    {
        if (string.IsNullOrWhiteSpace(dumpsysMediaSessionOutput))
            return null;

        var descriptionMatch = Regex.Match(
            dumpsysMediaSessionOutput,
            @"description=([^,\n]*),\s*([^,\n]*),"
        );

        if (!descriptionMatch.Success)
            return null;

        var title = descriptionMatch.Groups[1].Value.Trim();
        var artist = descriptionMatch.Groups[2].Value.Trim();

        if (
            string.IsNullOrWhiteSpace(title)
            || title.Equals("null", StringComparison.OrdinalIgnoreCase)
        )
            return null;

        var stateMatch = Regex.Match(
            dumpsysMediaSessionOutput,
            @"state=PlaybackState\s*\{state=(\d+)"
        );
        var isPlaying = stateMatch.Success && stateMatch.Groups[1].Value == "3";

        return new MediaSessionInfo(
            title,
            string.IsNullOrWhiteSpace(artist)
            || artist.Equals("null", StringComparison.OrdinalIgnoreCase)
                ? null
                : artist,
            isPlaying
        );
    }
}
