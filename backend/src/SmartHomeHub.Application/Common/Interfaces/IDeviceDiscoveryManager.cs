namespace SmartHomeHub.Application.Common.Interfaces;

public interface IDeviceDiscoveryManager
{
    Task StartDiscoveryAsync(
        string firebaseUid,
        int timeoutSeconds,
        CancellationToken hubConnectionToken
    );

    Task StopDiscoveryAsync(string firebaseUid);

    bool IsDiscoveryRunning(string firebaseUid);
}
