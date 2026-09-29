using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SmartHomeHub.Domain.Entities;
using SmartHomeHub.IntegrationTests.Setup;

namespace SmartHomeHub.IntegrationTests.Features.Users.Commands.UpdateUserLocation;

public class UpdateUserLocationTests(IntegrationTestWebAppFactory factory)
    : BaseIntegrationTest(factory)
{
    private record UpdateUserLocationRequest(double Latitude, double Longitude);

    private async Task<User> SeedUserAsync()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Eduardo Ceretta",
            Email = "eduardo@smarthome.com",
            ExternalAuthUid = "firebase-token-123",
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    [Fact]
    public async Task UpdateUserLocation_WithValidCoordinates_ShouldPersistAndReturnOk()
    {
        await SeedUserAsync();

        var response = await Client.PutAsJsonAsync(
            "/api/users/me/location",
            new UpdateUserLocationRequest(-23.55, -46.63),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updated = await DbContext
            .Users.AsNoTracking()
            .FirstAsync(
                u => u.ExternalAuthUid == "firebase-token-123",
                TestContext.Current.CancellationToken
            );
        updated.Latitude.Should().Be(-23.55);
        updated.Longitude.Should().Be(-46.63);
    }

    [Theory]
    [InlineData(90.1, 0)]
    [InlineData(-90.1, 0)]
    public async Task UpdateUserLocation_WithOutOfRangeLatitude_ShouldReturnBadRequestAndNotPersist(
        double latitude,
        double longitude
    )
    {
        await SeedUserAsync();

        var response = await Client.PutAsJsonAsync(
            "/api/users/me/location",
            new UpdateUserLocationRequest(latitude, longitude),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var user = await DbContext
            .Users.AsNoTracking()
            .FirstAsync(
                u => u.ExternalAuthUid == "firebase-token-123",
                TestContext.Current.CancellationToken
            );
        user.Latitude.Should().BeNull();
    }

    [Theory]
    [InlineData(0, 180.1)]
    [InlineData(0, -180.1)]
    public async Task UpdateUserLocation_WithOutOfRangeLongitude_ShouldReturnBadRequestAndNotPersist(
        double latitude,
        double longitude
    )
    {
        await SeedUserAsync();

        var response = await Client.PutAsJsonAsync(
            "/api/users/me/location",
            new UpdateUserLocationRequest(latitude, longitude),
            TestContext.Current.CancellationToken
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var user = await DbContext
            .Users.AsNoTracking()
            .FirstAsync(
                u => u.ExternalAuthUid == "firebase-token-123",
                TestContext.Current.CancellationToken
            );
        user.Longitude.Should().BeNull();
    }
}
