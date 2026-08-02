import type React from "react";
import { useDevices } from "../hooks/useDevices";

interface SummaryStatProps {
	label: string;
	value: number | string;
	tone?: "emerald" | "indigo" | "default";
	isLoading?: boolean;
}

const SummaryStat: React.FC<SummaryStatProps> = ({
	label,
	value,
	tone = "default",
	isLoading,
}) => {
	const toneClass =
		tone === "emerald"
			? "text-emerald-400"
			: tone === "indigo"
				? "text-indigo-400"
				: "text-zinc-100";

	return (
		<div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3">
			{isLoading ? (
				<div className="h-8 w-12 animate-pulse rounded bg-zinc-800" />
			) : (
				<p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>
					{value}
				</p>
			)}
			<p className="mt-0.5 text-xs text-zinc-500">{label}</p>
		</div>
	);
};

export const DevicesMetrics: React.FC = () => {
	const { data: devices = [], isLoading } = useDevices();

	const onlineCount = devices.filter((d) => d.isOnline).length;
	const activeCount = devices.filter((d) => d.isOn).length;

	return (
		<div className="grid grid-cols-3 gap-3 sm:max-w-md">
			<SummaryStat
				label="Dispositivos"
				value={devices.length}
				isLoading={isLoading}
			/>
			<SummaryStat
				label="Online"
				value={onlineCount}
				tone="emerald"
				isLoading={isLoading}
			/>
			<SummaryStat
				label="Ativos"
				value={activeCount}
				tone="indigo"
				isLoading={isLoading}
			/>
		</div>
	);
};
