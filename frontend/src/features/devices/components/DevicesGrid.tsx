import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useDevices } from "../hooks/useDevices";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceCard } from "./DeviceCard";

const EmptyState: React.FC<{ onReset: () => void }> = ({ onReset }) => {
	const { t } = useTranslation("devices");

	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
				<Search className="h-5 w-5 text-zinc-400" />
			</div>
			<div>
				<p className="text-sm font-semibold text-zinc-200">
					{t("grid.emptyTitle")}
				</p>
				<p className="mt-1 text-xs text-zinc-400">{t("grid.emptySubtitle")}</p>
			</div>
			<button
				type="button"
				onClick={onReset}
				className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 cursor-pointer"
			>
				{t("grid.clearFilters")}
			</button>
		</div>
	);
};

const GridSkeleton: React.FC = () => (
	<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
		{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7", "sk-8"].map(
			(sk) => (
				<div
					key={sk}
					className="flex h-45 flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4"
				>
					<div className="flex justify-between items-start">
						<div className="h-10 w-10 rounded-full bg-zinc-800/80" />
						<div className="h-5 w-16 rounded-md bg-zinc-800/80" />
					</div>
					<div className="space-y-2">
						<div className="h-4 w-3/4 rounded bg-zinc-800/80" />
						<div className="h-3 w-1/2 rounded bg-zinc-800/60" />
					</div>
					<div className="flex justify-between items-center pt-2 border-t border-zinc-800/40">
						<div className="h-3 w-20 rounded bg-zinc-800/60" />
						<div className="h-5 w-9 rounded-full bg-zinc-800/80" />
					</div>
				</div>
			),
		)}
	</div>
);

export const DevicesGrid: React.FC = () => {
	const { query, activeTab, statusFilter, resetFilters } = useDevicesUIStore();
	const debouncedQuery = useDebouncedValue(query, 300);

	const { data: devices = [], isLoading } = useDevices({
		query: debouncedQuery,
		category: activeTab,
		status: statusFilter,
	});

	if (isLoading) {
		return <GridSkeleton />;
	}

	if (devices.length === 0) {
		return <EmptyState onReset={resetFilters} />;
	}

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max">
			{devices.map((device) => (
				<DeviceCard key={device.id} device={device} />
			))}
		</div>
	);
};
