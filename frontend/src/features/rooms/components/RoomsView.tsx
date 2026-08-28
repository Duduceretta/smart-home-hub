import { AlertTriangle, DoorOpen, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/core/utils";
import { useAssignableDevices } from "../hooks/useAssignableDevices";
import { useRooms } from "../hooks/useRooms";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import type { RoomPickerDevice } from "../types/room-devices.types";
import type { RoomsViewMode } from "../types/rooms.types";
import { DeleteRoomAlertDialog } from "./DeleteRoomAlertDialog";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { RoomFormDialog } from "./RoomFormDialog";
import { RoomListPanel } from "./RoomListPanel";
import { RoomsSummaryBar } from "./RoomsSummaryBar";

/**
 * View de Ambientes — master-detail (split-view) fixo, mesmo padrão de
 * layout/scroll contido já usado em Automações (`AutomationsView`): lista e
 * painel de detalhe são cards flutuantes separados por `gap-4`, cada um com
 * seu próprio scroll interno. Dados reais: `useRooms()` e
 * `useAssignableDevices()`, agrupados por `roomId`. `selectedRoomId`/
 * `viewMode` são `useState` local; criação/edição/exclusão continuam na
 * `useRoomsUIStore` (modais).
 */
export function RoomsView() {
	const {
		data: rooms = [],
		isLoading: isLoadingRooms,
		isError: isRoomsError,
		refetch: refetchRooms,
	} = useRooms();
	const { data: allDevices = [] } = useAssignableDevices();

	const [query, setQuery] = useState("");
	const [viewMode, setViewMode] = useState<RoomsViewMode>("cards");
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

	const openCreateDialog = useRoomsUIStore((s) => s.openCreateDialog);
	const openDeleteDialog = useRoomsUIStore((s) => s.openDeleteDialog);

	const visibleRooms = useMemo(() => {
		if (!query.trim()) return rooms;
		const search = query.trim().toLowerCase();
		return rooms.filter((room) => room.name.toLowerCase().includes(search));
	}, [rooms, query]);

	useEffect(() => {
		if (selectedRoomId === null && visibleRooms.length > 0) {
			setSelectedRoomId(visibleRooms[0].id);
		} else if (
			selectedRoomId !== null &&
			!visibleRooms.some((room) => room.id === selectedRoomId)
		) {
			setSelectedRoomId(visibleRooms[0]?.id ?? null);
		}
	}, [selectedRoomId, visibleRooms]);

	const devicesByRoom = useMemo(() => {
		const map = new Map<string, RoomPickerDevice[]>();
		for (const device of allDevices) {
			if (!device.roomId) continue;
			const list = map.get(device.roomId);
			if (list) list.push(device);
			else map.set(device.roomId, [device]);
		}
		return map;
	}, [allDevices]);

	const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
	const selectedRoomDevices = selectedRoomId
		? (devicesByRoom.get(selectedRoomId) ?? [])
		: [];

	return (
		<div className="flex h-full flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						Ambientes
					</h1>
					<p className="text-sm text-muted-foreground">
						Organize seus dispositivos por cômodo.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Buscar ambiente..."
							className="h-8 w-56 rounded-lg border border-border-subtle/20 bg-surface-container pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
						/>
					</div>

					<button
						type="button"
						onClick={openCreateDialog}
						className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_16px_rgba(197,198,207,0.2)] transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(197,198,207,0.3)] cursor-pointer active:scale-[0.98]"
					>
						<Plus className="h-4 w-4" />
						Novo Ambiente
					</button>
				</div>
			</div>

			{isRoomsError ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-alert/50 bg-alert/10 p-6 text-center">
					<AlertTriangle className="h-6 w-6 text-alert-foreground" />
					<p className="text-sm font-medium text-alert-foreground">
						Não foi possível carregar os ambientes.
					</p>
					<button
						type="button"
						onClick={() => refetchRooms()}
						className="mt-1 rounded-md border border-border-subtle/30 px-3 py-2 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-surface-high cursor-pointer"
					>
						Tentar novamente
					</button>
				</div>
			) : isLoadingRooms ? (
				<div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Carregando ambientes...
				</div>
			) : rooms.length === 0 ? (
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-subtle/40 bg-surface-low text-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
						<DoorOpen className="h-7 w-7" />
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">
							Nenhum ambiente ainda
						</p>
						<p className="text-xs text-muted-foreground">
							Crie seu primeiro cômodo pra começar a organizar seus
							dispositivos.
						</p>
					</div>
					<button
						type="button"
						onClick={openCreateDialog}
						className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						Criar primeiro ambiente
					</button>
				</div>
			) : (
				<>
					<RoomsSummaryBar rooms={rooms} devices={allDevices} />

					{/* min-h-0: sem isso, a linha esticaria pra caber o conteúdo alto
					do painel de detalhe em vez de rolar por dentro. */}
					<div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
						<div
							className={cn(
								"h-full w-full flex-col self-stretch lg:flex lg:w-[38%]",
								selectedRoomId ? "hidden lg:flex" : "flex",
							)}
						>
							<RoomListPanel
								rooms={visibleRooms}
								devicesByRoom={devicesByRoom}
								selectedId={selectedRoomId}
								onSelect={setSelectedRoomId}
								onDelete={openDeleteDialog}
								viewMode={viewMode}
								onViewModeChange={setViewMode}
							/>
						</div>

						<div
							className={cn(
								"h-full w-full flex-col self-stretch lg:flex lg:flex-1",
								selectedRoomId ? "flex" : "hidden lg:flex",
							)}
						>
							<RoomDetailPanel
								room={selectedRoom}
								devices={selectedRoomDevices}
							/>
						</div>
					</div>
				</>
			)}

			<RoomFormDialog />
			<DeleteRoomAlertDialog />
		</div>
	);
}
