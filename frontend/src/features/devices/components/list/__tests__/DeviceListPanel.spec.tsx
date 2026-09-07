import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { useDevicesUIStore } from "@/features/devices/store/devices-ui.store";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, waitFor } from "@/testing/test-utils";
import { DeviceListPanel } from "../DeviceListPanel";

function mockDevicesPage(items: unknown[]) {
	return {
		items,
		page: 1,
		pageSize: 20,
		totalCount: items.length,
		totalPages: 1,
		hasNextPage: false,
		hasPreviousPage: false,
	};
}

function renderPanel() {
	return renderWithProviders(
		<DeviceListPanel
			selectedId={null}
			onSelect={() => {}}
			onAutoSelect={() => {}}
			autoSelectFirst={false}
			onCreate={() => {}}
		/>,
	);
}

beforeEach(() => {
	useDevicesUIStore.setState({
		query: "",
		activeTab: "Todos",
		statusFilter: null,
		selectedRoomId: null,
		onlyOn: false,
		viewMode: "grid",
		page: 1,
	});
});

describe("DeviceListPanel Stale-While-Revalidate", () => {
	it("DeviceListPanel_NoCacheAndFetchFails_ShouldShowErrorFallback", async () => {
		// Arrange — sem carga anterior bem-sucedida (regressão do fallback já implementado)
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);

		// Act
		renderPanel();

		// Assert
		expect(
			await screen.findByText("Não foi possível carregar os dispositivos."),
		).toBeInTheDocument();
	});

	it("DeviceListPanel_BackgroundRefetchFailsWithCache_ShouldKeepListAndShowStaleIndicator", async () => {
		// Arrange — 1ª carga bem-sucedida, popula o cache
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					mockDevicesPage([createDeviceMock({ name: "Lâmpada da Sala" })]),
				),
			),
		);
		const { queryClient } = renderPanel();
		await screen.findByText("Lâmpada da Sala");

		// Act — refetch em background falha
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);
		await queryClient.refetchQueries();

		// Assert — lista continua na tela, com o indicador discreto no
		// contador ("N dispositivos"), nunca o fallback de erro completo
		expect(
			await screen.findByTitle(/dados desatualizados/i, {}, { timeout: 3000 }),
		).toBeInTheDocument();
		expect(screen.getByText("Lâmpada da Sala")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("DeviceListPanel_RefetchSucceedsAfterStale_ShouldRemoveIndicatorWithoutInteraction", async () => {
		// Arrange — fica stale primeiro
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					mockDevicesPage([createDeviceMock({ name: "Lâmpada da Sala" })]),
				),
			),
		);
		const { queryClient } = renderPanel();
		await screen.findByText("Lâmpada da Sala");

		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);
		await queryClient.refetchQueries();
		await screen.findByTitle(/dados desatualizados/i, {}, { timeout: 3000 });

		// Act — próximo refetch em background sucede, sem interação do usuário
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					mockDevicesPage([createDeviceMock({ name: "Lâmpada da Sala" })]),
				),
			),
		);
		await queryClient.refetchQueries();

		// Assert
		await waitFor(() =>
			expect(
				screen.queryByTitle(/dados desatualizados/i),
			).not.toBeInTheDocument(),
		);
	});
});
