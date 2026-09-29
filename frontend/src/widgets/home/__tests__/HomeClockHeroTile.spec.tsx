import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectionStatusStore } from "@/core/hooks/useConnectionStatusStore";
import { server } from "@/testing/mocks/server";
import {
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { HomeClockHeroTile } from "../components/HomeClockHeroTile";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

const NEXT_SCHEDULED_URL = "http://localhost:5252/api/automations/next-scheduled";
const WEATHER_URL = "http://localhost:5252/api/weather/current";

describe("HomeClockHeroTile — badge de status de rede e latência", () => {
	beforeEach(() => {
		useConnectionStatusStore.setState({ status: "connected", latencyMs: 42 });
	});

	it("HomeClockHeroTile_Connected_ShouldShowOnlineLabelAndLatency", () => {
		renderWithProviders(<HomeClockHeroTile />);

		expect(screen.getByText("Rede Residencial Online")).toBeInTheDocument();
		expect(screen.getByText("42ms")).toBeInTheDocument();
	});

	it("HomeClockHeroTile_ConnectedButNoLatencyReadingYet_ShouldShowPlaceholderNotBrokenText", () => {
		useConnectionStatusStore.setState({ status: "connected", latencyMs: null });
		renderWithProviders(<HomeClockHeroTile />);

		expect(screen.getByText("Rede Residencial Online")).toBeInTheDocument();
		expect(screen.getByText("—")).toBeInTheDocument();
		expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
	});

	it("HomeClockHeroTile_Reconnecting_ShouldShowReconnectingLabelAndHideLatencyEvenIfStoreHasStaleValue", () => {
		// Valor de latência "preso" de antes da queda — não pode aparecer como
		// se fosse leitura atual enquanto está reconectando.
		useConnectionStatusStore.setState({
			status: "reconnecting",
			latencyMs: 42,
		});
		renderWithProviders(<HomeClockHeroTile />);

		expect(
			screen.getByText("Rede Residencial Reconectando"),
		).toBeInTheDocument();
		expect(screen.queryByText("42ms")).not.toBeInTheDocument();
		expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
	});

	it("HomeClockHeroTile_Disconnected_ShouldShowOfflineLabelAndHideLatency", () => {
		useConnectionStatusStore.setState({
			status: "disconnected",
			latencyMs: null,
		});
		renderWithProviders(<HomeClockHeroTile />);

		expect(screen.getByText("Rede Residencial Offline")).toBeInTheDocument();
		expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
	});

});

describe("HomeClockHeroTile — próxima rotina agendada (real)", () => {
	beforeEach(() => {
		useConnectionStatusStore.setState({ status: "connected", latencyMs: 5 });
	});

	it("HomeClockHeroTile_OneActiveSchedule_ShouldShowItsNameAndFormattedTime", async () => {
		server.use(
			http.get(NEXT_SCHEDULED_URL, () =>
				HttpResponse.json({
					automationId: "auto-1",
					name: "Modo Noturno & Trancas",
					// Horário fixo e distante o bastante do "agora" real do teste
					// pra cair com segurança em "Hoje" ou no dia seguinte sem
					// depender de qual hora exata o teste roda — só precisamos
					// confirmar que o NOME real aparece, o formato já tem specs
					// próprios em formatNextRun.spec.ts.
					nextRunUtc: new Date(Date.now() + 60_000).toISOString(),
				}),
			),
		);

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(() => {
			expect(
				screen.getByText("Modo Noturno & Trancas"),
			).toBeInTheDocument();
		});
	});

	it("HomeClockHeroTile_NoActiveSchedule_ShouldShowEmptyStateNeverAPlaceholder", async () => {
		server.use(
			http.get(NEXT_SCHEDULED_URL, () => HttpResponse.json(null)),
		);

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(() => {
			expect(
				screen.getByText("Nenhuma rotina agendada"),
			).toBeInTheDocument();
		});
		// Nunca o texto hardcoded antigo, nem um horário inventado.
		expect(screen.queryByText("Modo Noturno & Trancas")).not.toBeInTheDocument();
		expect(screen.queryByText("23:00")).not.toBeInTheDocument();
	});
});

describe("HomeClockHeroTile — clima real (Open-Meteo)", () => {
	const originalGeolocation = navigator.geolocation;

	beforeEach(() => {
		useConnectionStatusStore.setState({ status: "connected", latencyMs: 5 });
	});

	afterEach(() => {
		Object.defineProperty(navigator, "geolocation", {
			value: originalGeolocation,
			configurable: true,
		});
	});

	it("HomeClockHeroTile_LocationConfiguredWithWeather_ShouldShowRealFields_NeverTheOldFixedValues", async () => {
		server.use(
			http.get(WEATHER_URL, () =>
				HttpResponse.json({
					hasLocation: true,
					weather: {
						temperatureCelsius: 27.3,
						feelsLikeCelsius: 29.1,
						humidityPercent: 71,
						windSpeedKmh: 9,
						condition: "Rain",
					},
				}),
			),
		);

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(() => {
			expect(screen.getByText("27.3°C")).toBeInTheDocument();
		});
		expect(screen.getByText(/Sensação 29/)).toBeInTheDocument();
		expect(screen.getByText("71%")).toBeInTheDocument();
		expect(screen.getByText("9 km/h")).toBeInTheDocument();

		// Nunca os valores fixos antigos.
		expect(screen.queryByText("58%")).not.toBeInTheDocument();
		expect(screen.queryByText("14 km/h")).not.toBeInTheDocument();
	});

	it("HomeClockHeroTile_NoLocationConfigured_ShouldShowActivateLocationCta_NeverFakeWeather", async () => {
		server.use(
			http.get(WEATHER_URL, () =>
				HttpResponse.json({ hasLocation: false, weather: null }),
			),
		);

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /ativar localização/i }),
			).toBeInTheDocument();
		});
		expect(screen.queryByText("58%")).not.toBeInTheDocument();
		expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
	});

	it("HomeClockHeroTile_GeolocationPermissionDenied_ShouldWarnItWontRePromptInsteadOfSilentlyRetrying", async () => {
		Object.defineProperty(navigator, "geolocation", {
			value: {
				getCurrentPosition: (
					_success: PositionCallback,
					error?: PositionErrorCallback,
				) => {
					error?.({
						code: 1,
						message: "User denied Geolocation",
					} as GeolocationPositionError);
				},
			},
			configurable: true,
		});

		server.use(
			http.get(WEATHER_URL, () =>
				HttpResponse.json({ hasLocation: false, weather: null }),
			),
		);

		renderWithProviders(<HomeClockHeroTile />);
		const user = userEvent.setup();

		const activateButton = await screen.findByRole("button", {
			name: /ativar localização/i,
		});
		await user.click(activateButton);

		// O browser não mostra o prompt de novo depois de negado (decisão dele,
		// por site) — o botão precisa avisar disso (texto muda, sem empurrar
		// o layout) e o toast explica o porquê, em vez de um parágrafo fixo
		// no card que fazia a linha do relógio "pular".
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /permissão bloqueada/i }),
			).toBeInTheDocument();
		});

		const { toast } = await import("sonner");
		expect(toast.error).toHaveBeenCalledWith(
			expect.stringMatching(/permissão de localização bloqueada/i),
			expect.objectContaining({
				description: expect.stringMatching(/configurações do navegador/i),
			}),
		);
	});

	it("HomeClockHeroTile_LocationConfiguredButProviderDown_ShouldHideWeatherCapsule_NotShowBrokenNumbers", async () => {
		server.use(
			http.get(WEATHER_URL, () =>
				HttpResponse.json({ hasLocation: true, weather: null }),
			),
		);

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: /ativar localização/i }),
			).not.toBeInTheDocument();
		});
		expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
		expect(screen.queryByText("58%")).not.toBeInTheDocument();
	});

	it("HomeClockHeroTile_WeatherStillLoading_ShouldShowSkeleton_NotBlankSpace", async () => {
		// Nunca resolve dentro da janela do teste — prende a query em
		// "loading" de propósito pra observar o estado intermediário (é
		// exatamente o que o usuário via com o backend desligado: sem
		// skeleton, a área ficava vazia até a request falhar).
		server.use(http.get(WEATHER_URL, () => new Promise(() => {})));

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(() => {
			expect(
				screen.getByRole("status", { name: /carregando clima/i }),
			).toBeInTheDocument();
		});
		expect(
			screen.queryByRole("button", { name: /ativar localização/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
	});

	it("HomeClockHeroTile_WeatherRequestFails_ShouldHideGracefully_NeverCrashOrStickSkeletonForever", async () => {
		// Backend desligado/inacessível — erro de rede de verdade, não um
		// hasLocation:true/weather:null (esse é "provedor respondeu, mas sem
		// leitura"; aqui a REQUEST em si falha).
		server.use(
			http.get(WEATHER_URL, () => HttpResponse.json(null, { status: 500 })),
		);

		renderWithProviders(<HomeClockHeroTile />);

		await waitFor(
			() => {
				expect(
					screen.queryByRole("status", { name: /carregando clima/i }),
				).not.toBeInTheDocument();
			},
			{ timeout: 5000 },
		);
		expect(
			screen.queryByRole("button", { name: /ativar localização/i }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/°C/)).not.toBeInTheDocument();
	});
});
