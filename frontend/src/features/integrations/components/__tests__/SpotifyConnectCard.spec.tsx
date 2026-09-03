import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import type { SpotifyStatus } from "../../types/integrations.types";
import { SpotifyConnectCard } from "../SpotifyConnectCard";

describe("SpotifyConnectCard Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("SpotifyConnectCard_WhenDisconnected_RendersConnectButtonAndTriggersConnect", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		let connectEndpointCalled = false;

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = { connected: false, displayName: null };
				return HttpResponse.json(status, { status: 200 });
			}),
			http.get("*/api/integrations/spotify/login", () => {
				connectEndpointCalled = true;
				return HttpResponse.json(
					{ authorizeUrl: "https://accounts.spotify.com/authorize" },
					{ status: 200 },
				);
			}),
		);

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/settings"]}>
				<SpotifyConnectCard />
			</MemoryRouter>,
		);

		// Assert
		const connectButton = await screen.findByRole("button", {
			name: /Conectar Spotify/i,
		});
		expect(connectButton).toBeInTheDocument();

		await user.click(connectButton);

		await waitFor(() => {
			expect(connectEndpointCalled).toBe(true);
		});
	});

	it("SpotifyConnectCard_WhenConnected_RendersDisplayNameAndDisconnectButton", async () => {
		// Arrange
		const user = userEvent.setup({ delay: null });
		let disconnectEndpointCalled = false;

		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo Silva",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
			http.delete("*/api/integrations/spotify", () => {
				disconnectEndpointCalled = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/settings"]}>
				<SpotifyConnectCard />
			</MemoryRouter>,
		);

		// Assert
		expect(
			await screen.findByText(/Conectado como Eduardo Silva/i),
		).toBeInTheDocument();

		const disconnectButton = screen.getByRole("button", {
			name: /Desconectar/i,
		});
		expect(disconnectButton).toBeInTheDocument();

		await user.click(disconnectButton);

		await waitFor(() => {
			expect(disconnectEndpointCalled).toBe(true);
		});
	});

	it("SpotifyConnectCard_WithCallbackConnectedParam_ShowsSuccessToast", async () => {
		// Arrange
		const toastSuccessSpy = vi.spyOn(toast, "success");
		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = {
					connected: true,
					displayName: "Eduardo",
				};
				return HttpResponse.json(status, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/settings?spotify=connected"]}>
				<SpotifyConnectCard />
			</MemoryRouter>,
		);

		// Assert
		await waitFor(() => {
			expect(toastSuccessSpy).toHaveBeenCalledWith(
				"Conta do Spotify conectada com sucesso!",
			);
		});
	});

	it("SpotifyConnectCard_WithCallbackErrorParam_ShowsErrorToast", async () => {
		// Arrange
		const toastErrorSpy = vi.spyOn(toast, "error");
		server.use(
			http.get("*/api/integrations/spotify/status", () => {
				const status: SpotifyStatus = { connected: false, displayName: null };
				return HttpResponse.json(status, { status: 200 });
			}),
		);

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/settings?spotify=error"]}>
				<SpotifyConnectCard />
			</MemoryRouter>,
		);

		// Assert
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith(
				"Não foi possível conectar sua conta do Spotify. Tente novamente.",
			);
		});
	});
});
