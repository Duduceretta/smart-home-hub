namespace SmartHomeHub.Domain.Common.Exceptions;

public abstract class DeviceCommunicationException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class AdbUnauthorizedException(string ipAddress)
    : DeviceCommunicationException(
        "Device.AdbUnauthorized",
        "A TV recusou a conexão. Verifique se a 'Depuração USB/Rede' está ativa nas Opções do Desenvolvedor e autorize na tela da TV."
    )
{
    public string IpAddress { get; } = ipAddress;
}

public sealed class DeviceUnreachableException(string ipAddress)
    : DeviceCommunicationException(
        "Device.HostUnreachable",
        "A TV não respondeu. Certifique-se de que a 'Inicialização Rápida' e o 'Wake-on-LAN' estão ativados nas configurações de Energia da TV."
    )
{
    public string IpAddress { get; } = ipAddress;
}

public sealed class SpotifyNotConnectedException()
    : DeviceCommunicationException(
        "Spotify.NotConnected",
        "Conta do Spotify não está conectada."
    );

public sealed class SpotifyPlaybackUnavailableException()
    : DeviceCommunicationException(
        "Spotify.PlaybackUnavailable",
        "Nenhum dispositivo Spotify ativo no momento. Abra o Spotify em algum aparelho e tente novamente."
    );
