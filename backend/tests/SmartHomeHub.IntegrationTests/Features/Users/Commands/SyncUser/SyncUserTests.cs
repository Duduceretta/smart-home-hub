using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Users.Commands.SyncUser;

public class SyncUserTests(IntegrationTestWebAppFactory factory) : BaseIntegrationTest(factory)
{
    private record SyncUserResponse(string Message, Guid UserId);

    [Fact]
    public async Task Sync_WhenUserDoesNotExist_ShouldCreateAndReturnCreated()
    {
        var response = await Client.PostAsync(
            "/api/users/sync",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<SyncUserResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.UserId.Should().NotBeEmpty();

        var storedUser = await DbContext.Users.FirstOrDefaultAsync(
            user => user.Id == result.UserId,
            TestContext.Current.CancellationToken
        );

        storedUser.Should().NotBeNull();
        storedUser!.ExternalAuthUid.Should().Be("firebase-token-123");
        storedUser.Email.Should().Be("eduardo@smarthome.com");
    }

    [Fact]
    public async Task Sync_WhenUserAlreadyExists_ShouldReturnOkWithExistingId()
    {
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            ExternalAuthUid = "firebase-token-123",
            Email = "eduardo@smarthome.com",
        };

        DbContext.Users.Add(existingUser);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);

        var response = await Client.PostAsync(
            "/api/users/sync",
            null,
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<SyncUserResponse>(
            cancellationToken: TestContext.Current.CancellationToken
        );

        result.Should().NotBeNull();
        result!.UserId.Should().Be(existingUser.Id);

        var userCount = await DbContext.Users.CountAsync(
            user => user.ExternalAuthUid == "firebase-token-123",
            TestContext.Current.CancellationToken
        );
        userCount.Should().Be(1, "sincronizar um usuário existente não deve duplicar o registro");
    }
}
