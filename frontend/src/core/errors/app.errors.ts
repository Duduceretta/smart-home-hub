import { isAxiosError } from "axios";
import { Logger } from "../logger/app.logger";

export interface ProblemDetails {
	type?: string;
	title: string;
	status: number;
	detail?: string;
	instance?: string;
	traceId?: string;
}

export class AppError extends Error {
	public readonly status: number;
	public readonly details?: ProblemDetails;
	public readonly originalError?: unknown;

	constructor(
		message: string,
		status: number = 500,
		details?: ProblemDetails,
		originalError?: unknown,
	) {
		super(message);
		this.name = "AppError";
		this.status = status;
		this.details = details;
		this.originalError = originalError;
	}
}

const GENERIC_FALLBACK_MESSAGE =
	"Ocorreu um erro crítico e inesperado. Tente novamente.";

export function handleApplicationError(
	error: unknown,
	fallbackMessage: string,
): AppError {
	Logger.error(fallbackMessage, error);

	if (error instanceof AppError) {
		return error;
	}

	if (isAxiosError(error) && error.response) {
		const status = error.response.status;
		const data = error.response.data as Partial<ProblemDetails>;

		if (data?.title) {
			return new AppError(
				data.detail || data.title,
				status,
				data as ProblemDetails,
				error,
			);
		}

		// Response came back but without a ProblemDetails body (non-JSON, empty,
		// malformed) — the caller's contextual fallbackMessage is a better user-
		// facing message than a bare status code.
		return new AppError(
			fallbackMessage || GENERIC_FALLBACK_MESSAGE,
			status,
			undefined,
			error,
		);
	}

	// No response at all (network error, timeout, CORS) — same fallback logic,
	// GENERIC_FALLBACK_MESSAGE is only reached if a caller passes an empty
	// fallbackMessage.
	return new AppError(
		fallbackMessage || GENERIC_FALLBACK_MESSAGE,
		500,
		undefined,
		error,
	);
}
