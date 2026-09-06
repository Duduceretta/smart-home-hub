import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { type Device, IntegrationTypeEnum } from "../types/devices.types";
import { useDeviceMedia } from "./useDeviceMedia";
import { useSetDeviceVolume } from "./useSetDeviceVolume";

export interface UseDeviceCardVolumeReturn {
	localVolume: number;
	setLocalVolume: React.Dispatch<React.SetStateAction<number>>;
	isDraggingVolume: boolean;
	setIsDraggingVolume: React.Dispatch<React.SetStateAction<boolean>>;
	userDraggedVolumeRef: React.MutableRefObject<boolean>;
	volumeDisabled: boolean;
	isAdbControllable: boolean;
	media: ReturnType<typeof useDeviceMedia>["data"];
	isPlaying: boolean;
}

/**
 * Encapsula debounce, sincronização remota e ref de volume para dispositivos TV controláveis via ADB.
 */
export function useDeviceCardVolume(device: Device): UseDeviceCardVolumeReturn {
	const isOnline = device.isOnline;
	const isAdbControllable =
		device.integrationType === IntegrationTypeEnum.GoogleCast ||
		device.integrationType === IntegrationTypeEnum.AndroidTvAdb;

	const { data: media } = useDeviceMedia(device.id, {
		enabled: isAdbControllable && isOnline,
	});
	const isPlaying = Boolean(media?.isPlaying);
	const { mutate: setVolume } = useSetDeviceVolume();

	const [localVolume, setLocalVolume] = useState(0);
	const [isDraggingVolume, setIsDraggingVolume] = useState(false);
	// Só true entre um arraste do usuário e o envio debounced correspondente —
	// evita que a sincronização vinda do servidor seja confundida com
	// uma mudança do usuário e dispare um envio espúrio ao montar o card com
	// dados já em cache (ex: voltando do Dashboard pra Devices).
	const userDraggedVolumeRef = useRef(false);

	// Sincroniza do servidor só enquanto o usuário não está arrastando —
	// mesma cautela do slider de brilho, evita "puxar" o dedo do usuário.
	useEffect(() => {
		if (media && !isDraggingVolume) {
			setLocalVolume(media.volumePercent);
		}
	}, [media, isDraggingVolume]);

	const debouncedVolume = useDebouncedValue(localVolume, 300);

	useEffect(() => {
		if (isAdbControllable && userDraggedVolumeRef.current) {
			userDraggedVolumeRef.current = false;
			setVolume({ deviceId: device.id, volume: debouncedVolume });
		}
	}, [debouncedVolume, isAdbControllable, device.id, setVolume]);

	const volumeDisabled = !isOnline || !isAdbControllable;

	return {
		localVolume,
		setLocalVolume,
		isDraggingVolume,
		setIsDraggingVolume,
		userDraggedVolumeRef,
		volumeDisabled,
		isAdbControllable,
		media,
		isPlaying,
	};
}
