import {
	Activity,
	ChevronRight,
	MoreVertical,
	SlidersHorizontal,
	Trash2,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeleteDeviceModal } from "@/core/components/modals/DeleteDeviceModal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { DEVICE_CONFIG } from "../constants/devices.constants";
import { useDeleteDevice } from "../hooks/useDeleteDevice";
import { useToggleDevice } from "../hooks/useToggleDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	isActuatorDevice,
} from "../types/devices.types";

function formatLastActivity(minutes: number): string {
	if (minutes < 1) return "agora";
	if (minutes < 60) return `há ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours}h`;
	return `há ${Math.floor(hours / 24)}d`;
}

interface DeviceCardProps {
	device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();
	const openEditSheet = useDevicesUIStore((s) => s.openEditSheet);

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const IconComponent = config.icon;
	const showToggle = isActuatorDevice(device.type);

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!device.isOnline || isToggling) return;
		toggleDevice(device.id);
	};

	const handleInspectTelemetry = () => {
		toast.info(`Abrindo telemetrias em tempo real para: ${device.name}`);
	};

	return (
		<>
			{/* 1. Card principal: Apenas um container visual (relative) */}
			<div
				className={`group relative flex w-full flex-col justify-between rounded-xl border p-5 text-left font-normal backdrop-blur-sm transition-all select-none ${
					!device.isOnline
						? "border-zinc-800/60 bg-zinc-900/20 opacity-60"
						: device.isOn
							? "border-indigo-500/80 bg-zinc-900/50 shadow-[0_0_20px_rgba(99,102,241,0.05)] hover:border-indigo-400"
							: "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60"
				}`}
			>
				<div>
					<div className="flex items-start justify-between">
						{/* Ícone Redondo */}
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bg} ${config.text} transition-transform group-hover:scale-110`}
						>
							<IconComponent className="h-5 w-5" />
						</div>

						{/* Status + Menu de Contexto (relative z-10 para ficar ACIMA do clique do card) */}
						<div className="relative z-10 flex items-center gap-1.5">
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

							{/* 🚀 DROPDOWN SEM DIV ESTÁTICA EM VOLTA */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										aria-label="Mais opções do dispositivo"
										className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
									>
										<MoreVertical className="h-3.5 w-3.5" />
									</button>
								</DropdownMenuTrigger>

								<DropdownMenuContent
									align="end"
									className="w-36 border-zinc-800 bg-zinc-900 text-zinc-200 shadow-xl z-50"
								>
									<DropdownMenuItem
										onClick={() => openEditSheet(device)}
										className="cursor-pointer gap-2 text-xs focus:bg-zinc-800 focus:text-white"
									>
										<SlidersHorizontal className="h-3.5 w-3.5" />
										Configurar
									</DropdownMenuItem>

									<DropdownMenuItem
										onClick={() => setIsDeleteModalOpen(true)}
										className="cursor-pointer gap-2 text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400"
									>
										<Trash2 className="h-3.5 w-3.5" />
										Excluir
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{/* Nome, Cômodo e Setinha */}
					<div className="mt-4">
						<div className="flex items-center justify-between">
							{/* 🚀 BOTÃO INVISÍVEL COM STRETCHED LINK (before:absolute before:inset-0) */}
							<button
								type="button"
								onClick={handleInspectTelemetry}
								className="truncate font-semibold text-zinc-50 group-hover:text-indigo-300 transition-colors text-left before:absolute before:inset-0 before:z-0 focus:outline-none cursor-pointer"
							>
								{device.name}
							</button>

							<ChevronRight className="h-4 w-4 text-zinc-500 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
						</div>

						<p className="mt-0.5 truncate text-xs text-zinc-400">
							{device.brand} • {device.room ?? "Sem cômodo"}
						</p>
						<div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
							<Activity className="h-3 w-3 text-zinc-600" />
							<span>
								Ativo {formatLastActivity(device.lastActivityMinutes || 0)}
							</span>
						</div>
					</div>
				</div>

				{/* Rodapé do Card (relative z-10 para o Switch ficar clicável acima do card) */}
				<div className="relative z-10 mt-6 flex items-center justify-between border-t border-zinc-800/60 pt-3 w-full">
					<span className="font-mono text-[11px] text-zinc-500">
						ID: {device.externalId}
					</span>

					{showToggle ? (
						<button
							type="button"
							disabled={!device.isOnline || isToggling}
							onClick={handleToggle}
							role="switch"
							aria-checked={device.isOn}
							aria-label={`Alternar estado de ${device.name}`}
							className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed ${
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
			</div>

			<DeleteDeviceModal
				isOpen={isDeleteModalOpen}
				deviceName={device.name}
				onClose={() => setIsDeleteModalOpen(false)}
				isLoading={isDeleting}
				onConfirm={() => {
					deleteDevice(device.id, {
						onSuccess: () => setIsDeleteModalOpen(false),
					});
				}}
			/>
		</>
	);
};
