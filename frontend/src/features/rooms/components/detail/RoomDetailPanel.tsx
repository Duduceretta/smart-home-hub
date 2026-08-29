import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { ROOM_ICON_MAP } from "../../constants/rooms.constants";
import { useRoomsUIStore } from "../../store/rooms-ui.store";
import type { Room, RoomPickerDevice } from "../../types/rooms.types";
import { RoomDetailContent } from "./RoomDetailContent";

interface RoomDetailPanelProps {
	room: Room | null;
	devices: RoomPickerDevice[];
}

export function RoomDetailPanel({ room, devices }: RoomDetailPanelProps) {
	const { t } = useTranslation("rooms");
	const openEditDialog = useRoomsUIStore((s) => s.openEditDialog);

	if (!room) {
		return (
			<div className="flex h-full max-h-full min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-low text-center">
				<p className="text-sm text-muted-foreground">
					{t(
						"detail.selectPrompt",
						"Selecione um ambiente pra ver os detalhes.",
					)}
				</p>
			</div>
		);
	}

	const Icon = ROOM_ICON_MAP[room.icon ?? ""] ?? ROOM_ICON_MAP.default;

	return (
		<div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-low shadow-sm">
			{/* Cabeçalho elevado com surface-container */}
			<div className="flex shrink-0 items-center justify-between gap-4 bg-surface-container/50 p-6 border-b border-border-subtle/50">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary shadow-xs">
						<Icon className="h-6 w-6" />
					</div>
					<div className="min-w-0">
						<h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
							{room.name}
						</h2>
						<p className="text-sm text-muted-foreground">
							{t(
								"detail.deviceConnected",
								`${devices.length} dispositivo${devices.length === 1 ? "" : "s"} conectado${devices.length === 1 ? "" : "s"}`,
								{ count: devices.length },
							)}
						</p>
					</div>
				</div>

				<Button
					variant="outline"
					className="shrink-0 border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40"
					onClick={() => openEditDialog(room)}
				>
					<Pencil className="h-4 w-4" />
					{t("detail.edit", "Editar")}
				</Button>
			</div>

			<RoomDetailContent room={room} devices={devices} />
		</div>
	);
}
