using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace SmartHomeHub.Infrastructure.Discovery;

// Máquinas multi-homed (mais de uma NIC IPv4 ativa — comum em dev boxes com
// Wi-Fi + Ethernet + VPN) fazem sockets multicast "wildcard" (0.0.0.0) enviar
// e/ou receber de forma ambígua entre interfaces — confirmado por captura real
// (tshark) em 2026-08-30: SsdpDiscoveryScanner com socket wildcard não recebia
// NENHUMA resposta de dispositivos reais na LAN, mesmo com eles respondendo
// normalmente a um socket vinculado a uma interface específica. A correção é
// enumerar as interfaces qualificadas e abrir um socket por interface.
public static class LocalNetworkInterfaces
{
    // VPNs de túnel (Radmin, etc.) não têm motivo pra carregar tráfego de
    // discovery de dispositivos IoT locais — incluir só adiciona overhead sem
    // benefício. Exclusão deliberada, não esquecida: não reintroduzir numa
    // limpeza futura achando que "faltou" cobrir essa interface.
    private static readonly string[] ExcludedNameFragments = ["radmin", "vpn"];

    public static IReadOnlyList<IPAddress> GetQualifiedIPv4Addresses()
    {
        return NetworkInterface
            .GetAllNetworkInterfaces()
            .Where(IsQualified)
            .SelectMany(ni =>
                ni.GetIPProperties()
                    .UnicastAddresses.Where(a => a.Address.AddressFamily == AddressFamily.InterNetwork)
                    .Select(a => a.Address)
            )
            .Distinct()
            .ToList();
    }

    private static bool IsQualified(NetworkInterface ni)
    {
        if (ni.OperationalStatus != OperationalStatus.Up)
        {
            return false;
        }

        if (ni.NetworkInterfaceType is NetworkInterfaceType.Loopback or NetworkInterfaceType.Tunnel)
        {
            return false;
        }

        var name = ni.Name.ToLowerInvariant() + ni.Description.ToLowerInvariant();
        if (ExcludedNameFragments.Any(fragment => name.Contains(fragment)))
        {
            return false;
        }

        return ni.GetIPProperties()
            .UnicastAddresses.Any(a => a.Address.AddressFamily == AddressFamily.InterNetwork);
    }
}
