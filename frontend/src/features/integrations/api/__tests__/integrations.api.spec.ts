import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/testing/mocks/server";
import type {
	SpotifyPlaybackState,
	SpotifyStatus,
} from "../../types/integrations.types";
import {
	disconnectSpotifyRequest,
	getSpotifyLoginUrlRequest,
	getSpotifyPlaybackRequest,
	getSpotifyStatusRequest,
	setSpotifyVolumeRequest,
	skipToNextSpotifyTrackRequest,
	skipToPreviousSpotifyTrackRequest,
	toggleSpotifyPlaybackRequest,
} from "../integrations.api";

describe("integrationsApi Integration Tests", () => {
	describe("getSpotifyLoginUrlRequest", () => {
		it("getSpotifyLoginUrlRequest_OnSuccess_ReturnsAuthorizeUrl", async () => {
			// Arrange
			server.use(
				http.get("*/api/integrations/spotify/login", () => {
					return HttpResponse.json(
						{
							authorizeUrl:
								"https://accounts.spotify.com/authorize?client_id=123",
						},
						{ status: 200 },
					);
				}),
			);

			// Act
			const result = await getSpotifyLoginUrlRequest();

			// Assert
			expect(result).toEqual({
				authorizeUrl: "https://accounts.spotify.com/authorize?client_id=123",
			});
		});

		it("getSpotifyLoginUrlRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/integrations/spotify/login", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(getSpotifyLoginUrlRequest()).rejects.toThrow(
				"Não foi possível iniciar a conexão com o Spotify.",
			);
		});
	});

	describe("getSpotifyStatusRequest", () => {
		it("getSpotifyStatusRequest_OnSuccess_ReturnsStatus", async () => {
			// Arrange
			const expectedStatus: SpotifyStatus = {
				connected: true,
				displayName: "Eduardo",
			};
			server.use(
				http.get("*/api/integrations/spotify/status", () => {
					return HttpResponse.json(expectedStatus, { status: 200 });
				}),
			);

			// Act
			const result = await getSpotifyStatusRequest();

			// Assert
			expect(result).toEqual(expectedStatus);
		});

		it("getSpotifyStatusRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/integrations/spotify/status", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(getSpotifyStatusRequest()).rejects.toThrow(
				"Não foi possível verificar o status da conexão com o Spotify.",
			);
		});
	});

	describe("disconnectSpotifyRequest", () => {
		it("disconnectSpotifyRequest_OnSuccess_ResolvesVoid", async () => {
			// Arrange
			let called = false;
			server.use(
				http.delete("*/api/integrations/spotify", () => {
					called = true;
					return new HttpResponse(null, { status: 204 });
				}),
			);

			// Act
			await disconnectSpotifyRequest();

			// Assert
			expect(called).toBe(true);
		});

		it("disconnectSpotifyRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.delete("*/api/integrations/spotify", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(disconnectSpotifyRequest()).rejects.toThrow(
				"Não foi possível desconectar a conta do Spotify.",
			);
		});
	});

	describe("getSpotifyPlaybackRequest", () => {
		it("getSpotifyPlaybackRequest_OnSuccess_ReturnsPlaybackState", async () => {
			// Arrange
			const expectedPlayback: SpotifyPlaybackState = {
				volumePercent: 65,
				isPlaying: true,
				title: "Bohemian Rhapsody",
				artist: "Queen",
				albumCoverUrl: "https://example.com/cover.jpg",
				deviceName: "Living Room Speaker",
			};
			server.use(
				http.get("*/api/integrations/spotify/playback", () => {
					return HttpResponse.json(expectedPlayback, { status: 200 });
				}),
			);

			// Act
			const result = await getSpotifyPlaybackRequest();

			// Assert
			expect(result).toEqual(expectedPlayback);
		});

		it("getSpotifyPlaybackRequest_WhenNothingPlaying_ReturnsNull", async () => {
			// Arrange
			server.use(
				http.get("*/api/integrations/spotify/playback", () => {
					return HttpResponse.json(null, { status: 200 });
				}),
			);

			// Act
			const result = await getSpotifyPlaybackRequest();

			// Assert
			expect(result).toBeNull();
		});

		it("getSpotifyPlaybackRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/integrations/spotify/playback", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(getSpotifyPlaybackRequest()).rejects.toThrow(
				"Não foi possível carregar o que está tocando no Spotify.",
			);
		});
	});

	describe("setSpotifyVolumeRequest", () => {
		it("setSpotifyVolumeRequest_OnSuccess_SendsVolumePayloadAndResolves", async () => {
			// Arrange
			let receivedBody: unknown = null;
			server.use(
				http.put("*/api/integrations/spotify/volume", async ({ request }) => {
					receivedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await setSpotifyVolumeRequest(75);

			// Assert
			expect(receivedBody).toEqual({ volume: 75 });
		});

		it("setSpotifyVolumeRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.put("*/api/integrations/spotify/volume", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(setSpotifyVolumeRequest(50)).rejects.toThrow(
				"Não foi possível ajustar o volume do Spotify.",
			);
		});
	});

	describe("toggleSpotifyPlaybackRequest", () => {
		it("toggleSpotifyPlaybackRequest_OnSuccess_ResolvesVoid", async () => {
			// Arrange
			let called = false;
			server.use(
				http.put("*/api/integrations/spotify/toggle", () => {
					called = true;
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await toggleSpotifyPlaybackRequest();

			// Assert
			expect(called).toBe(true);
		});

		it("toggleSpotifyPlaybackRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.put("*/api/integrations/spotify/toggle", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(toggleSpotifyPlaybackRequest()).rejects.toThrow(
				"Não foi possível alternar a reprodução do Spotify.",
			);
		});
	});

	describe("skipToNextSpotifyTrackRequest", () => {
		it("skipToNextSpotifyTrackRequest_OnSuccess_ResolvesVoid", async () => {
			// Arrange
			let called = false;
			server.use(
				http.post("*/api/integrations/spotify/next", () => {
					called = true;
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await skipToNextSpotifyTrackRequest();

			// Assert
			expect(called).toBe(true);
		});

		it("skipToNextSpotifyTrackRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.post("*/api/integrations/spotify/next", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(skipToNextSpotifyTrackRequest()).rejects.toThrow(
				"Não foi possível pular para a próxima faixa.",
			);
		});
	});

	describe("skipToPreviousSpotifyTrackRequest", () => {
		it("skipToPreviousSpotifyTrackRequest_OnSuccess_ResolvesVoid", async () => {
			// Arrange
			let called = false;
			server.use(
				http.post("*/api/integrations/spotify/previous", () => {
					called = true;
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await skipToPreviousSpotifyTrackRequest();

			// Assert
			expect(called).toBe(true);
		});

		it("skipToPreviousSpotifyTrackRequest_OnApiError_ThrowsAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.post("*/api/integrations/spotify/previous", () => {
					return new HttpResponse(null, { status: 500 });
				}),
			);

			// Act & Assert
			await expect(skipToPreviousSpotifyTrackRequest()).rejects.toThrow(
				"Não foi possível voltar para a faixa anterior.",
			);
		});
	});
});
