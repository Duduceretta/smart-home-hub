using FluentAssertions;
using SmartHomeHub.Application.Features.History.Queries.GetEventHistory;

namespace SmartHomeHub.UnitTests.Application.Features.History;

public class GetEventHistoryQueryValidatorTests
{
    private readonly GetEventHistoryQueryValidator _validator = new();

    private static GetEventHistoryQuery ValidQuery(
        DateTimeOffset? start = null,
        DateTimeOffset? end = null,
        int page = 1,
        int pageSize = 10
    )
    {
        var now = DateTimeOffset.UtcNow;

        return new GetEventHistoryQuery(
            "firebase-token-123",
            start ?? now.AddDays(-1),
            end ?? now,
            Page: page,
            PageSize: pageSize
        );
    }

    [Fact]
    public void Validate_WithValidQuery_ShouldNotHaveErrors()
    {
        var result = _validator.Validate(ValidQuery());

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WhenEndDateIsBeforeStartDate_ShouldHaveError()
    {
        var now = DateTimeOffset.UtcNow;

        var result = _validator.Validate(ValidQuery(start: now, end: now.AddDays(-1)));

        result.IsValid.Should().BeFalse();
        result
            .Errors.Should()
            .Contain(e => e.PropertyName == nameof(GetEventHistoryQuery.EndDateUtc));
    }

    [Fact]
    public void Validate_WhenEndDateEqualsStartDate_ShouldNotHaveError()
    {
        var now = DateTimeOffset.UtcNow;

        var result = _validator.Validate(ValidQuery(start: now, end: now));

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WithInvalidPage_ShouldHaveError(int page)
    {
        var result = _validator.Validate(ValidQuery(page: page));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(GetEventHistoryQuery.Page));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void Validate_WithPageSizeOutOfRange_ShouldHaveError(int pageSize)
    {
        var result = _validator.Validate(ValidQuery(pageSize: pageSize));

        result.IsValid.Should().BeFalse();
        result
            .Errors.Should()
            .Contain(e => e.PropertyName == nameof(GetEventHistoryQuery.PageSize));
    }

    [Fact]
    public void Validate_WithEmptyFirebaseUid_ShouldHaveError()
    {
        var now = DateTimeOffset.UtcNow;
        var query = new GetEventHistoryQuery(string.Empty, now.AddDays(-1), now);

        var result = _validator.Validate(query);

        result.IsValid.Should().BeFalse();
        result
            .Errors.Should()
            .Contain(e => e.PropertyName == nameof(GetEventHistoryQuery.FirebaseUid));
    }
}
