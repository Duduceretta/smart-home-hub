using FluentValidation;
using Mediator;
using SmartHomeHub.Domain.Common.Primitives;

namespace SmartHomeHub.Application.Common.Behaviors;

public class ValidationBehavior<TMessage, TResponse>(IEnumerable<IValidator<TMessage>> validators)
    : IPipelineBehavior<TMessage, TResponse>
    where TMessage : IMessage
{
    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken cancellationToken
    )
    {
        if (!validators.Any())
            return await next(message, cancellationToken);

        var context = new ValidationContext<TMessage>(message);
        var validationResults = await Task.WhenAll(
            validators.Select(validation => validation.ValidateAsync(context, cancellationToken))
        );

        var failures = validationResults
            .SelectMany(result => result.Errors)
            .Where(error => error != null)
            .ToList();

        if (failures.Count != 0)
        {
            var firstFailure = failures[0];
            var error = new Error(firstFailure.PropertyName, firstFailure.ErrorMessage);

            if (typeof(TResponse) == typeof(Result))
            {
                return (TResponse)(object)Result.Failure(error);
            }

            if (
                typeof(TResponse).IsGenericType
                && typeof(TResponse).GetGenericTypeDefinition() == typeof(Result<>)
            )
            {
                var valueType = typeof(TResponse).GetGenericArguments()[0];
                var failureResult = typeof(Result)
                    .GetMethods()
                    .First(method => method.Name == "Failure" && method.IsGenericMethod)
                    .MakeGenericMethod(valueType)
                    .Invoke(null, [error]);

                return (TResponse)failureResult!;
            }

            throw new ValidationException(failures);
        }

        return await next(message, cancellationToken);
    }
}
