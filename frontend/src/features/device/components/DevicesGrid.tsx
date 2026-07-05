import {
	Activity,
	Camera as CameraIcon,
	ChevronRight,
	Lightbulb,
	Lock,
	MoreVertical,
	Power,
	Radar,
	Search,
	Siren,
	SlidersHorizontal,
	Thermometer,
	Wifi,
	WifiOff,
} from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { useDevices } from "../hooks/useDevices";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	isActuatorDevice,
} from "../types/devices.types";

type DeviceIconConfig = {
	icon: ComponentType<{ className?: string }>;
	bg: string;
	text: string;
};

const DEVICE_CONFIG: Record<DeviceTypeEnum, DeviceIconConfig> = {
	[DeviceTypeEnum.Light]: {
		icon: Lightbulb,
		bg: "bg-yellow-500/10",
		text: "text-yellow-400",
	},
	[DeviceTypeEnum.Switch]: {
		icon: Power,
		bg: "bg-indigo-500/10",
		text: "text-indigo-400",
	},
	[DeviceTypeEnum.Sensor]: {
		icon: Radar,
		bg: "bg-purple-500/10",
		text: "text-purple-400",
	},
	[DeviceTypeEnum.Thermostat]: {
		icon: Thermometer,
		bg: "bg-blue-500/10",
		text: "text-blue-400",
	},
	[DeviceTypeEnum.Camera]: {
		icon: CameraIcon,
		bg: "bg-slate-500/10",
		text: "text-slate-300",
	},
	[DeviceTypeEnum.Lock]: {
		icon: Lock,
		bg: "bg-red-500/10",
		text: "text-red-400",
	},
	[DeviceTypeEnum.Alarm]: {
		icon: Siren,
		bg: "bg-orange-500/10",
		text: "text-orange-400",
	},
};

function formatLastActivity(minutes: number): string {
	if (minutes < 1) return "agora";
	if (minutes < 60) return `há ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours}h`;
	return `há ${Math.floor(hours / 24)}d`;
}

const DeviceCard: React.FC<{
	device: Device;
	onToggle: (id: string, e: React.MouseEvent) => void;
	onInspect: (device: Device) => void;
}> = ({ device, onToggle, onInspect }) => {
	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const IconComponent = config.icon;
	const [menuOpen, setMenuOpen] = useState(false);
	const showToggle = isActuatorDevice(device.type);

	return (
		<button
			type="button"
			onClick={() => onInspect(device)}
			className={`group relative flex w-full flex-col justify-between rounded-xl border p-5 text-left font-normal backdrop-blur-sm transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
				!device.isOnline
					? "border-zinc-800/60 bg-zinc-900/20 opacity-60"
					: device.isOn
						? "border-indigo-500/80 bg-zinc-900/50 shadow-[0_0_20px_rgba(99,102,241,0.05)] hover:border-indigo-400"
						: "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
			}`}
		>
			<div>
				<div className="flex items-start justify-between">
					<div
						className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bg} ${config.text} transition-transform group-hover:scale-110`}
					>
						<IconComponent className="h-5 w-5" />
					</div>

					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1">
							{device.isOnline ? (
								<Wifi className="h-3 w-3 text-emerald-400" />
							) : (
								<WifiOff className="h-3 w-3 text-zinc-500" />
							)}
							<span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
								{device.isOnline ? "Online" : "Offline"}
							</span>
						</div>

						<div className="relative">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setMenuOpen((v) => !v);
								}}
								aria-label="Mais opções"
								aria-expanded={menuOpen}
								className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
							>
								<MoreVertical className="h-3.5 w-3.5" />
							</button>

							{menuOpen && (
								<div className="absolute right-0 top-7 z-10 w-36 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl animate-fade-in">
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setMenuOpen(false);
										}}
										className="flex w-full items-center px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
									>
										<SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
										Configurar
									</button>
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="mt-4">
					<div className="flex items-center justify-between">
						<h3 className="truncate font-semibold text-zinc-50 group-hover:text-indigo-300 transition-colors">
							{device.name}
						</h3>
						<ChevronRight className="h-4 w-4 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
					</div>
					<p className="mt-0.5 truncate text-xs text-zinc-400">
						{device.brand} • {device.room}
					</p>
					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
						<Activity className="h-3 w-3 text-zinc-600" />
						<span>
							Ativo {formatLastActivity(device.lastActivityMinutes || 0)}
						</span>
					</div>
				</div>
			</div>

			<div className="mt-6 flex items-center justify-between border-t border-zinc-800/60 pt-3 w-full">
				<span className="font-mono text-[11px] text-zinc-500">
					ID: {device.externalId}
				</span>

				{showToggle ? (
					<button
						type="button"
						disabled={!device.isOnline}
						onClick={(e) => onToggle(device.id, e)}
						role="switch"
						aria-checked={device.isOn}
						aria-label={`Alternar ${device.name}`}
						className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed ${
							device.isOn ? "bg-indigo-600" : "bg-zinc-800"
						}`}
					>
						<span
							className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
								device.isOn ? "translate-x-4" : "translate-x-0"
							}`}
						/>
					</button>
				) : (
					<span className="text-[10px] uppercase tracking-wider text-zinc-600">
						Somente leitura
					</span>
				)}
			</div>
		</button>
	);
};

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

	const handleToggleDevice = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		console.log("Toggle disparado para ID:", id);
	};

	const handleInspectDevice = (device: Device) => {
		console.log("Inspecionando dispositivo:", device.name);
	};

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
				<DeviceCard
					key={device.id}
					device={device}
					onToggle={handleToggleDevice}
					onInspect={handleInspectDevice}
				/>
			))}
		</div>
	);
};
