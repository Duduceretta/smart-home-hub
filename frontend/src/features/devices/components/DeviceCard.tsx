import {
	Disc3,
	Minus,
	MoreVertical,
	Pause,
	Pencil,
	Play,
	Plus,
	SkipBack,
	SkipForward,
	Snowflake,
	Trash2,
	Volume2,
	Wind,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeleteDeviceModal } from "@/core/components/modals/DeleteDeviceModal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { DEVICE_CONFIG } from "../constants/devices.constants";
import { useDeleteDevice } from "../hooks/useDeleteDevice";
import { useDeviceMedia } from "../hooks/useDeviceMedia";
import { useSetDeviceVolume } from "../hooks/useSetDeviceVolume";
import { useToggleDevice } from "../hooks/useToggleDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
	IntegrationTypeEnum,
	isActuatorDevice,
} from "../types/devices.types";
import { DeviceTelemetrySheet } from "./DeviceTelemetrySheet";

interface DeviceCardProps {
	device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
	const { t } = useTranslation(["devices", "common"]);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);

	// Estados locais para controles interativos embutidos
	const [brightness, setBrightness] = useState(80);
	const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);
	const [temperature, setTemperature] = useState(22);
	const [climateMode, setClimateMode] = useState<"cool" | "fan">("cool");

	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();
	const openEditModal = useDevicesUIStore((s) => s.openEditModal);

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const IconComponent = config.icon;
	const showToggle = isActuatorDevice(device.type);

	const isTv = device.type === DeviceTypeEnum.Television;
	const isAc = device.type === DeviceTypeEnum.Thermostat;
	const isLight = device.type === DeviceTypeEnum.Light;
	const isSocket = device.type === DeviceTypeEnum.Switch;

	// TV e Climatização ocupam 2 colunas no grid no desktop
	const isWide = isTv || isAc;
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	// Volume/mídia real via ADB — só suportado por TVs GoogleCast/AndroidTvAdb
	// (LgWebOs usa protocolo WebOS SSAP, fora de escopo).
	const isAdbControllable =
		device.integrationType === IntegrationTypeEnum.GoogleCast ||
		device.integrationType === IntegrationTypeEnum.AndroidTvAdb;

	const { data: media } = useDeviceMedia(device.id, {
		enabled: isTv && isAdbControllable && isOnline,
	});
	// Estado real de reprodução (via ADB) — não confundir com `isOn` (TV
	// ligada só indica energia, não que algo está tocando na tela).
	const isPlaying = Boolean(media?.isPlaying);
	const { mutate: setVolume } = useSetDeviceVolume();

	const [localVolume, setLocalVolume] = useState(0);
	const [isDraggingVolume, setIsDraggingVolume] = useState(false);
	// Só true entre um arraste do usuário e o envio debounced correspondente —
	// evita que a sincronização vinda do servidor (abaixo) seja confundida com
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

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isOnline || isToggling) return;
		toggleDevice(device.id);
	};

	const handleInspectTelemetry = () => {
		setIsTelemetryModalOpen(true);
	};

	// Renderiza o corpo do card conforme o tipo de dispositivo
	const renderCardBody = () => {
		// 1. Lâmpada (Slider de Brilho)
		if (isLight) {
			return (
				<div className="flex flex-col gap-2 mt-auto pt-2">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>{t("card.brightness", "Brilho")}</span>
						<span className="font-bold text-foreground">
							{isOn ? `${brightness}%` : "0%"}
						</span>
					</div>
					<button
						type="button"
						disabled={!isOnline}
						aria-label={t("card.brightness", "Brilho")}
						className="relative z-20 block w-full h-2 rounded-full bg-surface-low overflow-visible cursor-pointer group/slider disabled:cursor-not-allowed touch-none"
						onPointerDown={(e) => {
							e.stopPropagation();
							if (!isOnline) return;
							e.currentTarget.setPointerCapture(e.pointerId);
							setIsDraggingBrightness(true);
							const rect = e.currentTarget.getBoundingClientRect();
							const pct = Math.round(
								((e.clientX - rect.left) / rect.width) * 100,
							);
							setBrightness(Math.max(0, Math.min(100, pct)));
						}}
						onPointerMove={(e) => {
							if (!isOnline || e.buttons !== 1) return;
							const rect = e.currentTarget.getBoundingClientRect();
							const pct = Math.round(
								((e.clientX - rect.left) / rect.width) * 100,
							);
							setBrightness(Math.max(0, Math.min(100, pct)));
						}}
						onPointerUp={(e) => {
							if (e.currentTarget.hasPointerCapture(e.pointerId)) {
								e.currentTarget.releasePointerCapture(e.pointerId);
							}
							setIsDraggingBrightness(false);
						}}
					>
						<div
							className={`h-full bg-warm rounded-full relative ${isDraggingBrightness ? "" : "transition-all"}`}
							style={{ width: isOn ? `${brightness}%` : "0%" }}
						>
							<div
								className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-warm-foreground rounded-full shadow-sm transition-opacity ${
									isDraggingBrightness
										? "opacity-100"
										: "opacity-0 group-hover/slider:opacity-100"
								}`}
							/>
						</div>
					</button>
				</div>
			);
		}

		// 3. Tomada (Consumo W + Tensão)
		if (isSocket) {
			return (
				<div className="flex flex-col gap-2 mt-auto">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">
							{t("card.powerUsage", "Consumo")}
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-xl font-bold text-foreground tracking-tight">
								{isOn ? 120 : 0}
							</span>
							<span className="text-[10px] font-semibold text-primary">W</span>
						</div>
					</div>
					<div className="flex items-center justify-between text-xs border-t border-border-subtle/20 pt-2">
						<span className="text-muted-foreground">
							{t("card.voltage", "Tensão")}
						</span>
						<span className="font-semibold text-foreground">127V</span>
					</div>
				</div>
			);
		}

		// 4. Smart TV (Now Playing + Controles de Mídia + Volume)
		if (isTv) {
			const hasMedia = isOnline && isAdbControllable && Boolean(media?.title);
			const volumeDisabled = !isOnline || !isAdbControllable;

			return (
				<div className="flex-1 flex flex-col justify-end gap-3 mt-3">
					<div className="flex items-center gap-3 bg-[#0e0e0f] rounded-lg p-2 border border-border-subtle/20">
						<div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
							<div className="w-full h-full bg-linear-to-tr from-indigo-950 to-zinc-800 flex items-center justify-center">
								<Disc3 className="w-5 h-5 text-zinc-300 opacity-60" />
							</div>
						</div>
						<div className="flex flex-col flex-1 min-w-0">
							<span className="text-xs font-semibold text-foreground truncate">
								{hasMedia
									? media?.title
									: t("card.noPlayback", "Sem Reprodução")}
							</span>
							<span className="text-[11px] text-muted-foreground truncate">
								{!isOnline
									? t("card.deviceOffline", "Dispositivo offline")
									: hasMedia
										? media?.artist
										: undefined}
							</span>
						</div>
						{/* Controles de transporte refletem o estado real (isPlaying) mas
						não disparam ação — play/pause/skip fica fora de escopo por ora. */}
						<div className="flex items-center gap-1 relative z-20">
							<button
								type="button"
								disabled
								className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40"
							>
								<SkipBack className="w-3.5 h-3.5" />
							</button>
							<button
								type="button"
								disabled
								className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
							>
								{isPlaying ? (
									<Pause className="w-4 h-4 fill-current" />
								) : (
									<Play className="w-4 h-4 fill-current ml-0.5" />
								)}
							</button>
							<button
								type="button"
								disabled
								className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40"
							>
								<SkipForward className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>

					<div className="flex items-center gap-2 relative z-20">
						<Volume2 className="w-4 h-4 text-muted-foreground" />
						<button
							type="button"
							disabled={volumeDisabled}
							aria-label={t("card.volume", "Volume")}
							className="relative z-20 block flex-1 h-1.5 rounded-full bg-[#0e0e0f] overflow-visible cursor-pointer group/slider disabled:cursor-not-allowed touch-none"
							onPointerDown={(e) => {
								e.stopPropagation();
								if (volumeDisabled) return;
								e.currentTarget.setPointerCapture(e.pointerId);
								setIsDraggingVolume(true);
								const rect = e.currentTarget.getBoundingClientRect();
								const pct = Math.round(
									((e.clientX - rect.left) / rect.width) * 100,
								);
								userDraggedVolumeRef.current = true;
								setLocalVolume(Math.max(0, Math.min(100, pct)));
							}}
							onPointerMove={(e) => {
								if (volumeDisabled || e.buttons !== 1) return;
								const rect = e.currentTarget.getBoundingClientRect();
								const pct = Math.round(
									((e.clientX - rect.left) / rect.width) * 100,
								);
								userDraggedVolumeRef.current = true;
								setLocalVolume(Math.max(0, Math.min(100, pct)));
							}}
							onPointerUp={(e) => {
								if (e.currentTarget.hasPointerCapture(e.pointerId)) {
									e.currentTarget.releasePointerCapture(e.pointerId);
								}
								setIsDraggingVolume(false);
							}}
						>
							<div
								className={`h-full bg-primary rounded-full relative ${isDraggingVolume ? "" : "transition-all"}`}
								style={{ width: `${volumeDisabled ? 0 : localVolume}%` }}
							>
								<div
									className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-foreground rounded-full shadow-sm transition-opacity ${
										isDraggingVolume
											? "opacity-100"
											: "opacity-0 group-hover/slider:opacity-100"
									}`}
								/>
							</div>
						</button>
					</div>
				</div>
			);
		}

		// 5. Ar-Condicionado (Temperatura + Botões + Modos)
		if (isAc) {
			return (
				<div className="flex-1 flex items-center justify-between mt-3">
					<div className="flex flex-col">
						<span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-0.5">
							{t("card.targetTemperature", "TEMPERATURA ALVO")}
						</span>
						<div className="flex items-start">
							<span className="text-3xl font-bold tracking-tight text-foreground">
								{temperature}
							</span>
							<span className="text-sm font-semibold text-cool mt-0.5 ml-0.5">
								°C
							</span>
						</div>
					</div>
					<div className="flex gap-2.5 relative z-20">
						<div className="flex flex-col gap-1.5">
							<button
								type="button"
								disabled={!isOnline}
								onClick={(e) => {
									e.stopPropagation();
									if (!isOnline) return;
									setTemperature((t) => Math.min(30, t + 1));
								}}
								className="w-9 h-9 rounded-full bg-[#0e0e0f] border border-border-subtle/30 flex items-center justify-center text-foreground hover:bg-[#3a3939] transition-colors disabled:cursor-not-allowed disabled:hover:bg-[#0e0e0f]"
							>
								<Plus className="w-4 h-4" />
							</button>
							<button
								type="button"
								disabled={!isOnline}
								onClick={(e) => {
									e.stopPropagation();
									if (!isOnline) return;
									setTemperature((t) => Math.max(16, t - 1));
								}}
								className="w-9 h-9 rounded-full bg-[#0e0e0f] border border-border-subtle/30 flex items-center justify-center text-foreground hover:bg-[#3a3939] transition-colors disabled:cursor-not-allowed disabled:hover:bg-[#0e0e0f]"
							>
								<Minus className="w-4 h-4" />
							</button>
						</div>
						<div className="flex flex-col gap-1.5">
							<button
								type="button"
								disabled={!isOnline}
								onClick={(e) => {
									e.stopPropagation();
									if (!isOnline) return;
									setClimateMode("cool");
								}}
								className={`w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed ${
									climateMode === "cool"
										? "bg-cool text-cool-foreground shadow-sm scale-105"
										: "bg-[#0e0e0f] border border-border-subtle/30 text-muted-foreground hover:bg-[#3a3939]"
								}`}
							>
								<Snowflake className="w-4 h-4" />
							</button>
							<button
								type="button"
								disabled={!isOnline}
								onClick={(e) => {
									e.stopPropagation();
									if (!isOnline) return;
									setClimateMode("fan");
								}}
								className={`w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed ${
									climateMode === "fan"
										? "bg-cool text-cool-foreground shadow-sm scale-105"
										: "bg-[#0e0e0f] border border-border-subtle/30 text-muted-foreground hover:bg-[#3a3939]"
								}`}
							>
								<Wind className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			);
		}

		// 6. Genérico / Outros
		return (
			<div className="flex items-center justify-between text-xs mt-auto pt-3 border-t border-border-subtle/20">
				<span className="text-muted-foreground">
					{t("card.state", "Estado")}
				</span>
				<span className="text-[10px] font-semibold tracking-wider text-muted-foreground px-2 py-0.5 bg-surface-container rounded-md">
					{isOn
						? t("common:status.on", "LIGADO")
						: t("common:status.off", "DESLIGADO")}
				</span>
			</div>
		);
	};

	return (
		<>
			<div
				className={`relative group rounded-xl p-4 flex flex-col justify-between min-h-43.75 transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
					isWide ? "col-span-1 md:col-span-2" : "col-span-1"
				} ${
					!isOnline
						? "bg-linear-to-br from-surface-low to-surface-low/70 opacity-50 grayscale-[0.4] hover:-translate-y-0"
						: isOn
							? "bg-linear-to-br from-surface-high to-[#232323] shadow-sm ring-1 ring-border-subtle/30"
							: "bg-linear-to-br from-surface-low to-surface-low/80"
				}`}
			>
				{/* Glow / Gradiente suave quando ativo */}
				{isOn && (
					<div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent pointer-events-none" />
				)}

				{/* Topo do Card (Split-Interaction) */}
				<div className="relative z-10 flex items-start justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						{/* Ícone Redondo que vira o Switch Real */}
						{showToggle ? (
							<button
								type="button"
								role="switch"
								aria-checked={isOn}
								aria-label={t("card.toggleAriaLabel", { name: device.name })}
								disabled={!isOnline || isToggling}
								onClick={handleToggle}
								className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
									!isOnline
										? "bg-surface-container border border-border-subtle/30 text-[#6e6e75] cursor-not-allowed"
										: isOn
											? isLight
												? "bg-warm text-warm-foreground shadow-[0_0_8px_rgba(211,196,184,0.2)] hover:scale-105"
												: isAc
													? "bg-cool text-cool-foreground shadow-[0_0_8px_rgba(196,198,210,0.2)] hover:scale-105"
													: "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(197,198,207,0.2)] hover:scale-105"
											: "bg-surface-container border border-border-subtle/30 text-muted-foreground hover:bg-surface-highest hover:text-foreground"
								}`}
							>
								<IconComponent className="w-6 h-6" />
							</button>
						) : (
							<div className="w-12 h-12 rounded-full bg-surface-container border border-border-subtle/30 flex items-center justify-center text-muted-foreground shrink-0">
								<IconComponent className="w-6 h-6" />
							</div>
						)}

						{/* Stretched Link (Nome abre telemetria) */}
						<div className="flex flex-col min-w-0">
							<button
								type="button"
								onClick={handleInspectTelemetry}
								className="text-left font-semibold text-foreground text-base leading-tight truncate hover:text-primary transition-colors before:absolute before:inset-0 focus:outline-none cursor-pointer"
							>
								{device.name}
							</button>
							<span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-1 truncate">
								{(device.roomId
									? device.room
									: t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])
								).toUpperCase()}{" "}
								•{" "}
								{isOnline
									? device.brand.toUpperCase()
									: t("common:status.offline", "OFFLINE")}
							</span>
						</div>
					</div>

					{/* Indicador "Reproduzindo"/"Offline" e Menu ⋮ */}
					<div className="relative z-20 flex items-center gap-1">
						{!isOnline ? (
							<div className="flex items-center gap-1.5 mr-1">
								<span className="h-1.5 w-1.5 rounded-full bg-alert-foreground shadow-[0_0_6px_rgba(255,180,171,0.5)]" />
								<span className="text-[9px] font-bold tracking-wider text-alert-foreground">
									{t("common:status.offline", "OFFLINE")}
								</span>
							</div>
						) : (
							isTv &&
							isPlaying && (
								<div className="flex items-center gap-1.5 mr-1">
									<span className="flex h-2 w-2 relative">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
									</span>
									<span className="text-[9px] font-bold tracking-wider text-primary">
										REPRODUZINDO
									</span>
								</div>
							)
						)}

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label={t("card.moreOptions")}
									className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-highest hover:text-foreground cursor-pointer outline-none"
								>
									<MoreVertical className="h-4 w-4" />
								</button>
							</DropdownMenuTrigger>

							<DropdownMenuContent
								align="end"
								className="w-36 border-border-subtle/40 bg-surface-container text-foreground shadow-xl z-50"
							>
								<DropdownMenuItem
									onClick={() => openEditModal(device)}
									className="cursor-pointer gap-2 text-xs text-muted-foreground focus:bg-surface-highest focus:text-foreground"
								>
									<Pencil className="h-3.5 w-3.5" />
									<span>{t("common:actions.edit")}</span>
								</DropdownMenuItem>

								<DropdownMenuItem
									onClick={() => setIsDeleteModalOpen(true)}
									className="cursor-pointer gap-2 text-xs text-alert-foreground focus:bg-alert/20 focus:text-[#ffdad6]"
								>
									<Trash2 className="h-3.5 w-3.5" />
									<span>{t("common:actions.delete")}</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Conteúdo Dinâmico do Card */}
				<div className="relative z-10">{renderCardBody()}</div>
			</div>

			<DeleteDeviceModal
				isOpen={isDeleteModalOpen}
				deviceName={device.name}
				onClose={() => setIsDeleteModalOpen(false)}
				isLoading={isDeleting}
				onConfirm={() => {
					deleteDevice(device.id, {
						onSuccess: () => setIsDeleteModalOpen(false),
					});
				}}
			/>

			<DeviceTelemetrySheet
				device={device}
				isOpen={isTelemetryModalOpen}
				onClose={() => setIsTelemetryModalOpen(false)}
			/>
		</>
	);
};
