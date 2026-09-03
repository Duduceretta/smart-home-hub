using System.Xml.Linq;
using Microsoft.Extensions.Logging;

namespace SmartHomeHub.Infrastructure.Discovery.Parsing;

// Busca o <friendlyName> do XML de descrição UPnP (a URL do header LOCATION) —
// é o nome mais confiável disponível (o que o próprio fabricante define como
// nome amigável do aparelho), mas exige um round-trip HTTP à parte da resposta
// SSDP em si. Best-effort: timeout curto, qualquer falha (rede, XML malformado,
// elemento ausente) apenas devolve null e quem chama cai pro próximo nível da
// prioridade de nome (DLNADeviceName > Server > genérico).
public sealed class SsdpDeviceDescriptionFetcher(ILogger logger)
{
    private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromSeconds(2) };
    private static readonly XNamespace DeviceNs = "urn:schemas-upnp-org:device-1-0";

    public async Task<string?> TryFetchFriendlyNameAsync(
        string? location,
        CancellationToken cancellationToken
    )
    {
        if (
            string.IsNullOrWhiteSpace(location)
            || !Uri.TryCreate(location, UriKind.Absolute, out var uri)
        )
        {
            return null;
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken
            );
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(2));

            var xml = await HttpClient.GetStringAsync(uri, timeoutCts.Token);
            var document = XDocument.Parse(xml);

            var friendlyName = document
                .Descendants(DeviceNs + "friendlyName")
                .Select(e => e.Value.Trim())
                .FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

            return friendlyName;
        }
        catch (Exception ex)
            when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested
            )
        {
            logger.LogDebug(
                ex,
                "Não foi possível obter friendlyName de {Location} (usando fallback de nome).",
                location
            );
            return null;
        }
    }
}
