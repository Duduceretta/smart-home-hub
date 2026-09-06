import type { Page } from "@playwright/test";

const API_ORIGIN = "http://localhost:5252";

export interface MockSpotifyStatus {
	connected: boolean;
	displayName: string | null;
}

export async function mockSpotifyApi(
	page: Page,
	initialConnected = false,
	displayName: string | null = "Eduardo Silva",
): Promise<{ status: MockSpotifyStatus }> {
	const state = {
		status: {
			connected: initialConnected,
			displayName: initialConnected ? displayName : null,
		},
	};

	// Mock Spotify playback (idle)
	await page.route(
		`${API_ORIGIN}/api/integrations/spotify/playback*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					isPlaying: false,
					title: null,
					artist: null,
					albumArtUrl: null,
					progressMs: 0,
					durationMs: 0,
					device: null,
				}),
			});
		},
	);

	// Mock status endpoint
	await page.route(
		`${API_ORIGIN}/api/integrations/spotify/status*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(state.status),
			});
		},
	);

	// Mock login URL
	await page.route(
		`${API_ORIGIN}/api/integrations/spotify/login*`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					// Redireciona de volta para /settings com param spotify=connected,
					// exatamente como o callback do OAuth real faz
					authorizeUrl: "http://localhost:5173/settings?spotify=connected",
				}),
			});
		},
	);

	// Mock disconnect (DELETE)
	await page.route(`${API_ORIGIN}/api/integrations/spotify`, async (route) => {
		if (route.request().method() === "DELETE") {
			state.status.connected = false;
			state.status.displayName = null;
			await route.fulfill({ status: 204 });
			return;
		}
		await route.fallback();
	});

	return state;
}
