namespace SmartHomeHub.Domain.Common.Primitives;

public record Error(string Code, string Description)
{
    public static readonly Error None = new(string.Empty, string.Empty);
    public static readonly Error NullValue = new("Error.NullValue", "Um valor nulo foi fornecido.");
}
