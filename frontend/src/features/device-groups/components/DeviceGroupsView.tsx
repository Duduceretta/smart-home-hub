import { AlertTriangle, Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { useMediaQuery } from "@/core/hooks/useMediaQuery";
import { cn } from "@/core/utils";
import { useDeleteDeviceGroup } from "../hooks/useDeleteDeviceGroup";
import { useDeviceGroups } from "../hooks/useDeviceGroups";
import { useDeviceGroupsUIStore } from "../store/device-groups-ui.store";
import type { DeviceGroup } from "../types/device-groups.types";
import { DeviceGroupDetailPanel } from "./detail/DeviceGroupDetailPanel";
import { DeviceGroupFormDialog } from "./dialogs/DeviceGroupFormDialog";
import { DeviceGroupListPanel } from "./list/DeviceGroupListPanel";
import { DeviceGroupsSummaryBar } from "./list/DeviceGroupsSummaryBar";

/**
 * View de Grupos de Dispositivos — estrutura Master-Detail em duas colunas,
 * espelhando fielmente o padrão de Ambientes (RoomsView).
 * Navegação Master-Detail orientada a URL (?group=<id>) com pilha
 * em telas estreitas (<lg) e split-view lado a lado em telas largas (lg+).
 */
export function DeviceGroupsView() {
	const { t } = useTranslation("device-groups");
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const isDesktopMasterDetail = useMediaQuery("(min-width: 1024px)");

	const stateGroupId = (location.state as { selectedGroupId?: string })
		?.selectedGroupId;

	const {
		data: groups = [],
		isLoading: isLoadingGroups,
		isError: isGroupsError,
		refetch: refetchGroups,
	} = useDeviceGroups();

	const [query, setQuery] = useState("");
	const viewMode = useDeviceGroupsUIStore((s) => s.viewMode);
	const setViewMode = useDeviceGroupsUIStore((s) => s.setViewMode);
	const openCreateDialog = useDeviceGroupsUIStore((s) => s.openCreateDialog);
	const confirm = useConfirm();
	const deleteGroup = useDeleteDeviceGroup();

	const selectedGroupId = searchParams.get("group");

	/** Seleção via toque/clique numa linha da lista — histórico só cresce
	 * abaixo de `lg` (pilha mobile); em telas largas troca a URL sem
	 * empilhar, preservando o comportamento de mouse já existente. */
	const selectGroup = useCallback(
		(id: string) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set("group", id);
					return next;
				},
				{ replace: isDesktopMasterDetail },
			);
		},
		[setSearchParams, isDesktopMasterDetail],
	);

	/** Seleção programática (default inicial / correção de filtro) — nunca
	 * empilha histórico, só acontece em telas largas (`autoSelectFirst`). */
	const setDefaultGroup = useCallback(
		(id: string | null) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (id) next.set("group", id);
					else next.delete("group");
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	/** Botão "voltar" do painel de detalhe (só existe <lg) — sempre empilha,
	 * pra o botão físico de voltar do navegador desfazer exatamente essa ação
	 * (volta pro detalhe), e não sair da tela de Grupos. */
	const clearSelection = useCallback(() => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("group");
			return next;
		});
	}, [setSearchParams]);

	const handleDeleteGroup = async (group: DeviceGroup) => {
		const confirmed = await confirm({
			title: t("deleteDialog.title", "Excluir grupo"),
			description: t(
				"deleteDialog.description",
				`Tem certeza que deseja excluir o grupo "${group.name}"? Os dispositivos vinculados a ele não serão apagados, apenas desvinculados.`,
				{ name: group.name },
			),
			confirmLabel: t("deleteDialog.confirm", "Excluir"),
			cancelLabel: t("deleteDialog.cancel", "Cancelar"),
			variant: "destructive",
			icon: Trash2,
		});
		if (confirmed) deleteGroup.mutate(group.id);
	};

	const visibleGroups = useMemo(() => {
		if (!query.trim()) return groups;
		const search = query.trim().toLowerCase();
		return groups.filter((group) => group.name.toLowerCase().includes(search));
	}, [groups, query]);

	// Chegada via location.state (ex: Dashboard "ver grupo")
	// biome-ignore lint/correctness/useExhaustiveDependencies: dispara só na chegada com stateGroupId
	useEffect(() => {
		if (stateGroupId) {
			setDefaultGroup(stateGroupId);
		}
	}, [stateGroupId]);

	// Auto-seleção do primeiro item só acontece em telas desktop master-detail (lg+)
	useEffect(() => {
		if (isDesktopMasterDetail && !selectedGroupId && visibleGroups.length > 0) {
			setDefaultGroup(visibleGroups[0].id);
		}
	}, [isDesktopMasterDetail, selectedGroupId, visibleGroups, setDefaultGroup]);

	// Se o grupo selecionado não existir mais no conjunto filtrado/excluído (em desktop)
	useEffect(() => {
		if (
			isDesktopMasterDetail &&
			selectedGroupId &&
			visibleGroups.length > 0 &&
			!visibleGroups.some((group) => group.id === selectedGroupId)
		) {
			setDefaultGroup(visibleGroups[0].id);
		}
	}, [isDesktopMasterDetail, selectedGroupId, visibleGroups, setDefaultGroup]);

	const selectedGroup =
		groups.find((group) => group.id === selectedGroupId) ?? null;

	return (
		<div className="flex h-full min-h-0 gap-4">
			{/* Left Column: Master List */}
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col gap-4 lg:flex lg:w-80 lg:shrink-0",
					selectedGroupId ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="flex shrink-0 flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						{t("title", "Grupos de Dispositivos")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t(
							"header.subtitle",
							"Controle múltiplos dispositivos em conjunto com um único comando.",
						)}
					</p>
				</div>

				{isGroupsError ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
						<AlertTriangle className="h-6 w-6 text-destructive" />
						<p className="text-sm font-medium text-destructive">
							{t(
								"grid.errorTitle",
								"Não foi possível carregar os grupos de dispositivos.",
							)}
						</p>
						<button
							type="button"
							onClick={() => refetchGroups()}
							className="mt-2 rounded-md border border-border-subtle bg-surface-container px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-surface-high hover:border-primary/40 cursor-pointer"
						>
							{t("page.retry", "Tentar novamente")}
						</button>
					</div>
				) : isLoadingGroups ? (
					<div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						{t("page.loading", "Carregando grupos...")}
					</div>
				) : groups.length === 0 ? (
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-subtle bg-surface-container/30 p-6 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-muted-foreground">
							<Boxes className="h-7 w-7" />
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t("grid.emptyTitle", "Nenhum grupo cadastrado")}
							</p>
							<p className="text-xs text-muted-foreground">
								{t(
									"grid.emptySubtitle",
									"Crie seu primeiro grupo para organizar e controlar vários dispositivos de uma só vez.",
								)}
							</p>
						</div>
						<button
							type="button"
							onClick={openCreateDialog}
							className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
						>
							<Plus className="h-4 w-4" />
							{t("grid.emptyCta", "Criar primeiro grupo")}
						</button>
					</div>
				) : (
					<>
						<DeviceGroupsSummaryBar groups={groups} />

						<div className="min-h-0 flex-1">
							<DeviceGroupListPanel
								groups={visibleGroups}
								selectedId={selectedGroupId}
								onSelect={selectGroup}
								onDelete={handleDeleteGroup}
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

			{/* Right Column: Detail Panel */}
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
					selectedGroupId ? "flex" : "hidden lg:flex",
				)}
			>
				<DeviceGroupDetailPanel group={selectedGroup} onBack={clearSelection} />
			</div>

			{/* Form Dialog (Create / Edit) */}
			<DeviceGroupFormDialog />
		</div>
	);
}
