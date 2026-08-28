import { Pencil } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { ROOM_ICON_MAP } from "../constants/rooms.constants";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import type { RoomPickerDevice } from "../types/room-devices.types";
import type { Room } from "../types/rooms.types";
import { RoomDetailContent } from "./RoomDetailContent";

interface RoomDetailPanelProps {
	room: Room | null;
	devices: RoomPickerDevice[];
}

/**
 * Painel da coluna direita — mesmo card flutuante (borda + raio + fundo
 * próprio) do `AutomationDetailPanel`. Cabeçalho (largura total, com
 * "Editar") + `RoomDetailContent` (corpo em duas colunas internas: controle
 * vs. contexto). Excluir é uma ação direta na lista (ícone inline em cada
 * `RoomListItem`), não precisa mais de seleção prévia. `devices` já vem
 * filtrado pelo pai (`RoomsView`) a partir de `useAssignableDevices` —
 * dados reais, não mockados.
 */
export function RoomDetailPanel({ room, devices }: RoomDetailPanelProps) {
	const openEditDialog = useRoomsUIStore((s) => s.openEditDialog);

	if (!room) {
		return (
			<div className="flex h-full max-h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle/40 bg-surface-low text-center">
				<p className="text-sm text-muted-foreground">
					Selecione um ambiente pra ver os detalhes.
				</p>
			</div>
		);
	}

	const Icon = ROOM_ICON_MAP[room.icon ?? ""] ?? ROOM_ICON_MAP.default;

	return (
		<div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border-subtle/20 bg-surface-low">
			<div className="flex shrink-0 items-center gap-4 border-b border-border-subtle/20 p-6">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary">
					<Icon className="h-6 w-6" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="truncate text-xl font-medium text-foreground">
							{room.name}
						</h2>
						<Button
							variant="outline"
							size="xs"
							onClick={() => openEditDialog(room)}
						>
							<Pencil className="h-3 w-3" />
							Editar
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						{devices.length} dispositivo
						{devices.length === 1 ? "" : "s"} conectado
						{devices.length === 1 ? "" : "s"}
					</p>
				</div>
			</div>

			<RoomDetailContent room={room} devices={devices} />
		</div>
	);
}
