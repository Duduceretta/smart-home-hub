import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { createRoomPickerDeviceMock } from "@/testing/mocks/rooms.mock";
import { server } from "@/testing/mocks/server";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { RoomDeviceAssignmentPicker } from "../RoomDeviceAssignmentPicker";

describe("RoomDeviceAssignmentPicker Integration Tests", () => {
	it("RoomDeviceAssignmentPicker_DevicesLoading_RendersSkeletonRows", () => {
		server.use(
			http.get(
				"*/api/devices",
				() => new Promise(() => {}), // never resolves — keeps isLoading=true
			),
		);

		const { container } = renderWithProviders(
			<RoomDeviceAssignmentPicker selectedIds={[]} onChange={vi.fn()} />,
		);

		expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
			0,
		);
	});

	it("RoomDeviceAssignmentPicker_FetchFails_RendersErrorMessage", async () => {
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({ title: "Erro" }, { status: 500 }),
			),
		);

		renderWithProviders(
			<RoomDeviceAssignmentPicker selectedIds={[]} onChange={vi.fn()} />,
		);

		expect(
			await screen.findByText(
				/Não foi possível carregar os dispositivos/i,
				{},
				{ timeout: 3000 },
			),
		).toBeInTheDocument();
	});

	it("RoomDeviceAssignmentPicker_NoDevicesReturned_RendersEmptyMessage", async () => {
		server.use(
			http.get("*/api/devices", () => HttpResponse.json([], { status: 200 })),
		);

		renderWithProviders(
			<RoomDeviceAssignmentPicker selectedIds={[]} onChange={vi.fn()} />,
		);

		expect(
			await screen.findByText("Nenhum dispositivo encontrado."),
		).toBeInTheDocument();
	});

	it("RoomDeviceAssignmentPicker_TypeSearchTerm_FiltersListByNameAndBrand", async () => {
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					[
						createRoomPickerDeviceMock({
							id: "d1",
							name: "Lâmpada Sala",
							brand: "Philips",
						}),
						createRoomPickerDeviceMock({
							id: "d2",
							name: "Tomada Cozinha",
							brand: "Sonoff",
						}),
					],
					{ status: 200 },
				),
			),
		);

		const user = userEvent.setup();
		renderWithProviders(
			<RoomDeviceAssignmentPicker selectedIds={[]} onChange={vi.fn()} />,
		);

		await screen.findByText("Lâmpada Sala");
		expect(screen.getByText("Tomada Cozinha")).toBeInTheDocument();

		await user.type(
			screen.getByPlaceholderText("Buscar dispositivo..."),
			"sonoff",
		);

		expect(screen.queryByText("Lâmpada Sala")).not.toBeInTheDocument();
		expect(screen.getByText("Tomada Cozinha")).toBeInTheDocument();
	});

	it("RoomDeviceAssignmentPicker_ClickUncheckedDevice_CallsOnChangeWithIdAppended", async () => {
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					[createRoomPickerDeviceMock({ id: "d1", name: "Lâmpada Sala" })],
					{ status: 200 },
				),
			),
		);

		const handleChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<RoomDeviceAssignmentPicker selectedIds={[]} onChange={handleChange} />,
		);

		const checkbox = await screen.findByRole("checkbox");
		await user.click(checkbox);

		expect(handleChange).toHaveBeenCalledWith(["d1"]);
	});

	it("RoomDeviceAssignmentPicker_ClickCheckedDevice_CallsOnChangeWithIdRemoved", async () => {
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					[createRoomPickerDeviceMock({ id: "d1", name: "Lâmpada Sala" })],
					{ status: 200 },
				),
			),
		);

		const handleChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<RoomDeviceAssignmentPicker
				selectedIds={["d1"]}
				onChange={handleChange}
			/>,
		);

		const checkbox = await screen.findByRole("checkbox");
		expect(checkbox).toBeChecked();
		await user.click(checkbox);

		expect(handleChange).toHaveBeenCalledWith([]);
	});

	it("RoomDeviceAssignmentPicker_SelectedCount_UpdatesWithPluralization", async () => {
		server.use(
			http.get("*/api/devices", () => HttpResponse.json([], { status: 200 })),
		);

		const { rerender } = renderWithProviders(
			<RoomDeviceAssignmentPicker selectedIds={[]} onChange={vi.fn()} />,
		);

		// pt-BR CLDR trata 0 e 1 como categoria "one" (singular) — só 2+ vira plural.
		expect(await screen.findByText("0 selecionado")).toBeInTheDocument();

		rerender(
			<RoomDeviceAssignmentPicker selectedIds={["d1"]} onChange={vi.fn()} />,
		);
		expect(await screen.findByText("1 selecionado")).toBeInTheDocument();

		rerender(
			<RoomDeviceAssignmentPicker
				selectedIds={["d1", "d2"]}
				onChange={vi.fn()}
			/>,
		);
		expect(await screen.findByText("2 selecionados")).toBeInTheDocument();
	});

	it("RoomDeviceAssignmentPicker_Disabled_PreventsCheckboxToggle", async () => {
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					[createRoomPickerDeviceMock({ id: "d1", name: "Lâmpada Sala" })],
					{ status: 200 },
				),
			),
		);

		const handleChange = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<RoomDeviceAssignmentPicker
				selectedIds={[]}
				onChange={handleChange}
				disabled
			/>,
		);

		const checkbox = await screen.findByRole("checkbox");
		expect(checkbox).toBeDisabled();
		await user.click(checkbox);

		expect(handleChange).not.toHaveBeenCalled();
	});
});
