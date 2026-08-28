import { AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/core/utils";
import { ROOM_ICON_MAP } from "../constants/rooms.constants";
import type { RoomPickerDevice } from "../types/room-devices.types";
import type { Room, RoomsViewMode } from "../types/rooms.types";

interface RoomListItemProps {
	room: Room;
	devices: RoomPickerDevice[];
	isSelected: boolean;
	onSelect: (id: string) => void;
	onDelete: (room: Room) => void;
	viewMode: RoomsViewMode;
}

/**
 * Item da lista de ambientes — mesmo componente atende os dois modos
 * (cards/list, densidade diferente), igual ao par Card/Row de Automações,
 * só que unificado num componente só (lista pequena, não precisa de dois
 * arquivos separados). O ícone de excluir fica sempre visível na linha —
 * excluir não deve exigir selecionar o ambiente primeiro (ver princípio de
 * "ações diretas" da tela). `stopPropagation` nele evita disparar a seleção
 * do item ao clicar.
 */
export function RoomListItem({
	room,
	devices,
	isSelected,
	onSelect,
	onDelete,
	viewMode,
}: RoomListItemProps) {
	const Icon = ROOM_ICON_MAP[room.icon ?? ""] ?? ROOM_ICON_MAP.default;
	const offlineCount = devices.filter((d) => !d.isOnline).length;
	const deviceCount = devices.length;

	return (
		// biome-ignore lint/a11y/useSemanticElements: item de seleção de uma lista custom (não um form), precisa de role="button" pra teclado
		<div
			role="button"
			tabIndex={0}
			data-room-item
			onClick={() => onSelect(room.id)}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onSelect(room.id);
			}}
			aria-current={isSelected}
			className={cn(
				"group flex w-full items-center gap-3 rounded-lg border text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				viewMode === "cards" ? "p-3" : "px-3 py-2",
				isSelected
					? "border-primary/40 bg-primary/10"
					: "border-transparent bg-surface-container hover:bg-surface-high",
			)}
		>
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-full",
					viewMode === "cards" ? "h-10 w-10" : "h-8 w-8",
					isSelected
						? "bg-primary text-primary-foreground"
						: "bg-surface-high text-muted-foreground",
				)}
			>
				<Icon className={viewMode === "cards" ? "h-5 w-5" : "h-4 w-4"} />
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
					{room.name}
					{offlineCount > 0 && (
						<span
							role="status"
							aria-label={`${offlineCount} dispositivo${offlineCount === 1 ? "" : "s"} offline`}
							className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert-foreground"
						/>
					)}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{deviceCount} dispositivo{deviceCount === 1 ? "" : "s"}
				</span>
			</div>

			{offlineCount > 0 && viewMode === "list" && (
				<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-alert-foreground">
					<AlertCircle className="h-3 w-3" />
					{offlineCount}
				</span>
			)}

			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					onDelete(room);
				}}
				aria-label={`Excluir ambiente ${room.name}`}
				className="shrink-0 rounded-md p-1.5 text-muted-foreground/70 outline-none transition-colors hover:bg-alert/15 hover:text-alert-foreground focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
			>
				<Trash2 className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
