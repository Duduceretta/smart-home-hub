using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace SmartHomeHub.Infrastructure.Persistence.Converters;

public class UtcDateTimeOffsetConverter()
    : ValueConverter<DateTimeOffset, DateTimeOffset>(
        convertToProviderExpression: value => value.ToUniversalTime(),
        convertFromProviderExpression: value => value
    );
