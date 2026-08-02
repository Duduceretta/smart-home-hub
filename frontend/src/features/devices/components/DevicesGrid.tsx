import { Search } from "lucide-react";
import { useMemo } from "react";
import { useDevices } from "../hooks/useDevices";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceCard } from "./DeviceCard";

const EmptyState: React.FC<{ onReset: () => void }> = ({ onReset }) => (
	<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 py-16 text-center">
		<Search className="h-8 w-8 text-zinc-600" />
		<div>
			<p className="text-sm font-medium text-zinc-300">
				Nenhum dispositivo encontrado
			</p>
			<p className="mt-1 text-xs text-zinc-500">
				Ajuste a busca ou os filtros para ver seus dispositivos.
			</p>
		</div>
		<button
			type="button"
			onClick={onReset}
			className="mt-2 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 cursor-pointer"
		>
			Limpar filtros
		</button>
	</div>
);

export const DevicesGrid: React.FC = () => {
	const { data: devices = [], isLoading } = useDevices();
	const { query, activeTab, statusFilter, resetFilters } = useDevicesUIStore();

	const filteredDevices = useMemo(() => {
		return devices.filter((device) => {
			const matchesTab = activeTab === "Todos" || device.category === activeTab;
			const matchesStatus =
				!statusFilter ||
				(statusFilter === "online" && device.isOnline) ||
				(statusFilter === "offline" && !device.isOnline);
			const matchesQuery =
				query.trim() === "" ||
				[device.name, device.brand, device.room, device.category]
					.join(" ")
					.toLowerCase()
					.includes(query.trim().toLowerCase());

			return matchesTab && matchesStatus && matchesQuery;
		});
	}, [devices, activeTab, statusFilter, query]);

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
				{["sk-1", "sk-2", "sk-3", "sk-4"].map((sk) => (
					<div
						key={sk}
						className="h-48 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5"
					/>
				))}
			</div>
		);
	}

	if (filteredDevices.length === 0) {
		return <EmptyState onReset={resetFilters} />;
	}

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{filteredDevices.map((device) => (
				<DeviceCard key={device.id} device={device} />
			))}
		</div>
	);
};
