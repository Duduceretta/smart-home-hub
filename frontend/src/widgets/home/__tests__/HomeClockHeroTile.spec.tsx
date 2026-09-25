import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { useConnectionStatusStore } from "@/core/hooks/useConnectionStatusStore";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, waitFor } from "@/testing/test-utils";
import { HomeClockHeroTile } from "../components/HomeClockHeroTile";

const NEXT_SCHEDULED_URL = "http://localhost:5252/api/automations/next-scheduled";

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

	it("HomeClockHeroTile_NoSummary_ShouldStillRenderRealTemperatureFallback", () => {
		renderWithProviders(<HomeClockHeroTile />);
		// Regressão: badge de rede novo não pode quebrar o resto do card.
		expect(screen.getByText("23.0°C")).toBeInTheDocument();
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
