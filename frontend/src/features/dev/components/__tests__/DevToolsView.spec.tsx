import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { Toaster } from "@/core/components/ui/sonner";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { DevToolsView } from "../DevToolsView";

describe("DevToolsView Integration Tests", () => {
	it("DevToolsView_ClickSeedMockHouse_ShouldCallApiAndShowSuccessToast", async () => {
		// Arrange
		let seedCalled = false;
		server.use(
			http.post("*/api/dev/seed-mock-house", async () => {
				seedCalled = true;
				return HttpResponse.json(
					{ roomsCreated: 4, devicesCreated: 12, errors: [] },
					{ status: 200 },
				);
			}),
			http.get("*/api/devices", () => {
				return HttpResponse.json({ items: [], total: 0 }, { status: 200 });
			}),
		);

		const user = userEvent.setup();
		renderWithProviders(
			<>
				<DevToolsView />
				<Toaster />
			</>,
		);

		// Act
		await user.click(
			screen.getByRole("button", { name: /gerar casa mock \(seed\)/i }),
		);

		// Assert
		expect(
			await screen.findByText(
				/casa mock gerada: 4 ambientes, 12 dispositivos/i,
			),
		).toBeInTheDocument();
		expect(seedCalled).toBe(true);
	});
});
