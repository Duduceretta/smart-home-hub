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

		return new AppError(
			`Erro de comunicação (Status: ${status})`,
			status,
			undefined,
			error,
		);
	}

	return new AppError(
		"Ocorreu um erro crítico e inesperado. Tente novamente.",
		500,
		undefined,
		error,
	);
}
