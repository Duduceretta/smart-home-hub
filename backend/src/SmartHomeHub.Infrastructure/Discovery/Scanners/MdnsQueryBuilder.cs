using System.Text;

namespace SmartHomeHub.Infrastructure.Discovery.Scanners;

internal static class MdnsQueryBuilder
{
    public static byte[] BuildPtrQuery(string serviceName)
    {
        using var stream = new MemoryStream();

        // Header: ID=0, flags=0 (query padrão), QDCOUNT=1, ANCOUNT/NSCOUNT/ARCOUNT=0
        stream.Write([0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

        foreach (var label in serviceName.Split('.', StringSplitOptions.RemoveEmptyEntries))
        {
            var labelBytes = Encoding.UTF8.GetBytes(label);
            stream.WriteByte((byte)labelBytes.Length);
            stream.Write(labelBytes);
        }

        stream.WriteByte(0x00); // fim do nome

        stream.Write([0x00, 0x0C]); // QTYPE = PTR
        stream.Write([0x00, 0x01]); // QCLASS = IN

        return stream.ToArray();
    }
}
