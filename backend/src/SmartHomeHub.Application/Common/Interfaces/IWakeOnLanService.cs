namespace SmartHomeHub.Application.Common.Interfaces;

public interface IWakeOnLanService
{
    Task SendMagicPacketAsync(string macAddress, CancellationToken cancellationToken = default);
}
