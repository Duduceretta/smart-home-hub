import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import {
	resetPassword,
	sendVerificationEmail,
	syncUserWithBackendRequest,
} from "../auth.api";

describe("auth.api tests", () => {
	describe("sendVerificationEmail", () => {
		it("sendVerificationEmail_WhenApiSucceeds_ShouldResolveWithoutError", async () => {
			server.use(
				http.post("*/api/auth/send-verification-email", async ({ request }) => {
					const body = (await request.json()) as { email: string };
					if (body.email === "test@nexushub.page") {
						return HttpResponse.json({ success: true }, { status: 200 });
					}
					return new HttpResponse(null, { status: 400 });
				}),
			);

			await expect(
				sendVerificationEmail("test@nexushub.page"),
			).resolves.toBeUndefined();
		});

		it("sendVerificationEmail_WhenRateLimited_ShouldThrowAuthErrorWithTooManyRequests", async () => {
			server.use(
				http.post("*/api/auth/send-verification-email", () => {
					return new HttpResponse(null, { status: 429 });
				}),
			);

			await expect(
				sendVerificationEmail("test@nexushub.page"),
			).rejects.toThrowError(
				expect.objectContaining({
					name: "AuthError",
					message: "verifyEmail.errors.tooManyRequests",
				}),
			);
		});

		it("sendVerificationEmail_WhenGenericError_ShouldThrowAuthErrorWithGenericMessage", async () => {
			server.use(
				http.post("*/api/auth/send-verification-email", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			await expect(
				sendVerificationEmail("test@nexushub.page"),
			).rejects.toThrowError(
				expect.objectContaining({
					name: "AuthError",
					message: "verifyEmail.errors.generic",
				}),
			);
		});
	});

	describe("resetPassword", () => {
		it("resetPassword_WhenApiSucceeds_ShouldResolveWithoutError", async () => {
			server.use(
				http.post("*/api/auth/forgot-password", async ({ request }) => {
					const body = (await request.json()) as { email: string };
					if (body.email === "reset@nexushub.page") {
						return HttpResponse.json({ success: true }, { status: 200 });
					}
					return new HttpResponse(null, { status: 400 });
				}),
			);

			await expect(
				resetPassword("reset@nexushub.page"),
			).resolves.toBeUndefined();
		});

		it("resetPassword_WhenRateLimited_ShouldThrowAuthErrorWithTooManyRequests", async () => {
			server.use(
				http.post("*/api/auth/forgot-password", () => {
					return new HttpResponse(null, { status: 429 });
				}),
			);

			await expect(resetPassword("reset@nexushub.page")).rejects.toThrowError(
				expect.objectContaining({
					name: "AuthError",
					message: "forgotPassword.errors.tooManyRequests",
				}),
			);
		});

		it("resetPassword_WhenGenericError_ShouldThrowAuthErrorWithGenericMessage", async () => {
			server.use(
				http.post("*/api/auth/forgot-password", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			await expect(resetPassword("reset@nexushub.page")).rejects.toThrowError(
				expect.objectContaining({
					name: "AuthError",
					message: "forgotPassword.errors.generic",
				}),
			);
		});
	});

	describe("syncUserWithBackendRequest", () => {
		it("syncUserWithBackendRequest_WhenSucceeds_ShouldReturnSyncUserResponse", async () => {
			server.use(
				http.post("*/api/users/sync", () => {
					return HttpResponse.json(
						{ message: "Usuário sincronizado", userId: "user-123" },
						{ status: 200 },
					);
				}),
			);

			const result = await syncUserWithBackendRequest();
			expect(result).toEqual({
				message: "Usuário sincronizado",
				userId: "user-123",
			});
		});

		it("syncUserWithBackendRequest_WhenFails_ShouldThrowError", async () => {
			server.use(
				http.post("*/api/users/sync", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			await expect(syncUserWithBackendRequest()).rejects.toThrowError(
				"Não foi possível sincronizar o usuário com o servidor local.",
			);
		});
	});
});
