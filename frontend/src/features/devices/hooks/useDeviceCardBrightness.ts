import { useSyncedDeviceControl } from "@/core/hooks/useSyncedDeviceControl";
import type { Device } from "../types/devices.types";
import { useSetDeviceBrightness } from "./useSetDeviceBrightness";

export interface UseDeviceCardBrightnessReturn {
	brightness: number;
	setBrightness: (value: number) => void;
	isDraggingBrightness: boolean;
	setIsDraggingBrightness: (isInteracting: boolean) => void;
	commitBrightness: (value: number) => void;
}

/**
 * Encapsula a sincronização e mutação de brilho de lâmpadas para DeviceCard,
 * reaproveitando useSyncedDeviceControl por baixo para evitar sobrescritas
 * remotas concorrentes durante arraste ativo.
 */
export function useDeviceCardBrightness(
	device: Device,
): UseDeviceCardBrightnessReturn {
	const {
		value: brightness,
		setValue: setBrightness,
		isInteracting: isDraggingBrightness,
		setIsInteracting: setIsDraggingBrightness,
		lastCommittedRef: lastCommittedBrightnessRef,
	} = useSyncedDeviceControl(device.brightness, 50);

	const { mutate: commitBrightness_ } = useSetDeviceBrightness();

	const commitBrightness = (value: number) => {
		commitBrightness_(
			{ deviceId: device.id, brightnessPercent: value },
			{
				onSuccess: () => {
					lastCommittedBrightnessRef.current = value;
				},
				onError: () => setBrightness(lastCommittedBrightnessRef.current),
			},
		);
	};

	return {
		brightness,
		setBrightness,
		isDraggingBrightness,
		setIsDraggingBrightness,
		commitBrightness,
	};
}
