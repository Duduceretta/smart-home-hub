using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Api.Extensions;

public static class ResultExtensions
{
    public static IResult ToProblemDetails(this Result result)
    {
        if (result.IsSuccess)
            throw new InvalidOperationException(
                "Não é possível converter um sucesso em erro HTTP."
            );

        return result.Error.Code switch
        {
            var code when code.Contains("NotFound", StringComparison.OrdinalIgnoreCase) =>
                Results.Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: result.Error.Code,
                    detail: result.Error.Description
                ),

            var code when code.Contains("Conflict", StringComparison.OrdinalIgnoreCase) =>
                Results.Problem(
                    statusCode: StatusCodes.Status409Conflict,
                    title: result.Error.Code,
                    detail: result.Error.Description
                ),

            var code
                when code.Contains("Forbidden", StringComparison.OrdinalIgnoreCase)
                    || code.Contains("Unauthorized", StringComparison.OrdinalIgnoreCase) =>
                Results.Problem(
                    statusCode: StatusCodes.Status403Forbidden,
                    title: result.Error.Code,
                    detail: result.Error.Description
                ),

            var code when code.Contains("Validation", StringComparison.OrdinalIgnoreCase) =>
                Results.Problem(
                    statusCode: StatusCodes.Status422UnprocessableEntity,
                    title: result.Error.Code,
                    detail: result.Error.Description
                ),

            _ => Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: result.Error.Code,
                detail: result.Error.Description
            ),
        };
    }
}
