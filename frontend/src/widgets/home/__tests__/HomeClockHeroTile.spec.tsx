import { beforeEach, describe, expect, it } from "vitest";
import { useConnectionStatusStore } from "@/core/hooks/useConnectionStatusStore";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { HomeClockHeroTile } from "../components/HomeClockHeroTile";

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
