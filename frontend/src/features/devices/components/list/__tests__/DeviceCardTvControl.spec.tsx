import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
	DeviceTypeEnum,
	IntegrationTypeEnum,
} from "@/features/devices/types/devices.types";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	fireEvent,
	renderWithProviders,
	screen,
	waitFor,
} from "@/testing/test-utils";
import { DeviceCardTvControl } from "../DeviceCardTvControl";

/** jsdom returns an all-zero rect by default; give the slider a real width
 * so the pointer-drag percentage math resolves to a real number instead of
 * NaN. Native PointerEvent capture isn't meaningfully simulated by
 * userEvent.pointer() in this jsdom setup, so the drag test uses
 * fireEvent directly — same exception already used in DeviceCard.spec.tsx. */
function mockSliderGeometry(slider: HTMLElement) {
	vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
		width: 100,
		height: 10,
		right: 100,
		bottom: 10,
		x: 0,
		y: 0,
		toJSON: () => {},
	});
	slider.setPointerCapture = vi.fn();
	slider.releasePointerCapture = vi.fn();
	slider.hasPointerCapture = vi.fn().mockReturnValue(true);
}

function mockMedia(media: {
	volumePercent: number;
	isPlaying: boolean;
	title: string | null;
	artist: string | null;
}) {
	server.use(
		http.get("*/api/devices/:id/media", () => HttpResponse.json(media)),
	);
}

const tvDevice = createDeviceMock({
	id: "tv-01",
	type: DeviceTypeEnum.Television,
	integrationType: IntegrationTypeEnum.GoogleCast,
	isOnline: true,
});

describe("DeviceCardTvControl Integration Tests", () => {
	it("DeviceCardTvControl_HasMediaPlaying_ShouldRenderTitleAndArtistWithVolumeEnabled", async () => {
		// Arrange
		mockMedia({
			volumePercent: 40,
			isPlaying: true,
			title: "Stranger Things",
			artist: "Netflix",
		});

		// Act
		renderWithProviders(<DeviceCardTvControl device={tvDevice} />);

		// Assert
		expect(await screen.findByText("Stranger Things")).toBeInTheDocument();
		expect(screen.getByText("Netflix")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Volume" })).toBeEnabled();
	});

	it("DeviceCardTvControl_NoMediaTitle_ShouldShowNoPlaybackPlaceholder", async () => {
		// Arrange
		mockMedia({
			volumePercent: 0,
			isPlaying: false,
			title: null,
			artist: null,
		});

		// Act
		renderWithProviders(<DeviceCardTvControl device={tvDevice} />);

		// Assert
		expect(await screen.findByText("Sem Reprodução")).toBeInTheDocument();
	});

	it("DeviceCardTvControl_DeviceOffline_ShouldShowOfflineMessageAndDisableVolume", () => {
		// Arrange
		const offlineDevice = createDeviceMock({
			...tvDevice,
			isOnline: false,
		});

		// Act
		renderWithProviders(<DeviceCardTvControl device={offlineDevice} />);

		// Assert
		expect(screen.getByText("Dispositivo offline")).toBeInTheDocument();
		expect(screen.getByText("Sem Reprodução")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Volume" })).toBeDisabled();
	});

	it("DeviceCardTvControl_NotAdbControllable_ShouldDisableVolumeEvenOnline", () => {
		// Arrange — LG WebOS TVs use the WebOS SSAP protocol, not ADB, so
		// volume can't be set from here.
		const lgDevice = createDeviceMock({
			...tvDevice,
			integrationType: IntegrationTypeEnum.LgWebOs,
		});

		// Act
		renderWithProviders(<DeviceCardTvControl device={lgDevice} />);

		// Assert
		expect(screen.getByRole("button", { name: "Volume" })).toBeDisabled();
	});

	it("DeviceCardTvControl_DragVolumeSlider_ShouldDebounceAndSendVolumeCommand", async () => {
		// Arrange
		mockMedia({
			volumePercent: 20,
			isPlaying: false,
			title: "Stranger Things",
			artist: "Netflix",
		});
		let capturedBody: { volume?: number } | null = null;
		server.use(
			http.put("*/api/devices/:id/volume", async ({ request }) => {
				capturedBody = (await request.json()) as { volume?: number };
				return new HttpResponse(null, { status: 204 });
			}),
		);
		renderWithProviders(<DeviceCardTvControl device={tvDevice} />);
		// Espera o GET de mídia resolver e sincronizar localVolume ANTES de
		// arrastar — do contrário o efeito de sincronização, que só evita
		// sobrescrever durante um arraste ativo, pode chegar depois do
		// pointerUp e reverter o valor recém-arrastado pro da API.
		await screen.findByText("Stranger Things");
		const slider = screen.getByRole("button", { name: "Volume" });
		mockSliderGeometry(slider);

		// Act — arrasta até 75% da faixa
		fireEvent.pointerDown(slider, { clientX: 75, pointerId: 1 });
		fireEvent.pointerUp(slider, { pointerId: 1 });

		// Assert — envio debounced (300ms) do valor arrastado
		await waitFor(
			() => {
				expect(capturedBody).not.toBeNull();
				expect(capturedBody).toMatchObject({ volume: 75 });
			},
			{ timeout: 2000 },
		);
	});
});
