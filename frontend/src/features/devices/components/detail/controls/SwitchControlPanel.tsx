import { Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToggleDevice } from "../../../hooks/useToggleDevice";
import type { DeviceControlPanelProps } from "./device-control-panel.types";

/**
 * Controles de Tomada/Interruptor — toggle + KPI de consumo atual (mock
 * local, sem persistência: não existe endpoint de leitura instantânea de
 * consumo no back-end hoje, mesmo valor mockado que já existia em
 * `DeviceCard.tsx`). Migrado do bloco `isSocket` (removido), não duplicado.
 */
export function SwitchControlPanel({ device }: DeviceControlPanelProps) {
	const { t } = useTranslation("devices");
	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();

	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-container p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("controls.title", "Controles")}
				</h3>
				<button
					type="button"
					role="switch"
					aria-checked={isOn}
					aria-label={t("card.toggleAriaLabel", { name: device.name })}
					disabled={!isOnline || isToggling}
					onClick={() => toggleDevice(device.id)}
					className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all cursor-pointer disabled:cursor-not-allowed ${
						!isOnline
							? "bg-surface-high border border-border-subtle text-muted-foreground/50"
							: isOn
								? "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(197,198,207,0.2)] hover:scale-105"
								: "bg-surface-high border border-border-subtle text-muted-foreground hover:bg-surface-highest hover:text-foreground"
					}`}
				>
					<Power className="h-6 w-6" />
				</button>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-1 rounded-lg border border-border-subtle/20 bg-surface-high p-4">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("controls.powerUsage", "Consumo")}
					</span>
					<div className="flex items-baseline gap-1">
						<span className="text-2xl font-semibold text-primary">
							{isOn ? 120 : 0}
						</span>
						<span className="text-xs font-medium text-primary">W</span>
					</div>
				</div>
				<div className="flex flex-col gap-1 rounded-lg border border-border-subtle/20 bg-surface-high p-4">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("controls.voltage", "Tensão")}
					</span>
					<div className="flex items-baseline gap-1">
						<span className="text-2xl font-semibold text-foreground">127</span>
						<span className="text-xs font-medium text-muted-foreground">V</span>
					</div>
				</div>
			</div>
		</div>
	);
}
