using System.Text;
using System.Text.Json;
using FluentAssertions;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

// Compara byte a byte a saída do TuyaSessionProtocolClient contra vetores gerados
// pelo tinytuya (fonte de referência), com credenciais FAKE fixas — ver
// TestData/tuya-session-golden-vectors.json e gen_golden_vectors.py (scratchpad,
// não versionado). Nonce determinístico, sem aleatoriedade nos testes.
public class TuyaSessionProtocolClientTests
{
    private const int CmdControl = 7;

    private sealed record VersionVectors(
        string Step1SessKeyNegStart,
        string Step2SessKeyNegRespSimulated,
        string Step3SessKeyNegFinish,
        string SessionKey,
        string ControlPayloadPlaintext,
        string ControlCommandBytes
    );

    private sealed record GoldenVectors(
        string FakeLocalKeyHex,
        string FixedLocalNonceHex,
        string FixedRemoteNonceHex,
        string FixedGcmMessageIvHex,
        VersionVectors V34,
        VersionVectors V35
    );

    private static readonly GoldenVectors Vectors = LoadVectors();

    private static GoldenVectors LoadVectors()
    {
        var path = Path.Combine(
            AppContext.BaseDirectory,
            "Infrastructure",
            "Tuya",
            "TestData",
            "tuya-session-golden-vectors.json"
        );
        var json = File.ReadAllText(path);

        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        VersionVectors ReadVersion(string propertyName)
        {
            var v = root.GetProperty(propertyName);
            return new VersionVectors(
                v.GetProperty("step1_sess_key_neg_start").GetString()!,
                v.GetProperty("step2_sess_key_neg_resp_simulated").GetString()!,
                v.GetProperty("step3_sess_key_neg_finish").GetString()!,
                v.GetProperty("session_key").GetString()!,
                v.GetProperty("control_payload_plaintext").GetString()!,
                v.GetProperty("control_command_bytes").GetString()!
            );
        }

        return new GoldenVectors(
            root.GetProperty("fakeLocalKeyHex").GetString()!,
            root.GetProperty("fixedLocalNonceHex").GetString()!,
            root.GetProperty("fixedRemoteNonceHex").GetString()!,
            root.GetProperty("fixedGcmMessageIvHex").GetString()!,
            ReadVersion("v34"),
            ReadVersion("v35")
        );
    }

    [Theory]
    [InlineData(false)] // v3.4
    [InlineData(true)] // v3.5
    public void HandshakeAndControlCommand_AgainstTinytuyaGoldenVectors_ShouldMatchByteForByte(
        bool useGcm
    )
    {
        var vectors = useGcm ? Vectors.V35 : Vectors.V34;

        var localKey = Convert.FromHexString(Vectors.FakeLocalKeyHex);
        var localNonce = Convert.FromHexString(Vectors.FixedLocalNonceHex);
        var gcmIv = Convert.FromHexString(Vectors.FixedGcmMessageIvHex);

        // Passo 1: SESS_KEY_NEG_START
        var step1 = TuyaSessionProtocolClient.BuildHandshakeStartFrame(
            useGcm,
            localKey,
            localNonce,
            gcmIv
        );
        Convert.ToHexString(step1).ToLowerInvariant().Should().Be(vectors.Step1SessKeyNegStart);

        // Passo 2: decodifica a resposta simulada (prova que o parser + validação de HMAC batem)
        var step2Bytes = Convert.FromHexString(vectors.Step2SessKeyNegRespSimulated);
        var (remoteNonce, _) = TuyaSessionProtocolClient.ProcessHandshakeResponse(
            useGcm,
            localKey,
            localNonce,
            step2Bytes
        );
        Convert
            .ToHexString(remoteNonce)
            .ToLowerInvariant()
            .Should()
            .Be(Vectors.FixedRemoteNonceHex);

        // Passo 3: SESS_KEY_NEG_FINISH
        var step3 = TuyaSessionProtocolClient.BuildHandshakeFinishFrame(
            useGcm,
            localKey,
            remoteNonce,
            gcmIv
        );
        Convert.ToHexString(step3).ToLowerInvariant().Should().Be(vectors.Step3SessKeyNegFinish);

        // Derivação da session key
        var sessionKey = TuyaSessionProtocolClient.DeriveSessionKey(
            useGcm,
            localKey,
            localNonce,
            remoteNonce
        );
        Convert.ToHexString(sessionKey).ToLowerInvariant().Should().Be(vectors.SessionKey);

        // Comando de controle (ligar)
        var controlPlaintext = Encoding.UTF8.GetBytes(vectors.ControlPayloadPlaintext);
        var controlFrame = TuyaSessionProtocolClient.BuildCommandFrame(
            useGcm,
            sessionKey,
            CmdControl,
            controlPlaintext,
            seqno: 3,
            gcmIv
        );
        Convert
            .ToHexString(controlFrame)
            .ToLowerInvariant()
            .Should()
            .Be(vectors.ControlCommandBytes);
    }

    [Fact]
    public void ProcessHandshakeResponse_WrongLocalKey_ShouldThrowCryptographicException()
    {
        var wrongKey = new byte[16]; // chave errada, tudo zero
        var localNonce = Convert.FromHexString(Vectors.FixedLocalNonceHex);
        var step2Bytes = Convert.FromHexString(Vectors.V34.Step2SessKeyNegRespSimulated);

        var act = () =>
            TuyaSessionProtocolClient.ProcessHandshakeResponse(
                false,
                wrongKey,
                localNonce,
                step2Bytes
            );

        act.Should().Throw<System.Security.Cryptography.CryptographicException>();
    }
}
