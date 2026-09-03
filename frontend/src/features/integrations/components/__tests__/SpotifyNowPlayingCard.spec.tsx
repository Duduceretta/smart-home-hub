import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import {
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import type {
	SpotifyPlaybackState,
	SpotifyStatus,
} from "../../types/integrations.types";
import { SpotifyNowPlayingCard } from "../SpotifyNowPlayingCard";

describe("SpotifyNowPlayingCard Integration Tests", () => {
	const activePlayback: SpotifyPlaybackState = {
		volumePercent: 60,
		isPlaying: true,
		title: "Hotel California",
		artist: "Eagles",
		albumCoverUrl: "https://example.com/cover.jpg",
		deviceName: "Caixa Acústica Sala",
	};

	let originalLocation: Location;
	let assignedHref = "";

	beforeEach(() => {
		vi.clearAllMocks();
		assignedHref = "";
		originalLocation = window.location;

		delete (window as unknown as { location?: unknown }).location;
		(window as unknown as { location: unknown }).location = {
			...originalLocation,
			origin: "http://localhost:3000",
			protocol: "http:",
			host: "localhost:3000",
			hostname: "localhost",
			pathname: "/",
			search: "",
			hash: "",
			set href(val: string) {
				assignedHref = val;
			},
			get href() {
				return assignedHref || "http://localhost:3000/";
			},
		};
	});

	afterEach(() => {
		(window as unknown as { location: unknown }).location = originalLocation;
		vi.restoreAllMocks();
	});

	it("SpotifyNowPlayingCard_WhenDisconnected_ShowsDisconnectedStateAndConnectButton", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		let loginCalled = false;

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = { connected: false, displayName: null };
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/login", () => {
				loginCalled = true;
				return HttpResponse.json(
					{ authorizeUrl: "https://accounts.spotify.com/authorize" },
					{ status: 200 },
				);
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		// Assert
		expect(
			await screen.findByText(/Spotify desconectado/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Conecte sua conta pra controlar a reprodução/i),
		).toBeInTheDocument();

		const connectButton = screen.getByRole("button", {
			name: /Conectar Spotify/i,
		});
		await user.click(connectButton);

		await waitFor(() => {
			expect(loginCalled).toBe(true);
		});
		expect(assignedHref).toBe("https://accounts.spotify.com/authorize");
	});

	it("SpotifyNowPlayingCard_WhenConnectedButNothingPlaying_ShowsNothingPlayingState", async () => {
		// Arrange
		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(null, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		// Assert
		expect(
			await screen.findByText(/Nada tocando no momento/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Toque algo no Spotify pra ver aqui\./i),
		).toBeInTheDocument();
	});

	it("SpotifyNowPlayingCard_WhenPlaying_RendersTrackInfoControlsAndAlbumCover", async () => {
		// Arrange
		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(activePlayback, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		// Assert
		expect(await screen.findByText("Hotel California")).toBeInTheDocument();
		expect(screen.getByText("Eagles")).toBeInTheDocument();
		expect(
			screen.getByText(/Reproduzindo em Caixa Acústica Sala/i),
		).toBeInTheDocument();

		const coverImg = screen.getByAltText("Hotel California");
		expect(coverImg).toHaveAttribute("src", "https://example.com/cover.jpg");

		expect(screen.getByRole("button", { name: /Pausar/i })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Próxima faixa/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Faixa anterior/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Volume/i })).toBeInTheDocument();
	});

	it("SpotifyNowPlayingCard_WhenPaused_ShowsPlayButtonAndTogglesOnUserClick", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		let toggleCalled = false;

		const pausedPlayback: SpotifyPlaybackState = {
			...activePlayback,
			isPlaying: false,
		};

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(pausedPlayback, { status: 200 });
			}),
			http.put("*/api/integrations/spotify/toggle", () => {
				toggleCalled = true;
				return new HttpResponse(null, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		// Assert
		const playButton = await screen.findByRole("button", {
			name: /Reproduzir/i,
		});
		await user.click(playButton);

		await waitFor(() => {
			expect(toggleCalled).toBe(true);
		});
	});

	it("SpotifyNowPlayingCard_OnSkipControls_DispatchesNextAndPreviousMutations", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		let nextCalled = false;
		let previousCalled = false;

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(activePlayback, { status: 200 });
			}),
			http.post("*/api/integrations/spotify/next", () => {
				nextCalled = true;
				return new HttpResponse(null, { status: 200 });
			}),
			http.post("*/api/integrations/spotify/previous", () => {
				previousCalled = true;
				return new HttpResponse(null, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		// Assert
		const nextBtn = await screen.findByRole("button", {
			name: /Próxima faixa/i,
		});
		const prevBtn = screen.getByRole("button", { name: /Faixa anterior/i });

		await user.click(nextBtn);
		await waitFor(() => {
			expect(nextCalled).toBe(true);
		});

		await user.click(prevBtn);
		await waitFor(() => {
			expect(previousCalled).toBe(true);
		});
	});

	it("SpotifyNowPlayingCard_WhenNoAlbumCover_RendersFallbackWithoutImage", async () => {
		// Arrange
		const noCoverPlayback: SpotifyPlaybackState = {
			...activePlayback,
			albumCoverUrl: null,
		};

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(noCoverPlayback, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		// Assert
		await screen.findByText("Hotel California");
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("SpotifyNowPlayingCard_OnVolumeSliderInteraction_DispatchesVolumeChange", async () => {
		// Arrange
		let volumePayloadSent: { volume: number } | null = null;

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/playback", () => {
				return HttpResponse.json(activePlayback, { status: 200 });
			}),
			http.put("*/api/integrations/spotify/volume", async ({ request }) => {
				volumePayloadSent = (await request.json()) as { volume: number };
				return new HttpResponse(null, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(<SpotifyNowPlayingCard />);

		const slider = await screen.findByRole("button", { name: /Volume/i });

		// Mock bounding rect: left=0, width=100
		vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			width: 100,
			height: 10,
			right: 100,
			bottom: 10,
			x: 0,
			y: 0,
			toJSON: () => {},
		});
		slider.setPointerCapture = vi.fn();
		slider.releasePointerCapture = vi.fn();

		fireEvent.pointerDown(slider, { clientX: 75, pointerId: 1 });

		// Assert: debounced volume call
		await waitFor(
			() => {
				expect(volumePayloadSent).toEqual({ volume: 75 });
			},
			{ timeout: 2000 },
		);

		fireEvent.pointerUp(slider, { pointerId: 1 });
	});
});
