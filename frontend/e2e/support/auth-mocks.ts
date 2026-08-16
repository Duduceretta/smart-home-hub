import type { Page } from "@playwright/test";

export interface MockUser {
	uid: string;
	email: string;
	displayName: string;
}

export const testUser: MockUser = {
	uid: "e2e-test-uid-001",
	email: "e2e.tester@smarthome.local",
	displayName: "Eduardo Teste",
};

function base64UrlEncode(payload: Record<string, unknown> | string): string {
	const json = typeof payload === "string" ? payload : JSON.stringify(payload);
	return Buffer.from(json).toString("base64url");
}

/**
 * Builds a structurally valid (unsigned) JWT so the Firebase Auth SDK can
 * decode standard claims (exp/iat/auth_time) from the fake idToken without
 * throwing, exactly like it would with a real token.
 */
function createFakeIdToken(user: MockUser): string {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const header = base64UrlEncode({ alg: "none", typ: "JWT" });
	const payload = base64UrlEncode({
		sub: user.uid,
		user_id: user.uid,
		email: user.email,
		iat: nowSeconds,
		auth_time: nowSeconds,
		exp: nowSeconds + 3600,
		firebase: { sign_in_provider: "password", identities: {} },
	});
	return `${header}.${payload}.fake-signature`;
}

export type LoginOutcome = "success" | "invalid-credentials";

/**
 * Backend origin (matches VITE_API_URL's local fallback in api.client.ts).
 * Route patterns MUST be anchored to this origin instead of a leading "**"
 * wildcard — a bare pattern can also match Vite-served module paths that
 * happen to contain the same substring, hijacking the script response and
 * breaking the app bundle.
 */
const API_ORIGIN = "http://localhost:5252";

/**
 * Intercepts the Firebase Identity Toolkit REST API so email/password login
 * flows run fully offline and deterministically, without depending on a
 * real Firebase project or network access.
 */
export async function mockFirebaseAuth(
	page: Page,
	outcome: LoginOutcome = "success",
): Promise<void> {
	await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
		const url = route.request().url();

		if (url.includes(":signInWithPassword")) {
			if (outcome === "invalid-credentials") {
				await route.fulfill({
					status: 400,
					contentType: "application/json",
					body: JSON.stringify({
						error: {
							code: 400,
							message: "INVALID_LOGIN_CREDENTIALS",
							errors: [
								{
									message: "INVALID_LOGIN_CREDENTIALS",
									domain: "global",
									reason: "invalid",
								},
							],
						},
					}),
				});
				return;
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					kind: "identitytoolkit#VerifyPasswordResponse",
					localId: testUser.uid,
					email: testUser.email,
					displayName: testUser.displayName,
					idToken: createFakeIdToken(testUser),
					registered: true,
					refreshToken: "fake-refresh-token-e2e",
					expiresIn: "3600",
				}),
			});
			return;
		}

		if (url.includes(":lookup")) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					kind: "identitytoolkit#GetAccountInfoResponse",
					users: [
						{
							localId: testUser.uid,
							email: testUser.email,
							displayName: testUser.displayName,
							emailVerified: true,
							providerUserInfo: [],
						},
					],
				}),
			});
			return;
		}

		// Generic fallback for auxiliary Identity Toolkit calls made on auth
		// initialization (e.g. reCAPTCHA config fetch), harmless when empty.
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "{}",
		});
	});

	await page.route("**/securetoken.googleapis.com/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				access_token: createFakeIdToken(testUser),
				id_token: createFakeIdToken(testUser),
				refresh_token: "fake-refresh-token-e2e",
				expires_in: "3600",
				token_type: "Bearer",
				user_id: testUser.uid,
				project_id: "smart-home-hub-e2e",
			}),
		});
	});
}

/**
 * Intercepts the C# backend calls that fire right after authentication
 * completes, regardless of which feature is under test.
 */
export async function mockBackendEssentials(page: Page): Promise<void> {
	await page.route(`${API_ORIGIN}/api/users/sync`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ message: "Usuário sincronizado com sucesso." }),
		});
	});

	await page.route(`${API_ORIGIN}/api/dashboard/overview`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				summary: {
					totalDevicesCount: 0,
					onlineDevicesCount: 0,
					energyConsumptionKwh: 0,
					averageTemperatureCelsius: 0,
					temperatureTrend: 0,
					activeAlertsCount: 0,
				},
				energyChart: [],
				roomUsage: [],
				recentActivities: [],
			}),
		});
	});
}

/**
 * Logs in through the real login form (email + password) against the
 * mocked Firebase/backend endpoints above, leaving the browser on
 * /dashboard once the redirect completes.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
	await mockFirebaseAuth(page, "success");
	await mockBackendEssentials(page);

	await page.goto("/login");
	await page.getByLabel("Email").fill(testUser.email);
	await page.getByLabel("Senha", { exact: true }).fill("SenhaValida123!");
	await page.getByRole("button", { name: "Iniciar Sessão" }).click();

	await page.waitForURL(/\/dashboard/);
}
