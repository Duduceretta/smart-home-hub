using System.Collections.Concurrent;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services;

public sealed class SpotifyOAuthStateStore : ISpotifyOAuthStateStore
{
    private static readonly TimeSpan StateTtl = TimeSpan.FromMinutes(10);

    private readonly ConcurrentDictionary<
        string,
        (string FirebaseUid, DateTimeOffset ExpiresAt)
    > _pendingStates = new();

    public string CreateState(string firebaseUid)
    {
        var state = Guid.NewGuid().ToString("N");
        _pendingStates[state] = (firebaseUid, DateTimeOffset.UtcNow.Add(StateTtl));
        return state;
    }

    public string? ConsumeState(string state)
    {
        if (!_pendingStates.TryRemove(state, out var entry))
        {
            return null;
        }

        return entry.ExpiresAt >= DateTimeOffset.UtcNow ? entry.FirebaseUid : null;
    }
}
