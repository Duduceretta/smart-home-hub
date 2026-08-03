import { Cpu, ShieldAlert, Wifi, Zap } from "lucide-react";
import type React from "react";
import { useDevices } from "../hooks/useDevices";

interface SummaryStatProps {
	label: string;
	value: number | string;
	unit?: string;
	icon: React.ReactNode;
	isLoading?: boolean;
}

const SummaryStat: React.FC<SummaryStatProps> = ({
	label,
	value,
	unit,
	icon,
	isLoading,
}) => {
	return (
		<div className="rounded-xl border border-zinc-800/80 bg-[#18181b] p-4 flex flex-col gap-2 shadow-sm">
			<div className="flex items-center gap-2 text-zinc-400">
				{icon}
				<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
					{label}
				</span>
			</div>

			{isLoading ? (
				<div className="h-8 w-16 animate-pulse rounded bg-zinc-800 my-0.5" />
			) : (
				<div className="text-2xl font-bold tracking-tight text-zinc-50 flex items-baseline gap-1 tabular-nums">
					{value}
					{unit && (
						<span className="text-xs font-normal text-zinc-400">{unit}</span>
					)}
				</div>
			)}
		</div>
	);
};

export const DevicesMetrics: React.FC = () => {
	const { data: devices = [], isLoading } = useDevices();

	const totalCount = devices.length;
	const onlineCount = devices.filter((d) => d.isOnline).length;
	const activeCount = devices.filter((d) => d.isOn).length;

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
			<SummaryStat
				label="Total Dispositivos"
				value={totalCount}
				icon={<Cpu className="w-4 h-4 text-zinc-400" />}
				isLoading={isLoading}
			/>

			<SummaryStat
				label="Online"
				value={onlineCount}
				icon={<Wifi className="w-4 h-4 text-emerald-400" />}
				isLoading={isLoading}
			/>

			<SummaryStat
				label="Dispositivos Ativos"
				value={activeCount}
				icon={<Zap className="w-4 h-4 text-amber-400" />}
				isLoading={isLoading}
			/>

			<SummaryStat
				label="Alertas de Segurança"
				value={0}
				icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
				isLoading={isLoading}
			/>
		</div>
	);
};
