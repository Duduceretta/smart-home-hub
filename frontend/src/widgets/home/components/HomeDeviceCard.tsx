import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DEVICE_CONFIG } from "@/core/constants/device-config";
import { cn } from "@/core/utils";
import { useToggleDevice } from "@/features/devices/hooks/useToggleDevice";
import {
	type Device,
	DeviceTypeEnum,
	isActuatorDevice,
} from "@/features/devices/types/devices.types";

interface HomeDeviceCardProps {
	device: Device;
}

/**
 * Card de dispositivo otimizado para Mobile-First (padrão Google Home / Apple Home).
 * Exibe ícone tátil, nome, ambiente, estado dinâmico e ação rápida embutida (toggle instantâneo).
 *
 * Toque no card (fora da área do switch):
 * TODO(device-detail): Não existe rota dedicada de detalhe individual (/devices/:id) ainda.
 * O Dashboard é utilizado como fallback funcional direto (mostra o dispositivo no contexto do cômodo).
 */
export function HomeDeviceCard({ device }: HomeDeviceCardProps) {
	const { t } = useTranslation(["devices", "common", "home"]);
	const navigate = useNavigate();
	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const IconComponent = config.icon;
	const isActuator = isActuatorDevice(device.type);
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isOnline || isToggling) return;
		toggleDevice(device.id);
	};

	const handleCardClick = () => {
		// TODO(device-detail): Navegar para `/devices/${device.id}` quando a tela de detalhe for implementada.
		navigate("/dashboard");
	};

	const handleCardKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			// Evita ativar navegação se o foco estiver dentro do toggle switch
			if ((e.target as HTMLElement).getAttribute("role") === "switch") {
				return;
			}
			e.preventDefault();
			handleCardClick();
		}
	};

	// Formatação do rótulo de estado contextualizado
	const getStateLabel = () => {
		if (!isOnline) {
			return t("common:status.offline", "OFFLINE");
		}

		if (device.type === DeviceTypeEnum.Light && isOn) {
			return device.brightness !== null && device.brightness !== undefined
				? `LIGADO • ${device.brightness}%`
				: t("common:status.on", "LIGADO");
		}

		if (device.type === DeviceTypeEnum.Lock) {
			return isOn ? "TRANCADO" : "DESTRANCADO";
		}

		if (device.type === DeviceTypeEnum.Alarm) {
			return isOn ? "ARMADO" : "DESARMADO";
		}

		if (device.type === DeviceTypeEnum.Thermostat) {
			return isOn ? "ATIVO" : t("common:status.off", "DESLIGADO");
		}

		if (device.type === DeviceTypeEnum.Sensor) {
			return "MONITORANDO";
		}

		if (device.type === DeviceTypeEnum.Camera) {
			return "AO VIVO";
		}

		return isOn
			? t("common:status.on", "LIGADO")
			: t("common:status.off", "DESLIGADO");
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: O card é clicável como um todo, mas encapsula um <button role="switch"> nativo para toggle rápido sem conflito de nesting.
		<div
			role="button"
			tabIndex={0}
			onClick={handleCardClick}
			onKeyDown={handleCardKeyDown}
			className={cn(
				"group relative flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:p-4 text-left transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
				!isOnline
					? "border-border-subtle/50 bg-surface-low/60 opacity-60 grayscale-[0.3]"
					: isOn
						? "border-border-subtle/80 bg-surface-high shadow-2xs hover:border-border"
						: "border-border-subtle bg-surface-container hover:border-border hover:bg-surface-high/60",
			)}
		>
			{/* Topo do Card: Ícone e Ação Rápida */}
			<div className="flex items-start justify-between gap-2">
				<div
					className={cn(
						"flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-colors",
						!isOnline
							? "bg-surface-low text-muted-foreground"
							: isOn
								? "bg-primary/20 text-primary border border-primary/30 shadow-xs"
								: "bg-surface-low text-muted-foreground border border-border-subtle",
					)}
				>
					<IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
				</div>

				{/* Ação rápida embutida (toggle switch para atuadores com target tátil de 44px) */}
				{isActuator ? (
					<div className="flex items-center -m-2 p-2">
						<button
							type="button"
							role="switch"
							aria-checked={isOn}
							aria-label={t("devices:card.toggleAriaLabel", {
								name: device.name,
							})}
							disabled={!isOnline || isToggling}
							onClick={handleToggle}
							className={cn(
								"relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
								isOn
									? "bg-primary"
									: "bg-surface-low border border-border-subtle",
							)}
						>
							<span
								className={cn(
									"pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-xs transition-transform duration-200 ease-in-out",
									isOn ? "translate-x-5.5" : "translate-x-0.5",
								)}
							/>
						</button>
					</div>
				) : (
					<span
						className={cn(
							"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wider uppercase",
							isOnline
								? "bg-primary/10 text-primary border border-primary/20"
								: "bg-surface-low text-muted-foreground border border-border-subtle",
						)}
					>
						{isOnline ? "Ativo" : "Off"}
					</span>
				)}
			</div>

			{/* Miolo do Card: Nome e Ambiente */}
			<div className="flex min-w-0 flex-col gap-0.5 mt-1">
				<span className="truncate text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
					{device.name}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{device.roomId
						? device.room
						: t("common:status.unassigned", "Sem ambiente")}
				</span>
			</div>

			{/* Rodapé do Card: Rótulo de Estado em Destaque */}
			<div className="flex items-center justify-between pt-1 border-t border-border-subtle/40">
				<span
					className={cn(
						"text-xs font-semibold tracking-wider uppercase truncate",
						!isOnline
							? "text-muted-foreground"
							: isOn
								? "text-primary"
								: "text-muted-foreground",
					)}
				>
					{getStateLabel()}
				</span>
			</div>
		</div>
	);
}
