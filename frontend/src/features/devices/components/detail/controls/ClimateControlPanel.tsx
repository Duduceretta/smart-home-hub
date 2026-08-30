import { Minus, Plus, Snowflake, Wind } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToggleDevice } from "../../../hooks/useToggleDevice";
import type { DeviceControlPanelProps } from "./device-control-panel.types";

/**
 * Controles de Climatização — temperatura alvo (mock local, sem
 * persistência: não existe endpoint de temperatura-alvo no back-end hoje) +
 * seletor de modo + toggle. Migrado do bloco `isAc` de `DeviceCard.tsx`
 * (removido), não duplicado.
 */
export function ClimateControlPanel({ device }: DeviceControlPanelProps) {
	const { t } = useTranslation("devices");
	const [temperature, setTemperature] = useState(22);
	const [climateMode, setClimateMode] = useState<"cool" | "fan">("cool");

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
								? "bg-cool text-cool-foreground shadow-[0_0_8px_rgba(196,198,210,0.2)] hover:scale-105"
								: "bg-surface-high border border-border-subtle text-muted-foreground hover:bg-surface-highest hover:text-foreground"
					}`}
				>
					<Snowflake className="h-6 w-6" />
				</button>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<span className="mb-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("controls.targetTemperature", "Temperatura Alvo")}
					</span>
					<div className="flex items-start">
						<span className="text-3xl font-semibold tracking-tight text-foreground">
							{temperature}
						</span>
						<span className="ml-0.5 mt-0.5 text-sm font-semibold text-cool">
							°C
						</span>
					</div>
				</div>
				<div className="flex gap-2">
					<div className="flex flex-col gap-2">
						<button
							type="button"
							disabled={!isOnline}
							onClick={() => setTemperature((t) => Math.min(30, t + 1))}
							className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-low text-foreground transition-colors hover:bg-surface-highest disabled:cursor-not-allowed disabled:hover:bg-surface-low"
						>
							<Plus className="h-4 w-4" />
						</button>
						<button
							type="button"
							disabled={!isOnline}
							onClick={() => setTemperature((t) => Math.max(16, t - 1))}
							className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-low text-foreground transition-colors hover:bg-surface-highest disabled:cursor-not-allowed disabled:hover:bg-surface-low"
						>
							<Minus className="h-4 w-4" />
						</button>
					</div>
					<div className="flex flex-col gap-2">
						<button
							type="button"
							disabled={!isOnline}
							onClick={() => setClimateMode("cool")}
							className={`flex h-9 w-9 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed ${
								climateMode === "cool"
									? "bg-cool text-cool-foreground shadow-sm scale-105"
									: "border border-border-subtle bg-surface-low text-muted-foreground hover:bg-surface-highest"
							}`}
						>
							<Snowflake className="h-4 w-4" />
						</button>
						<button
							type="button"
							disabled={!isOnline}
							onClick={() => setClimateMode("fan")}
							className={`flex h-9 w-9 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed ${
								climateMode === "fan"
									? "bg-cool text-cool-foreground shadow-sm scale-105"
									: "border border-border-subtle bg-surface-low text-muted-foreground hover:bg-surface-highest"
							}`}
						>
							<Wind className="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
