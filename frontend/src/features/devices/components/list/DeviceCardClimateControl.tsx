import { Minus, Plus, Snowflake, Wind } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Device } from "@/features/devices/types/devices.types";

interface DeviceCardClimateControlProps {
	device: Device;
}

export function DeviceCardClimateControl({
	device: _device,
}: DeviceCardClimateControlProps) {
	const { t } = useTranslation("devices");

	// Valores de exibição fixos para pré-visualização (mock/em breve).
	const temperature = 22;
	const climateMode: string = "cool";

	return (
		<div className="flex-1 flex items-center justify-between mt-3">
			<div className="flex flex-col">
				<span className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-0.5">
					{t("card.targetTemperature", "TEMPERATURA ALVO")}
					<span className="ml-1.5 rounded bg-surface-container px-1.5 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase border border-border-subtle/50">
						{t("card.mockNotice", "Em breve")}
					</span>
				</span>
				<div className="flex items-start">
					<span className="text-3xl font-semibold tracking-tight text-foreground">
						{temperature}
					</span>
					<span className="text-sm font-semibold text-cool mt-0.5 ml-0.5">
						°C
					</span>
				</div>
			</div>
			<div className="flex gap-2 relative z-20">
				<div className="flex flex-col gap-2">
					<button
						type="button"
						disabled
						aria-disabled="true"
						title={t("card.featureComingSoon", "Controle funcional em breve")}
						className="w-9 h-9 rounded-full bg-surface-low border border-border-subtle flex items-center justify-center text-foreground opacity-50 cursor-not-allowed"
					>
						<Plus className="w-4 h-4" />
					</button>
					<button
						type="button"
						disabled
						aria-disabled="true"
						title={t("card.featureComingSoon", "Controle funcional em breve")}
						className="w-9 h-9 rounded-full bg-surface-low border border-border-subtle flex items-center justify-center text-foreground opacity-50 cursor-not-allowed"
					>
						<Minus className="w-4 h-4" />
					</button>
				</div>
				<div className="flex flex-col gap-2">
					<button
						type="button"
						disabled
						aria-disabled="true"
						title={t("card.featureComingSoon", "Controle funcional em breve")}
						className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-not-allowed opacity-50 ${
							climateMode === "cool"
								? "bg-cool text-cool-foreground shadow-sm"
								: "bg-surface-low border border-border-subtle text-muted-foreground"
						}`}
					>
						<Snowflake className="w-4 h-4" />
					</button>
					<button
						type="button"
						disabled
						aria-disabled="true"
						title={t("card.featureComingSoon", "Controle funcional em breve")}
						className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-not-allowed opacity-50 ${
							climateMode === "fan"
								? "bg-cool text-cool-foreground shadow-sm"
								: "bg-surface-low border border-border-subtle text-muted-foreground"
						}`}
					>
						<Wind className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
