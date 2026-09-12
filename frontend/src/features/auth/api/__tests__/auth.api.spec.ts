import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import { sendVerificationEmail } from "../auth.api";

describe("auth.api verification tests", () => {
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
});
