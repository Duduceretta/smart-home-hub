import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { GROUP_ICON_MAP } from "../constants/device-groups.constants";
import { useDeleteDeviceGroup } from "../hooks/useDeleteDeviceGroup";
import { useDeviceGroupsUIStore } from "../store/device-groups-ui.store";
import type { DeviceGroup } from "../types/device-groups.types";

interface DeviceGroupCardProps {
	group: DeviceGroup;
}

const MAX_VISIBLE_DEVICE_CHIPS = 4;

export const DeviceGroupCard: React.FC<DeviceGroupCardProps> = ({
	group,
}) => {
	const openEditSheet = useDeviceGroupsUIStore((state) => state.openEditSheet);
	const { mutate: deleteGroup, isPending } = useDeleteDeviceGroup();

	const IconComponent = GROUP_ICON_MAP[group.icon || ""] || GROUP_ICON_MAP.default;
	const visibleDevices = group.devices.slice(0, MAX_VISIBLE_DEVICE_CHIPS);
	const overflowCount = group.devices.length - visibleDevices.length;

	const handleDelete = () => {
		if (
			confirm(
				`Tem certeza que deseja excluir o grupo "${group.name}"? Os dispositivos não serão apagados, apenas desvinculados.`,
			)
		) {
			deleteGroup(group.id);
		}
	};

	return (
		<div className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5">
			{/* Glow Decorativo de Fundo */}
			<div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl transition-colors group-hover:bg-indigo-500/10" />

			{/* Cabeçalho do Card */}
			<div className="relative z-10 flex items-start justify-between">
				<div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-indigo-400 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:border-indigo-500/40">
					<IconComponent className="h-6 w-6" />
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label="Opções do grupo"
							className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer outline-none"
						>
							<MoreVertical className="h-5 w-5" />
						</button>
					</DropdownMenuTrigger>

					<DropdownMenuContent
						align="end"
						className="w-36 border-zinc-800 bg-zinc-900 text-zinc-200 shadow-xl z-50"
					>
						<DropdownMenuItem
							onClick={() => openEditSheet(group)}
							className="cursor-pointer gap-2 text-xs focus:bg-zinc-800 focus:text-white"
						>
							<Pencil className="h-3.5 w-3.5" />
							Editar
						</DropdownMenuItem>

						<DropdownMenuItem
							onClick={handleDelete}
							disabled={isPending}
							className="cursor-pointer gap-2 text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400"
						>
							<Trash2 className="h-3.5 w-3.5" />
							{isPending ? "Excluindo..." : "Excluir"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Informações do Grupo */}
			<div className="relative z-10 mt-4 flex flex-1 flex-col gap-2">
				<h3 className="text-lg font-semibold tracking-tight text-zinc-50">
					{group.name}
				</h3>

				{group.devices.length === 0 ? (
					<p className="text-xs text-zinc-500">Nenhum dispositivo vinculado</p>
				) : (
					<div className="flex flex-wrap gap-1.5">
						{visibleDevices.map((device) => (
							<span
								key={device.id}
								className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-300"
							>
								{device.name}
							</span>
						))}
						{overflowCount > 0 && (
							<span className="rounded-full bg-zinc-800/40 px-2 py-0.5 text-[10px] text-zinc-500">
								+{overflowCount}
							</span>
						)}
					</div>
				)}
			</div>

			{/* Rodapé Decorativo */}
			<div className="relative z-10 mt-4 flex items-center gap-2 border-t border-zinc-800/60 pt-3">
				<span className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
					{group.devices.length} dispositivo(s)
				</span>
			</div>
		</div>
	);
};
