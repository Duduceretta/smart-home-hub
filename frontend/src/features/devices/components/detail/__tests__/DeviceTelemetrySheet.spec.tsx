import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DeviceTelemetrySheet } from "../DeviceTelemetrySheet";

const device = createDeviceMock({ id: "device-01", name: "Sensor Sala" });

describe("DeviceTelemetrySheet Integration Tests", () => {
	it("DeviceTelemetrySheet_FetchFails_ShouldRenderNeutralFallbackMatchingSkeletonHeight", async () => {
		// Arrange
		server.use(
			http.get("*/api/devices/:id/telemetry", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);

		// Act
		renderWithProviders(
			<DeviceTelemetrySheet device={device} isOpen onClose={vi.fn()} />,
		);

		// Assert — fallback via CardErrorFallback, h-52 (paridade com o skeleton)
		const alert = await screen.findByRole("alert", {}, { timeout: 3000 });
		expect(alert).toBeInTheDocument();
		expect(alert.className).toContain("h-52");
	});

	it("DeviceTelemetrySheet_FetchFailsThenRetry_ShouldRenderChartsAfterClick", async () => {
		// Arrange
		let requestCount = 0;
		server.use(
			http.get("*/api/devices/:id/telemetry", () => {
				requestCount += 1;
				if (requestCount === 1) {
					return HttpResponse.json({ title: "Erro" }, { status: 500 });
				}
				return HttpResponse.json({
					deviceId: "device-01",
					deviceName: "Sensor Sala",
					points: [
						{
							timestamp: "2026-09-06T10:00:00Z",
							powerUsageWatts: 12,
							temperatureCelsius: 22,
							voltage: 220,
							isOn: true,
						},
					],
				});
			}),
		);
		const user = userEvent.setup();

		// Act
		renderWithProviders(
			<DeviceTelemetrySheet device={device} isOpen onClose={vi.fn()} />,
		);
		await screen.findByRole("alert");
		await user.click(screen.getByRole("button", { name: /tentar de novo/i }));

		// Assert
		await screen.findByText("12 W");
	});
});
