import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createSignalRConnection } from "@/core/lib/signalr";
import { Logger } from "@/core/logger/app.logger";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import {
	startDeviceDiscoveryRequest,
	stopDeviceDiscoveryRequest,
} from "../api/devices.api";
import { useDevicesUIStore } from "../store/devices-ui.store";
import type { DiscoveredDevice } from "../types/devices.types";

const DEFAULT_TIMEOUT_SECONDS = 30;

/**
 * Manages a SignalR connection dedicated to the Device Discovery flow,
 * independent from the app-wide connection in useRealtimeListener (which is
 * a passive listener that lives for the whole session). This one's lifecycle
 * is tied to the discovery modal: it opens when the modal opens and tears
 * down when it closes, mirroring the scan session lifecycle on the backend.
 */
export function useDeviceDiscovery(): void {
	const { t } = useTranslation("devices");
	const isOpen = useDevicesUIStore((s) => s.isDiscoveryModalOpen);
	const scanTrigger = useDevicesUIStore((s) => s.scanTrigger);
	const setIsScanning = useDevicesUIStore((s) => s.setIsScanning);
	const addDiscoveredDevice = useDevicesUIStore((s) => s.addDiscoveredDevice);
	const user = useAuthStore((s) => s.user);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scanTrigger is intentionally unread in the body — it only forces this effect to re-run for "Rescan"/"Add Another".
	useEffect(() => {
		if (!isOpen || !user) return;

		const connection = createSignalRConnection();
		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		connection.on("DeviceDiscovered", (payload: DiscoveredDevice) => {
			Logger.info("Evento SignalR: DeviceDiscovered", payload);
			addDiscoveredDevice(payload);
		});

		(async () => {
			setIsScanning(true);
			try {
				await connection.start();
				await connection.invoke("StartDiscovery", DEFAULT_TIMEOUT_SECONDS);
			} catch (error) {
				Logger.error(
					"Falha SignalR ao iniciar descoberta, tentando fallback REST",
					error,
				);
				try {
					await startDeviceDiscoveryRequest(DEFAULT_TIMEOUT_SECONDS);
				} catch (restError) {
					Logger.error("Falha no fallback REST de descoberta", restError);
					if (!cancelled) {
						toast.error(t("discoveryModal.scan.connectionError"));
					}
				}
			}

			if (!cancelled) {
				timeoutId = setTimeout(() => {
					if (!cancelled) setIsScanning(false);
				}, DEFAULT_TIMEOUT_SECONDS * 1000);
			}
		})();

		return () => {
			cancelled = true;
			if (timeoutId) clearTimeout(timeoutId);
			setIsScanning(false);

			connection
				.invoke("StopDiscovery")
				.catch(() => stopDeviceDiscoveryRequest().catch(() => {}))
				.finally(() => {
					connection.stop().catch((error: unknown) => {
						Logger.warn("Erro ao encerrar conexão SignalR de discovery", error);
					});
				});
		};
	}, [isOpen, scanTrigger, user, addDiscoveredDevice, setIsScanning, t]);
}
