import { AlertTriangle, Cpu, Lightbulb, Snowflake, Zap } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDevices } from "../hooks/useDevices";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceTypeEnum } from "../types/devices.types";

export const DevicesGlanceBar: React.FC = () => {
	const { t } = useTranslation("devices");
	const { data, isLoading } = useDevices({ pageSize: 200 });
	const devices = data?.items ?? [];

	const {
		onlyOn,
		toggleOnlyOn,
		activeTab,
		setActiveTab,
		statusFilter,
		setStatusFilter,
	} = useDevicesUIStore();

	// Computa métricas reais baseadas na lista de dispositivos
	const metrics = useMemo(() => {
		const total = devices.length;
		const lightsOnCount = devices.filter(
			(d) => d.category === "Iluminação" && d.isOn && d.isOnline,
		).length;
		const activeCount = devices.filter((d) => d.isOn && d.isOnline).length;
		const offlineCount = devices.filter((d) => !d.isOnline).length;
		const climateCount = devices.filter(
			(d) => d.type === DeviceTypeEnum.Thermostat,
		).length;

		// Estimativa de consumo agregado para dispositivos ligados (ex: tomadas/geral ~120W cada)
		const estimatedWatts = activeCount * 120;

		return {
			total,
			lightsOnCount,
			activeCount,
			estimatedWatts,
			offlineCount,
			climateCount,
		};
	}, [devices]);

	if (isLoading) {
		return (
			<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
				{["sk-1", "sk-2", "sk-3", "sk-4"].map((sk) => (
					<div
						key={sk}
						className="h-10 w-36 shrink-0 animate-pulse rounded-full bg-surface-highest/60"
					/>
				))}
			</div>
		);
	}

	const isLightsFilterActive = activeTab === "Iluminação" && onlyOn;
	const isOfflineFilterActive = statusFilter === "offline";

	return (
		<section
			aria-label={t("glanceBar.ariaLabel")}
			className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
		>
			{/* 1. Chip Fixo / Informativo: Total */}
			<div className="flex shrink-0 snap-start items-center gap-2 rounded-full bg-linear-to-b from-surface-highest to-[#2e2e2f] px-4 py-2 text-sm font-medium text-foreground shadow-sm">
				<Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
				<span>{t("glanceBar.total", { count: metrics.total })}</span>
			</div>

			{/* 2. Chip Interativo: Luzes Acesas */}
			<button
				type="button"
				aria-pressed={isLightsFilterActive}
				onClick={() => {
					if (isLightsFilterActive) {
						setActiveTab("Todos");
						if (onlyOn) toggleOnlyOn();
					} else {
						setActiveTab("Iluminação");
						if (!onlyOn) toggleOnlyOn();
					}
				}}
				className={`flex shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all shadow-sm ${
					isLightsFilterActive
						? "bg-warm/20 text-warm ring-1 ring-warm/50"
						: "bg-linear-to-b from-surface-highest to-[#2e2e2f] text-foreground hover:from-[#3a3939] hover:to-[#333333]"
				}`}
			>
				<Lightbulb
					className={`h-4 w-4 ${
						isLightsFilterActive ? "text-warm fill-current" : "text-warm"
					}`}
					aria-hidden="true"
				/>
				<span>{t("glanceBar.lightsOn", { count: metrics.lightsOnCount })}</span>
			</button>

			{/* 3. Chip Interativo: Consumo Ativo */}
			<button
				type="button"
				aria-pressed={onlyOn && activeTab === "Todos"}
				onClick={toggleOnlyOn}
				className={`flex shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all shadow-sm ${
					onlyOn && activeTab === "Todos"
						? "bg-primary/20 text-primary ring-1 ring-primary/50"
						: "bg-linear-to-b from-surface-highest to-[#2e2e2f] text-foreground hover:from-[#3a3939] hover:to-[#333333]"
				}`}
			>
				<Zap
					className={`h-4 w-4 ${
						onlyOn && activeTab === "Todos"
							? "text-primary fill-current"
							: "text-primary"
					}`}
					aria-hidden="true"
				/>
				<span>
					{t("glanceBar.consumption", { watts: metrics.estimatedWatts })}
				</span>
			</button>

			{/* 4. Chip Informativo: Clima */}
			<div className="flex shrink-0 snap-start items-center gap-2 rounded-full bg-linear-to-b from-surface-highest to-[#2e2e2f] px-4 py-2 text-sm font-medium text-foreground shadow-sm">
				<Snowflake className="h-4 w-4 text-cool" aria-hidden="true" />
				<span>{t("glanceBar.climate", { count: metrics.climateCount })}</span>
			</div>

			{/* 5. Chip Interativo: Dispositivos Offline (Aparece se houver offline) */}
			{metrics.offlineCount > 0 && (
				<button
					type="button"
					aria-pressed={isOfflineFilterActive}
					onClick={() =>
						setStatusFilter(isOfflineFilterActive ? null : "offline")
					}
					className={`flex shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all shadow-sm ${
						isOfflineFilterActive
							? "bg-alert/30 text-alert-foreground border-alert-foreground/60 ring-1 ring-alert-foreground/40"
							: "bg-alert/20 border-alert/50 text-alert-foreground hover:bg-alert/30"
					}`}
				>
					<AlertTriangle
						className={`h-4 w-4 ${
							isOfflineFilterActive
								? "text-alert-foreground"
								: "text-alert-foreground"
						}`}
						aria-hidden="true"
					/>
					<span>{t("glanceBar.offline", { count: metrics.offlineCount })}</span>
				</button>
			)}
		</section>
	);
};
