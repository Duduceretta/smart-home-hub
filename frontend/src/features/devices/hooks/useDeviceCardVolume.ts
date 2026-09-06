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

	// Lido via ref dentro do efeito de sincronização, nunca como dependência
	// reativa dele — mesmo padrão de `useSyncedDeviceControl` (brilho/cor).
	// Achado um bug real aqui: com `isDraggingVolume` nas deps, soltar o
	// arraste (true -> false) reexecutava o efeito contra o `media` ainda
	// desatualizado e revertia o valor recém-arrastado pro antigo do
	// servidor ANTES do debounce de 300ms conseguir enviar o valor certo.
	const isDraggingVolumeRef = useRef(isDraggingVolume);
	useEffect(() => {
		isDraggingVolumeRef.current = isDraggingVolume;
	}, [isDraggingVolume]);

	// Sincroniza do servidor só enquanto o usuário não está arrastando —
	// mesma cautela do slider de brilho, evita "puxar" o dedo do usuário.
	useEffect(() => {
		if (isDraggingVolumeRef.current || !media) return;
		setLocalVolume(media.volumePercent);
	}, [media]);

	const debouncedVolume = useDebouncedValue(localVolume, 300);

	useEffect(() => {
		if (
			isAdbControllable &&
			userDraggedVolumeRef.current &&
			debouncedVolume === localVolume
		) {
			userDraggedVolumeRef.current = false;
			setVolume({ deviceId: device.id, volume: debouncedVolume });
		}
	}, [debouncedVolume, localVolume, isAdbControllable, device.id, setVolume]);

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
