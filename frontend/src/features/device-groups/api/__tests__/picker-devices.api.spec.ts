import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createPickerDeviceMock } from "@/testing/mocks/device-groups.mock";
import { server } from "@/testing/mocks/server";
import { fetchPickerDevices } from "../picker-devices.api";

describe("picker-devices.api Integration Tests", () => {
	it("fetchPickerDevices_ApiReturnsPagedResponse_ShouldReturnOnlyTheItemsArray", async () => {
		// Arrange
		const devices = [
			createPickerDeviceMock({ id: "dev-1", name: "Lâmpada Sala" }),
			createPickerDeviceMock({ id: "dev-2", name: "Sensor Cozinha" }),
		];
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json({
					items: devices,
					totalCount: 2,
					page: 1,
					pageSize: 200,
					totalPages: 1,
				}),
			),
		);

		// Act
		const result = await fetchPickerDevices();

		// Assert
		expect(result).toEqual(devices);
	});

	it("fetchPickerDevices_ApiReturnsPlainArray_ShouldReturnItAsIs", async () => {
		// Arrange
		const devices = [createPickerDeviceMock({ id: "dev-1" })];
		server.use(http.get("*/api/devices", () => HttpResponse.json(devices)));

		// Act
		const result = await fetchPickerDevices();

		// Assert
		expect(result).toEqual(devices);
	});

	it("fetchPickerDevices_ApiCalledWithPageSize200_ShouldSendCorrectQueryParam", async () => {
		// Arrange
		let capturedPageSize: string | null = null;
		server.use(
			http.get("*/api/devices", ({ request }) => {
				capturedPageSize = new URL(request.url).searchParams.get("pageSize");
				return HttpResponse.json([]);
			}),
		);

		// Act
		await fetchPickerDevices();

		// Assert
		expect(capturedPageSize).toBe("200");
	});

	it("fetchPickerDevices_ApiReturnsProblemDetails500_ShouldThrowAppErrorWithApiTitle", async () => {
		// Arrange — handleApplicationError surfaces the ProblemDetails
		// title/detail from the response, not the caller's fallback message
		// (that fallback is only ever used for the internal Logger.error call).
		server.use(
			http.get("*/api/devices", () =>
				HttpResponse.json(
					{ title: "Internal Server Error", status: 500 },
					{ status: 500 },
				),
			),
		);

		// Act & Assert
		await expect(fetchPickerDevices()).rejects.toThrow("Internal Server Error");
	});
});
