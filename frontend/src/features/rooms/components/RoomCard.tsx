import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { ROOM_ICON_MAP } from "../constants/rooms.constants";
import { useDeleteRoom } from "../hooks/useDeleteRoom";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import type { Room } from "../types/rooms.types";

interface RoomCardProps {
	room: Room;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
	const { t } = useTranslation(["rooms", "common"]);
	const openEditSheet = useRoomsUIStore((state) => state.openEditSheet);
	const { mutate: deleteRoom, isPending } = useDeleteRoom();

	const IconComponent = ROOM_ICON_MAP[room.icon || ""] || ROOM_ICON_MAP.default;

	const handleDelete = () => {
		if (confirm(t("card.confirmDelete", { name: room.name }))) {
			deleteRoom(room.id);
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
							aria-label={t("card.optionsAriaLabel")}
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
							onClick={() => openEditSheet(room)}
							className="cursor-pointer gap-2 text-xs focus:bg-zinc-800 focus:text-white"
						>
							<Pencil className="h-3.5 w-3.5" />
							{t("common:actions.edit")}
						</DropdownMenuItem>

						<DropdownMenuItem
							onClick={handleDelete}
							disabled={isPending}
							className="cursor-pointer gap-2 text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400"
						>
							<Trash2 className="h-3.5 w-3.5" />
							{isPending ? t("card.deleting") : t("common:actions.delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Informações do Cômodo */}
			<div className="relative z-10 mt-4 flex flex-1 flex-col gap-1">
				<h3 className="text-lg font-semibold tracking-tight text-zinc-50">
					{room.name}
				</h3>
				<div className="flex items-center gap-2 text-xs text-zinc-400">
					<span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
					<span>{t("card.active")}</span>
				</div>
			</div>

			{/* Rodapé Decorativo */}
			<div className="relative z-10 mt-4 flex items-center gap-2 border-t border-zinc-800/60 pt-3">
				<span className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
					{t("card.physicalTag")}
				</span>
			</div>
		</div>
	);
};
