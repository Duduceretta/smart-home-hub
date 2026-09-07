using System.Text;
using FluentAssertions;
using SmartHomeHub.Infrastructure.Tuya;

namespace SmartHomeHub.UnitTests.Infrastructure.Tuya;

// Reproduz o bug real reportado em produção: sob rajada de comandos
// (brilho/modo mudando rápido em sequência), o dispositivo Tuya responde a
// CONTROL_NEW só com o retcode de sucesso, sem ecoar nenhum DPS — um ACK
// legítimo do protocolo, não uma resposta corrompida. Antes do fix,
// ParseCommandResponse tentava `JsonDocument.Parse("")` e lançava
// JsonReaderException ("input does not contain any JSON tokens").
public class TuyaFrameCodecTests
{
    private static readonly byte[] FakeLocalKey = Encoding.UTF8.GetBytes("0123456789abcdef");
    private static readonly byte[] FakeLocalNonce = Encoding.UTF8.GetBytes("localnonce123456");
    private static readonly byte[] FakeRemoteNonce = Encoding.UTF8.GetBytes("remotenonce12345");
    private static readonly byte[] FixedGcmIv = new byte[12];

    private const int CmdControlNew = 0x0D;

    [Theory]
    [InlineData(false)] // v3.4
    [InlineData(true)] // v3.5
    public void ParseCommandResponse_EmptyPayloadAck_ShouldReturnEmptyDictionaryInsteadOfThrowing(
        bool useGcm
    )
    {
        var sessionKey = TuyaFrameCodec.DeriveSessionKey(
            useGcm,
            FakeLocalKey,
            FakeLocalNonce,
            FakeRemoteNonce
        );

        // Simula a resposta real observada: retcode de sucesso, payload JSON vazio.
        var ackFrame = TuyaFrameCodec.BuildCommandResponseFrame(
            useGcm,
            sessionKey,
            CmdControlNew,
            jsonPayload: "",
            seqno: 3,
            gcmMessageIv: useGcm ? FixedGcmIv : null,
            retcode: 0
        );

        var act = () => TuyaFrameCodec.ParseCommandResponse(useGcm, sessionKey, ackFrame);

        var result = act.Should().NotThrow().Subject;
        result.Should().BeEmpty();
    }

    [Theory]
    [InlineData(false)] // v3.4
    [InlineData(true)] // v3.5
    public void ParseCommandResponse_PayloadWithDps_ShouldStillParseNormally(bool useGcm)
    {
        var sessionKey = TuyaFrameCodec.DeriveSessionKey(
            useGcm,
            FakeLocalKey,
            FakeLocalNonce,
            FakeRemoteNonce
        );

        var respFrame = TuyaFrameCodec.BuildCommandResponseFrame(
            useGcm,
            sessionKey,
            CmdControlNew,
            jsonPayload: "{\"dps\":{\"20\":true}}",
            seqno: 3,
            gcmMessageIv: useGcm ? FixedGcmIv : null,
            retcode: 0
        );

        var result = TuyaFrameCodec.ParseCommandResponse(useGcm, sessionKey, respFrame);

        result.Should().ContainKey(20).WhoseValue.Should().Be(true);
    }
}
