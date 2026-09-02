import { AlertTriangle, DoorOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { useMediaQuery } from "@/core/hooks/useMediaQuery";
import { cn } from "@/core/utils";
import { useAssignableDevices } from "../hooks/useAssignableDevices";
import { useDeleteRoom } from "../hooks/useDeleteRoom";
import { useRooms } from "../hooks/useRooms";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import type { Room, RoomPickerDevice } from "../types/rooms.types";
import { RoomDetailPanel } from "./detail/RoomDetailPanel";
import { RoomFormDialog } from "./dialogs/RoomFormDialog";
import { RoomListPanel } from "./list/RoomListPanel";
import { RoomsSummaryBar } from "./list/RoomsSummaryBar";

/**
 * View de Ambientes — duas colunas desde o topo: título/subtítulo + stats +
 * painel de lista (busca/criação/itens) empilhados numa coluna esquerda de
 * largura fixa, painel de detalhe ocupando a coluna direita, nivelado com o
 * título. Navegação Master-Detail orientada a URL (?room=<id>) com pilha
 * em telas estreitas (<lg) e split-view lado a lado em telas largas (lg+).
 */
export function RoomsView() {
	const { t } = useTranslation("rooms");
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const isDesktopMasterDetail = useMediaQuery("(min-width: 1024px)");

	const stateRoomId = (location.state as { selectedRoomId?: string })
		?.selectedRoomId;

	const {
		data: rooms = [],
		isLoading: isLoadingRooms,
		isError: isRoomsError,
		refetch: refetchRooms,
	} = useRooms();
	const { data: allDevices = [] } = useAssignableDevices();

	const [query, setQuery] = useState("");
	const viewMode = useRoomsUIStore((s) => s.viewMode);
	const setViewMode = useRoomsUIStore((s) => s.setViewMode);
	const openCreateDialog = useRoomsUIStore((s) => s.openCreateDialog);
	const confirm = useConfirm();
	const deleteRoom = useDeleteRoom();

	const selectedRoomId = searchParams.get("room");

	/** Seleção via toque/clique numa linha da lista — histórico só cresce
	 * abaixo de `lg` (pilha mobile); em telas largas troca a URL sem
	 * empilhar, preservando o comportamento de mouse já existente. */
	const selectRoom = useCallback(
		(id: string) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set("room", id);
					return next;
				},
				{ replace: isDesktopMasterDetail },
			);
		},
		[setSearchParams, isDesktopMasterDetail],
	);

	/** Seleção programática (default inicial / correção de filtro) — nunca
	 * empilha histórico, só acontece em telas largas (`autoSelectFirst`). */
	const setDefaultRoom = useCallback(
		(id: string | null) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (id) next.set("room", id);
					else next.delete("room");
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	/** Botão "voltar" do painel de detalhe (só existe <lg) — sempre empilha,
	 * pra o botão físico de voltar do navegador desfazer exatamente essa ação
	 * (volta pro detalhe), e não sair da tela de Ambientes. */
	const clearSelection = useCallback(() => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("room");
			return next;
		});
	}, [setSearchParams]);

	const handleDeleteRoom = async (room: Room) => {
		const confirmed = await confirm({
			title: t("deleteDialog.title", "Excluir ambiente"),
			description: t(
				"deleteDialog.description",
				`Tem certeza que deseja excluir o ambiente "${room.name}"? Os dispositivos vinculados a ele ficam sem ambiente atribuído — a exclusão não apaga os dispositivos nem o histórico deles.`,
				{ name: room.name },
			),
			confirmLabel: t("deleteDialog.confirm", "Excluir"),
			cancelLabel: t("deleteDialog.cancel", "Cancelar"),
			variant: "destructive",
			icon: Trash2,
		});
		if (confirmed) deleteRoom.mutate(room.id);
	};

	const visibleRooms = useMemo(() => {
		if (!query.trim()) return rooms;
		const search = query.trim().toLowerCase();
		return rooms.filter((room) => room.name.toLowerCase().includes(search));
	}, [rooms, query]);

	// Chegada via location.state (ex: Dashboard "ver ambiente")
	// biome-ignore lint/correctness/useExhaustiveDependencies: dispara só na chegada com stateRoomId
	useEffect(() => {
		if (stateRoomId) {
			setDefaultRoom(stateRoomId);
		}
	}, [stateRoomId]);

	// Auto-seleção do primeiro item só acontece em telas desktop master-detail (lg+)
	useEffect(() => {
		if (isDesktopMasterDetail && !selectedRoomId && visibleRooms.length > 0) {
			setDefaultRoom(visibleRooms[0].id);
		}
	}, [isDesktopMasterDetail, selectedRoomId, visibleRooms, setDefaultRoom]);

	// Se o ambiente selecionado não existir mais no conjunto filtrado/excluído (em desktop)
	useEffect(() => {
		if (
			isDesktopMasterDetail &&
			selectedRoomId &&
			visibleRooms.length > 0 &&
			!visibleRooms.some((room) => room.id === selectedRoomId)
		) {
			setDefaultRoom(visibleRooms[0].id);
		}
	}, [isDesktopMasterDetail, selectedRoomId, visibleRooms, setDefaultRoom]);

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
		<div className="flex h-full min-h-0 gap-4">
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col gap-4 lg:flex lg:w-80 lg:shrink-0",
					selectedRoomId ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="flex shrink-0 flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						{t("page.title", "Ambientes")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t("page.subtitle", "Organize seus dispositivos por cômodo.")}
					</p>
				</div>

				{isRoomsError ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
						<AlertTriangle className="h-6 w-6 text-destructive" />
						<p className="text-sm font-medium text-destructive">
							{t("page.errorLoad", "Não foi possível carregar os ambientes.")}
						</p>
						<button
							type="button"
							onClick={() => refetchRooms()}
							className="mt-2 rounded-md border border-border-subtle bg-surface-container px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-surface-high hover:border-primary/40 cursor-pointer"
						>
							{t("page.retry", "Tentar novamente")}
						</button>
					</div>
				) : isLoadingRooms ? (
					<div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						{t("page.loading", "Carregando ambientes...")}
					</div>
				) : rooms.length === 0 ? (
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-subtle bg-surface-container/30 p-6 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
							<DoorOpen className="h-7 w-7" />
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t("page.emptyTitle", "Nenhum ambiente ainda")}
							</p>
							<p className="text-xs text-muted-foreground">
								{t(
									"page.emptyDescription",
									"Crie seu primeiro cômodo pra começar a organizar seus dispositivos.",
								)}
							</p>
						</div>
						<button
							type="button"
							onClick={openCreateDialog}
							className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
						>
							<Plus className="h-4 w-4" />
							{t("page.emptyCreateButton", "Criar primeiro ambiente")}
						</button>
					</div>
				) : (
					<>
						<RoomsSummaryBar rooms={rooms} devices={allDevices} />

						<div className="min-h-0 flex-1">
							<RoomListPanel
								rooms={visibleRooms}
								devicesByRoom={devicesByRoom}
								selectedId={selectedRoomId}
								onSelect={selectRoom}
								onDelete={handleDeleteRoom}
								onCreate={openCreateDialog}
								viewMode={viewMode}
								onViewModeChange={setViewMode}
								query={query}
								onQueryChange={setQuery}
							/>
						</div>
					</>
				)}
			</div>

			<div
				className={cn(
					"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
					selectedRoomId ? "flex" : "hidden lg:flex",
				)}
			>
				<RoomDetailPanel
					room={selectedRoom}
					devices={selectedRoomDevices}
					onBack={clearSelection}
				/>
			</div>

			<RoomFormDialog />
		</div>
	);
}
