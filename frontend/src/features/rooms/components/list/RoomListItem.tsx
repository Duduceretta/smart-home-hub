import { AlertCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { ROOM_ICON_MAP } from "../../constants/rooms.constants";
import type {
	Room,
	RoomPickerDevice,
	RoomsViewMode,
} from "../../types/rooms.types";

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
	const { t } = useTranslation("rooms");
	const Icon = ROOM_ICON_MAP[room.icon ?? ""] ?? ROOM_ICON_MAP.default;
	const offlineCount = devices.filter((d) => !d.isOnline).length;
	const deviceCount = devices.length;
	const automationCount = room.automationCount;

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
				"group flex w-full items-center gap-3 rounded-lg border text-left transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				viewMode === "cards" ? "p-3" : "px-3 py-2",
				isSelected
					? "border-primary/40 bg-primary/10 shadow-xs"
					: "border-transparent bg-surface-container/60 hover:bg-surface-high hover:border-border-subtle/50",
			)}
		>
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-full transition-colors",
					viewMode === "cards" ? "h-10 w-10" : "h-8 w-8",
					isSelected
						? "bg-primary text-primary-foreground shadow-xs"
						: "bg-surface-high text-muted-foreground group-hover:text-foreground",
				)}
			>
				<Icon className={viewMode === "cards" ? "h-5 w-5" : "h-4 w-4"} />
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className={cn(
						"flex items-center gap-1.5 truncate text-sm transition-colors",
						isSelected
							? "font-semibold text-foreground"
							: "font-medium text-foreground/90 group-hover:text-foreground",
					)}
				>
					{room.name}
					{offlineCount > 0 && viewMode === "cards" && (
						<AlertCircle
							aria-label={t(
								"item.offlineAria",
								`${offlineCount} dispositivo offline`,
								{ count: offlineCount },
							)}
							className="h-3.5 w-3.5 shrink-0 text-destructive"
						/>
					)}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{t("item.device", `${deviceCount} dispositivo`, {
						count: deviceCount,
					})}
					{automationCount > 0 &&
						` · ${t("item.automation", `${automationCount} automação`, { count: automationCount })}`}
				</span>
			</div>

			{offlineCount > 0 && viewMode === "list" && (
				<span className="flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
					<AlertCircle className="h-3.5 w-3.5" />
					{offlineCount}
				</span>
			)}

			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					onDelete(room);
				}}
				aria-label={t("item.deleteAria", `Excluir ambiente ${room.name}`, {
					name: room.name,
				})}
				className="shrink-0 rounded-md p-1.5 text-muted-foreground/60 outline-none transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
			>
				<Trash2 className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
