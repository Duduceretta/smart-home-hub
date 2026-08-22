using Microsoft.AspNetCore.DataProtection;
using SmartHomeHub.Application.Common.Interfaces;

namespace SmartHomeHub.Infrastructure.Services;

public class SpotifyTokenCipher : ISpotifyTokenCipher
{
    private readonly IDataProtector _protector;

    public SpotifyTokenCipher(IDataProtectionProvider dataProtectionProvider)
    {
        _protector = dataProtectionProvider.CreateProtector("SpotifyIntegration.Tokens");
    }

    public string Encrypt(string plainText) => _protector.Protect(plainText);

    public string Decrypt(string cipherText) => _protector.Unprotect(cipherText);
}
