using Sharpcaster;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services;

public class ChromecastWakeService : IChromecastWakeService
{
    public async Task WakeUpAsync(string ipAddress, CancellationToken cancellationToken = default)
    {
        try
        {
            var client = new ChromecastClient();
            var receiver = new Sharpcaster.Models.ChromecastReceiver
            {
                DeviceUri = new Uri($"https://{ipAddress}:8009"),
                Port = 8009,
            };

            await client.ConnectChromecast(receiver);

            _ = await client.LaunchApplicationAsync("233637DE");

            Console.WriteLine($"[TV] Sinal de Wake (YouTube) enviado para {ipAddress}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TV] Falha ao tentar acordar a TV via Chromecast: {ex.Message}");
        }
    }
}
