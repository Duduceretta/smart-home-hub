import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	DeviceTypeEnum,
	IntegrationTypeEnum,
	type UpdateDevicePayload,
} from "../../types/devices.types";
import {
	createDeviceRequest,
	deleteDeviceRequest,
	fetchDeviceActivityLog,
	fetchDeviceAutomations,
	fetchDeviceById,
	fetchDeviceEnergy,
	fetchDevices,
	fetchDeviceWorkMode,
	getDeviceMediaStateRequest,
	getDeviceTelemetryHistoryRequest,
	setDeviceBrightnessRequest,
	setDeviceColorRequest,
	setDeviceColorTempRequest,
	setDeviceVolumeRequest,
	setDeviceWorkModeRequest,
	startDeviceDiscoveryRequest,
	stopDeviceDiscoveryRequest,
	toggleDeviceRequest,
	updateDeviceRequest,
} from "../devices.api";

describe("devices.api Integration Tests", () => {
	describe("fetchDevices", () => {
		it("fetchDevices_ApiReturnsPagedResponse_ShouldReturnItAsIs", async () => {
			// Arrange
			const paged = {
				items: [createDeviceMock({ id: "dev-1" })],
				page: 2,
				pageSize: 10,
				totalCount: 25,
				totalPages: 3,
				hasNextPage: true,
				hasPreviousPage: true,
			};
			server.use(http.get("*/api/devices", () => HttpResponse.json(paged)));

			// Act
			const result = await fetchDevices({ page: 2, pageSize: 10 });

			// Assert
			expect(result).toEqual(paged);
		});

		it("fetchDevices_ApiReturnsPlainArray_ShouldNormalizeIntoPagedResponseShape", async () => {
			// Arrange
			const devices = [
				createDeviceMock({ id: "dev-1" }),
				createDeviceMock({ id: "dev-2" }),
			];
			server.use(http.get("*/api/devices", () => HttpResponse.json(devices)));

			// Act
			const result = await fetchDevices({ page: 1, pageSize: 50 });

			// Assert
			expect(result).toEqual({
				items: devices,
				page: 1,
				pageSize: 50,
				totalCount: 2,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			});
		});

		it("fetchDevices_CalledWithFilters_ShouldSendCorrectQueryParams", async () => {
			// Arrange
			let capturedParams: URLSearchParams | null = null;
			server.use(
				http.get("*/api/devices", ({ request }) => {
					capturedParams = new URL(request.url).searchParams;
					return HttpResponse.json([]);
				}),
			);

			// Act
			await fetchDevices({
				query: "lâmpada",
				category: "Iluminação",
				status: "online",
				roomId: "room-01",
				onlyOn: true,
				page: 3,
				pageSize: 20,
			});

			// Assert
			const params = capturedParams as unknown as URLSearchParams;
			expect(params.get("q")).toBe("lâmpada");
			expect(params.get("category")).toBe("Iluminação");
			expect(params.get("status")).toBe("online");
			expect(params.get("roomId")).toBe("room-01");
			expect(params.get("onlyOn")).toBe("true");
			expect(params.get("page")).toBe("3");
			expect(params.get("pageSize")).toBe("20");
		});

		it("fetchDevices_CategoryIsTodos_ShouldOmitCategoryFromQueryParams", async () => {
			// Arrange — "Todos" is the UI's "no filter" sentinel, not a real category
			let capturedParams: URLSearchParams | null = null;
			server.use(
				http.get("*/api/devices", ({ request }) => {
					capturedParams = new URL(request.url).searchParams;
					return HttpResponse.json([]);
				}),
			);

			// Act
			await fetchDevices({ category: "Todos" });

			// Assert
			expect(
				(capturedParams as unknown as URLSearchParams).has("category"),
			).toBe(false);
		});

		it("fetchDevices_ApiReturns500_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/devices", () =>
					HttpResponse.json({ status: 500 }, { status: 500 }),
				),
			);

			// Act & Assert
			await expect(fetchDevices()).rejects.toThrow(
				"Não foi possível carregar a lista de dispositivos.",
			);
		});
	});

	describe("fetchDeviceById", () => {
		it("fetchDeviceById_ApiReturnsDevice_ShouldReturnIt", async () => {
			// Arrange
			const device = createDeviceMock({ id: "dev-42" });
			server.use(
				http.get("*/api/devices/dev-42", () => HttpResponse.json(device)),
			);

			// Act
			const result = await fetchDeviceById("dev-42");

			// Assert
			expect(result).toEqual(device);
		});

		it("fetchDeviceById_ApiReturns404_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/devices/missing", () =>
					HttpResponse.json({ status: 404 }, { status: 404 }),
				),
			);

			// Act & Assert
			await expect(fetchDeviceById("missing")).rejects.toThrow(
				"Não foi possível encontrar os detalhes do dispositivo solicitado.",
			);
		});
	});

	describe("createDeviceRequest", () => {
		const payload = {
			name: "Nova Lâmpada",
			brand: "Philips",
			externalId: "AA:BB:CC:00:11:22",
			type: DeviceTypeEnum.Light,
			integrationType: IntegrationTypeEnum.NativeMqtt,
		};

		it("createDeviceRequest_ValidPayload_ShouldPostPayloadAndReturnResponse", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.post("*/api/devices", async ({ request }) => {
					capturedBody = await request.json();
					return HttpResponse.json(
						{
							message: "Dispositivo criado com sucesso!",
							deviceId: "dev-new-1",
						},
						{ status: 201 },
					);
				}),
			);

			// Act
			const result = await createDeviceRequest(payload);

			// Assert
			expect(capturedBody).toEqual(payload);
			expect(result).toEqual({
				message: "Dispositivo criado com sucesso!",
				deviceId: "dev-new-1",
			});
		});

		it("createDeviceRequest_ApiReturns422_ShouldThrowAppErrorWithApiDetail", async () => {
			// Arrange
			server.use(
				http.post("*/api/devices", () =>
					HttpResponse.json(
						{ title: "Validation Error", detail: "O nome é obrigatório." },
						{ status: 422 },
					),
				),
			);

			// Act & Assert
			await expect(createDeviceRequest(payload)).rejects.toThrow(
				"O nome é obrigatório.",
			);
		});
	});

	describe("toggleDeviceRequest", () => {
		it("toggleDeviceRequest_ValidDeviceId_ShouldPostToToggleEndpointAndReturnMessage", async () => {
			// Arrange
			let calledUrl: string | null = null;
			server.use(
				http.post("*/api/devices/dev-1/toggle", ({ request }) => {
					calledUrl = request.url;
					return HttpResponse.json({ message: "Estado alternado." });
				}),
			);

			// Act
			const result = await toggleDeviceRequest("dev-1");

			// Assert
			expect(calledUrl).toContain("/devices/dev-1/toggle");
			expect(result).toEqual({ message: "Estado alternado." });
		});

		it("toggleDeviceRequest_ApiReturns500_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.post("*/api/devices/dev-1/toggle", () =>
					HttpResponse.json({ status: 500 }, { status: 500 }),
				),
			);

			// Act & Assert
			await expect(toggleDeviceRequest("dev-1")).rejects.toThrow(
				"Não foi possível alternar o estado do dispositivo.",
			);
		});
	});

	describe("updateDeviceRequest", () => {
		const payload: UpdateDevicePayload = {
			name: "Lâmpada Renomeada",
			brand: "Philips",
			externalId: "AA:BB:CC:00:11:22",
			type: DeviceTypeEnum.Light,
			integrationType: IntegrationTypeEnum.NativeMqtt,
			roomId: "room-02",
		};

		it("updateDeviceRequest_ValidPayload_ShouldPutToDeviceIdEndpointWithPayload", async () => {
			// Arrange
			let capturedBody: unknown = null;
			let calledUrl: string | null = null;
			server.use(
				http.put("*/api/devices/dev-1", async ({ request }) => {
					capturedBody = await request.json();
					calledUrl = request.url;
					return HttpResponse.json({ id: "dev-1", ...payload });
				}),
			);

			// Act
			const result = await updateDeviceRequest({ id: "dev-1", payload });

			// Assert
			expect(calledUrl).toContain("/devices/dev-1");
			expect(capturedBody).toEqual(payload);
			expect(result).toEqual({ id: "dev-1", ...payload });
		});

		it("updateDeviceRequest_ApiReturns422_ShouldThrowAppErrorWithApiDetail", async () => {
			// Arrange
			server.use(
				http.put("*/api/devices/dev-1", () =>
					HttpResponse.json(
						{ title: "Validation Error", detail: "Marca é obrigatória." },
						{ status: 422 },
					),
				),
			);

			// Act & Assert
			await expect(
				updateDeviceRequest({ id: "dev-1", payload }),
			).rejects.toThrow("Marca é obrigatória.");
		});
	});

	describe("deleteDeviceRequest", () => {
		it("deleteDeviceRequest_ValidDeviceId_ShouldCallDeleteEndpoint", async () => {
			// Arrange
			let calledUrl: string | null = null;
			server.use(
				http.delete("*/api/devices/dev-1", ({ request }) => {
					calledUrl = request.url;
					return new HttpResponse(null, { status: 204 });
				}),
			);

			// Act
			await deleteDeviceRequest("dev-1");

			// Assert
			expect(calledUrl).toContain("/devices/dev-1");
		});

		it("deleteDeviceRequest_ApiReturns500_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.delete("*/api/devices/dev-1", () =>
					HttpResponse.json({ status: 500 }, { status: 500 }),
				),
			);

			// Act & Assert
			await expect(deleteDeviceRequest("dev-1")).rejects.toThrow(
				"Não foi possível remover o dispositivo selecionado.",
			);
		});
	});

	describe("startDeviceDiscoveryRequest / stopDeviceDiscoveryRequest", () => {
		it("startDeviceDiscoveryRequest_NoArgument_ShouldDefaultTimeoutTo30Seconds", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.post("*/api/devices/discovery/start", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await startDeviceDiscoveryRequest();

			// Assert
			expect(capturedBody).toEqual({ timeoutSeconds: 30 });
		});

		it("startDeviceDiscoveryRequest_CustomTimeout_ShouldSendGivenValue", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.post("*/api/devices/discovery/start", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await startDeviceDiscoveryRequest(60);

			// Assert
			expect(capturedBody).toEqual({ timeoutSeconds: 60 });
		});

		it("stopDeviceDiscoveryRequest_Called_ShouldPostToStopEndpoint", async () => {
			// Arrange
			let called = false;
			server.use(
				http.post("*/api/devices/discovery/stop", () => {
					called = true;
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await stopDeviceDiscoveryRequest();

			// Assert
			expect(called).toBe(true);
		});
	});

	describe("getDeviceMediaStateRequest", () => {
		it("getDeviceMediaStateRequest_ValidDeviceId_ShouldReturnMediaState", async () => {
			// Arrange
			const mediaState = {
				volumePercent: 45,
				isPlaying: true,
				title: "Música",
				artist: "Artista",
			};
			server.use(
				http.get("*/api/devices/tv-1/media", () =>
					HttpResponse.json(mediaState),
				),
			);

			// Act
			const result = await getDeviceMediaStateRequest("tv-1");

			// Assert
			expect(result).toEqual(mediaState);
		});
	});

	describe("device control setters (volume/brightness/color/color-temp/work-mode)", () => {
		it("setDeviceVolumeRequest_ValidVolume_ShouldPutVolumeBody", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.put("*/api/devices/tv-1/volume", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await setDeviceVolumeRequest({ deviceId: "tv-1", volume: 80 });

			// Assert
			expect(capturedBody).toEqual({ volume: 80 });
		});

		it("setDeviceBrightnessRequest_ValidPercent_ShouldPutBrightnessPercentBody", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.put("*/api/devices/light-1/brightness", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await setDeviceBrightnessRequest({
				deviceId: "light-1",
				brightnessPercent: 65,
			});

			// Assert
			expect(capturedBody).toEqual({ brightnessPercent: 65 });
		});

		it("setDeviceColorRequest_ValidHex_ShouldPutColorHexBody", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.put("*/api/devices/light-1/color", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act — design-token-lint-ignore: light-bulb color payload, not a UI color
			await setDeviceColorRequest({ deviceId: "light-1", colorHex: "#FF0000" });

			// Assert
			expect(capturedBody).toEqual({ colorHex: "#FF0000" }); // design-token-lint-ignore
		});

		it("setDeviceColorTempRequest_ValidPercent_ShouldPutColorTempPercentBody", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.put("*/api/devices/light-1/color-temp", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await setDeviceColorTempRequest({
				deviceId: "light-1",
				colorTempPercent: 40,
			});

			// Assert
			expect(capturedBody).toEqual({ colorTempPercent: 40 });
		});

		it("setDeviceWorkModeRequest_ValidMode_ShouldPutWorkModeBody", async () => {
			// Arrange
			let capturedBody: unknown = null;
			server.use(
				http.put("*/api/devices/light-1/work-mode", async ({ request }) => {
					capturedBody = await request.json();
					return new HttpResponse(null, { status: 200 });
				}),
			);

			// Act
			await setDeviceWorkModeRequest({
				deviceId: "light-1",
				workMode: "colour",
			});

			// Assert
			expect(capturedBody).toEqual({ workMode: "colour" });
		});

		it("setDeviceWorkModeRequest_ApiReturns500_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.put("*/api/devices/light-1/work-mode", () =>
					HttpResponse.json({ status: 500 }, { status: 500 }),
				),
			);

			// Act & Assert
			await expect(
				setDeviceWorkModeRequest({ deviceId: "light-1", workMode: "white" }),
			).rejects.toThrow("Não foi possível trocar o modo do dispositivo.");
		});
	});

	describe("fetchDeviceWorkMode", () => {
		it("fetchDeviceWorkMode_ApiReturnsWorkModeWrapper_ShouldUnwrapAndReturnWorkModeOnly", async () => {
			// Arrange
			server.use(
				http.get("*/api/devices/light-1/work-mode", () =>
					HttpResponse.json({ workMode: "colour" }),
				),
			);

			// Act
			const result = await fetchDeviceWorkMode("light-1");

			// Assert
			expect(result).toBe("colour");
		});

		it("fetchDeviceWorkMode_ApiReturns500_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/devices/light-1/work-mode", () =>
					HttpResponse.json({ status: 500 }, { status: 500 }),
				),
			);

			// Act & Assert
			await expect(fetchDeviceWorkMode("light-1")).rejects.toThrow(
				"Não foi possível consultar o modo atual do dispositivo.",
			);
		});
	});

	describe("fetchDeviceEnergy", () => {
		it("fetchDeviceEnergy_ValidRange_ShouldSendRangeAsQueryParamAndReturnData", async () => {
			// Arrange
			const energy = {
				hasEnergyData: true,
				chart: [
					{ timestamp: "2026-08-01T00:00:00Z", value: 1.2, isEstimated: false },
				],
				totalConsumptionKwh: 3.4,
				isEnergyEstimated: false,
				measuresPower: true,
			};
			let capturedRange: string | null = null;
			server.use(
				http.get("*/api/devices/dev-1/energy", ({ request }) => {
					capturedRange = new URL(request.url).searchParams.get("range");
					return HttpResponse.json(energy);
				}),
			);

			// Act
			const result = await fetchDeviceEnergy("dev-1", "7d");

			// Assert
			expect(capturedRange).toBe("7d");
			expect(result).toEqual(energy);
		});

		it("fetchDeviceEnergy_ApiReturns500_ShouldThrowAppErrorWithFallbackMessage", async () => {
			// Arrange
			server.use(
				http.get("*/api/devices/dev-1/energy", () =>
					HttpResponse.json({ status: 500 }, { status: 500 }),
				),
			);

			// Act & Assert
			await expect(fetchDeviceEnergy("dev-1", "24h")).rejects.toThrow(
				"Não foi possível carregar o consumo de energia do dispositivo.",
			);
		});
	});

	describe("fetchDeviceAutomations", () => {
		it("fetchDeviceAutomations_ValidDeviceId_ShouldReturnLinkedAutomations", async () => {
			// Arrange
			const automations = [
				{
					id: "auto-1",
					name: "Desligar à noite",
					isActive: true,
					triggerKind: "schedule",
				},
			];
			server.use(
				http.get("*/api/devices/dev-1/automations", () =>
					HttpResponse.json(automations),
				),
			);

			// Act
			const result = await fetchDeviceAutomations("dev-1");

			// Assert
			expect(result).toEqual(automations);
		});
	});

	describe("fetchDeviceActivityLog", () => {
		it("fetchDeviceActivityLog_ApiReturnsPagedResponse_ShouldReturnOnlyItemsWithFixedPageSize", async () => {
			// Arrange
			const entries = [
				{
					id: "evt-1",
					deviceId: "dev-1",
					eventType: "DeviceStatus",
					title: "Ligado",
					description: "Dispositivo ligado",
					timestamp: "2026-08-20T10:00:00Z",
					isAlert: false,
				},
			];
			let capturedParams: URLSearchParams | null = null;
			server.use(
				http.get("*/api/devices/dev-1/events", ({ request }) => {
					capturedParams = new URL(request.url).searchParams;
					return HttpResponse.json({
						items: entries,
						page: 1,
						pageSize: 8,
						totalCount: 1,
						totalPages: 1,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
			);

			// Act
			const result = await fetchDeviceActivityLog("dev-1");

			// Assert
			expect(result).toEqual(entries);
			expect(
				(capturedParams as unknown as URLSearchParams).get("pageSize"),
			).toBe("8");
		});

		it("fetchDeviceActivityLog_ApiReturnsResponseWithoutItems_ShouldReturnEmptyArray", async () => {
			// Arrange
			server.use(
				http.get("*/api/devices/dev-1/events", () =>
					HttpResponse.json({
						page: 1,
						pageSize: 8,
						totalCount: 0,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false,
					}),
				),
			);

			// Act
			const result = await fetchDeviceActivityLog("dev-1");

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("getDeviceTelemetryHistoryRequest", () => {
		it("getDeviceTelemetryHistoryRequest_NoRangeGiven_ShouldDefaultTo24h", async () => {
			// Arrange
			let capturedRange: string | null = null;
			server.use(
				http.get("*/api/devices/dev-1/telemetry", ({ request }) => {
					capturedRange = new URL(request.url).searchParams.get("range");
					return HttpResponse.json({
						deviceId: "dev-1",
						deviceName: "Sensor",
						points: [],
					});
				}),
			);

			// Act
			await getDeviceTelemetryHistoryRequest({ id: "dev-1" });

			// Assert
			expect(capturedRange).toBe("24h");
		});

		it("getDeviceTelemetryHistoryRequest_CustomRange_ShouldSendGivenRangeAndReturnPoints", async () => {
			// Arrange
			const history = {
				deviceId: "dev-1",
				deviceName: "Sensor",
				points: [
					{
						timestamp: "2026-08-01T00:00:00Z",
						powerUsageWatts: 12,
						temperatureCelsius: 21.5,
						voltage: 220,
						isOn: true,
					},
				],
			};
			let capturedRange: string | null = null;
			server.use(
				http.get("*/api/devices/dev-1/telemetry", ({ request }) => {
					capturedRange = new URL(request.url).searchParams.get("range");
					return HttpResponse.json(history);
				}),
			);

			// Act
			const result = await getDeviceTelemetryHistoryRequest({
				id: "dev-1",
				range: "30d",
			});

			// Assert
			expect(capturedRange).toBe("30d");
			expect(result).toEqual(history);
		});
	});
});
