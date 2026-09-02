import { describe, expect, it } from "vitest";
import { AppError, handleApplicationError } from "../app.errors";

/** Minimal shape axios.isAxiosError() checks for — avoids depending on a real HTTP call. */
function fakeAxiosError(response?: { status: number; data?: unknown }) {
	return {
		isAxiosError: true,
		message: "Request failed",
		response,
	};
}

describe("handleApplicationError Unit Tests", () => {
	it("handleApplicationError_ApiReturnsProblemDetailsWithDetail_ShouldUseDetailAsMessage", () => {
		// Arrange
		const error = fakeAxiosError({
			status: 422,
			data: { title: "Validation Error", detail: "O nome é obrigatório." },
		});

		// Act
		const result = handleApplicationError(error, "Falha ao salvar o recurso.");

		// Assert
		expect(result).toBeInstanceOf(AppError);
		expect(result.message).toBe("O nome é obrigatório.");
		expect(result.status).toBe(422);
		expect(result.details?.title).toBe("Validation Error");
	});

	it("handleApplicationError_ApiReturnsProblemDetailsWithTitleOnlyNoDetail_ShouldUseTitleAsMessage", () => {
		// Arrange
		const error = fakeAxiosError({
			status: 500,
			data: { title: "Internal Server Error" },
		});

		// Act
		const result = handleApplicationError(error, "Falha ao salvar o recurso.");

		// Assert
		expect(result.message).toBe("Internal Server Error");
		expect(result.status).toBe(500);
	});

	it("handleApplicationError_AxiosResponseWithoutProblemDetailsBody_ShouldUseCallerFallbackMessage", () => {
		// Arrange — a response came back (e.g. 502 from a proxy, non-JSON body),
		// but there's no ProblemDetails.title to surface.
		const error = fakeAxiosError({
			status: 502,
			data: "<html>Bad Gateway</html>",
		});

		// Act
		const result = handleApplicationError(
			error,
			"Não foi possível carregar a lista de dispositivos disponíveis.",
		);

		// Assert
		expect(result.message).toBe(
			"Não foi possível carregar a lista de dispositivos disponíveis.",
		);
		expect(result.status).toBe(502);
	});

	it("handleApplicationError_NetworkErrorWithNoResponse_ShouldUseCallerFallbackMessage", () => {
		// Arrange — timeout / DNS failure / CORS: axios error with no `response` at all.
		const error = fakeAxiosError(undefined);

		// Act
		const result = handleApplicationError(
			error,
			"Não foi possível conectar ao servidor.",
		);

		// Assert
		expect(result.message).toBe("Não foi possível conectar ao servidor.");
		expect(result.status).toBe(500);
	});

	it("handleApplicationError_CompletelyUnexpectedNonAxiosError_ShouldUseCallerFallbackMessage", () => {
		// Arrange
		const error = new Error("boom");

		// Act
		const result = handleApplicationError(
			error,
			"Não foi possível completar a operação.",
		);

		// Assert
		expect(result.message).toBe("Não foi possível completar a operação.");
		expect(result.status).toBe(500);
	});

	it("handleApplicationError_NoProblemDetailsAndEmptyFallbackMessage_ShouldFallBackToGenericMessage", () => {
		// Arrange — last resort: neither the API nor the caller gave us anything.
		const error = fakeAxiosError(undefined);

		// Act
		const result = handleApplicationError(error, "");

		// Assert
		expect(result.message).toBe(
			"Ocorreu um erro crítico e inesperado. Tente novamente.",
		);
	});

	it("handleApplicationError_ErrorIsAlreadyAppError_ShouldReturnItUnchanged", () => {
		// Arrange
		const original = new AppError("Erro original", 409);

		// Act
		const result = handleApplicationError(
			original,
			"Mensagem de fallback ignorada.",
		);

		// Assert
		expect(result).toBe(original);
		expect(result.message).toBe("Erro original");
		expect(result.status).toBe(409);
	});
});
