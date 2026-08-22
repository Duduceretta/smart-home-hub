namespace SmartHomeHub.Application.Common.Interfaces;

public interface ISpotifyTokenCipher
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}
