import { LayoutGrid, List, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { StaleDataIndicator } from "@/core/components/feedback/StaleDataIndicator";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/utils";
import { COLOR_AMBER } from "../constants/scene-colors";
import { useActivateScene } from "../hooks/useActivateScene";
import { useDeleteScene } from "../hooks/useDeleteScene";
import { useSceneDevices } from "../hooks/useSceneDevices";
import { useScenes } from "../hooks/useScenes";
import {
	countOfflineDevices,
	filterScenes,
	listRoomsInScenes,
	toDeviceIndex,
} from "../lib/scene-view";
import { useScenesUIStore } from "../store/scenes-ui.store";
import type { Scene } from "../types/scenes.types";
import { SceneMetricsPanel } from "./list/SceneMetricsPanel";
import { SceneQuickEdit } from "./list/SceneQuickEdit";
import { SceneQuickEditPlaceholder } from "./list/SceneQuickEditPlaceholder";
import { SceneRow } from "./list/SceneRow";
import { SceneTile } from "./list/SceneTile";
import { ScenesPager } from "./list/ScenesPager";
import { ScenesListSkeleton } from "./list/scenes-list.skeleton";

const NEW_SCENE_PATH = "/scenes/new";

// A lista reserva a altura de uma página cheia (xl:min-h no <ul>, 4.625rem por linha e
// 11rem por card, mais o gap), pra última página não encolher a tela.
const PAGE_SIZE_LIST = 11;
const PAGE_SIZE_CARDS = 10;

const CHIP_CLASSNAME =
	"h-8 cursor-pointer rounded-lg border px-4 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * Tela de Cenas. Lista larga com a "faixa de luz" de cada cena (ou cards, como opção),
 * busca e filtro por ambiente; ao lado, a edição rápida da cena selecionada. Criar e
 * editar são páginas próprias (`/scenes/new`, `/scenes/:id/edit`), nunca modal.
 */
export function ScenesView() {
	const { t } = useTranslation("scenes");
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const confirm = useConfirm();

	const { data: scenesData, isLoading, isError, refetch } = useScenes();
	const scenes = useMemo(() => scenesData ?? [], [scenesData]);
	const devicesQuery = useSceneDevices();
	const devices = useMemo(() => devicesQuery.data ?? [], [devicesQuery.data]);
	const deviceIndex = useMemo(() => toDeviceIndex(devices), [devices]);

	const viewMode = useScenesUIStore((s) => s.viewMode);
	const setViewMode = useScenesUIStore((s) => s.setViewMode);
	const [query, setQuery] = useState("");
	const [room, setRoom] = useState<string | null>(null);

	const activateScene = useActivateScene();
	const deleteScene = useDeleteScene();
	const activatingSceneId = activateScene.isPending
		? (activateScene.variables ?? null)
		: null;

	const rooms = useMemo(
		() => listRoomsInScenes(scenes, deviceIndex),
		[scenes, deviceIndex],
	);
	const visibleScenes = useMemo(
		() => filterScenes(scenes, deviceIndex, { query, room }),
		[scenes, deviceIndex, query, room],
	);

	// Paginação no cliente: a lista é pequena e já vem inteira da API. A página volta
	// pra 0 quando busca, ambiente ou modo de visão mudam (chave do filtro).
	const pageSize = viewMode === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_LIST;
	const filterKey = `${query}|${room}|${viewMode}`;
	const [pager, setPager] = useState({ key: filterKey, page: 0 });
	const lastPage = Math.max(0, Math.ceil(visibleScenes.length / pageSize) - 1);
	const page = pager.key === filterKey ? Math.min(pager.page, lastPage) : 0;
	const pageScenes = useMemo(
		() => visibleScenes.slice(page * pageSize, (page + 1) * pageSize),
		[visibleScenes, page, pageSize],
	);
	const goToPage = (next: number) => setPager({ key: filterKey, page: next });

	// A cena selecionada vive na URL (`?scene=`); sem seleção válida, vale a primeira visível.
	const selectedId = searchParams.get("scene");
	const selected =
		visibleScenes.find((scene) => scene.id === selectedId) ??
		visibleScenes[0] ??
		null;

	const selectScene = (sceneId: string) =>
		setSearchParams(
			(previous) => {
				const next = new URLSearchParams(previous);
				next.set("scene", sceneId);
				return next;
			},
			{ replace: true },
		);

	const openEditor = (scene: Scene) => navigate(`/scenes/${scene.id}/edit`);

	const handleDelete = async (scene: Scene) => {
		const confirmed = await confirm({
			title: t("deleteDialog.title"),
			description: t("deleteDialog.description", { name: scene.name }),
			confirmLabel: t("deleteDialog.confirm"),
			cancelLabel: t("deleteDialog.cancel"),
			variant: "destructive",
			icon: Trash2,
		});
		if (confirmed) deleteScene.mutate(scene.id);
	};

	const renderItems = () =>
		pageScenes.map((scene) => {
			const props = {
				scene,
				isSelected: selected?.id === scene.id,
				isActivating: activatingSceneId === scene.id,
				offlineCount: countOfflineDevices(scene, deviceIndex),
				onSelect: selectScene,
				onActivate: (target: Scene) => activateScene.mutate(target.id),
			};

			return viewMode === "cards" ? (
				<SceneTile key={scene.id} {...props} />
			) : (
				<SceneRow
					key={scene.id}
					{...props}
					onEdit={openEditor}
					onDelete={handleDelete}
				/>
			);
		});

	const renderBody = () => {
		if (isError && !scenesData) {
			return (
				<CardErrorFallback
					message={t("page.loadError")}
					retryLabel={t("page.retry")}
					onRetry={() => refetch()}
					className="flex-col justify-center gap-4 rounded-xl bg-surface-low/50 p-6 text-center text-sm"
				/>
			);
		}

		if (isLoading) return <ScenesListSkeleton />;

		return (
			<div className="flex flex-col gap-4">
				{rooms.length > 0 && (
					<fieldset className="m-0 -mx-4 flex min-w-0 flex-wrap items-center gap-2 border-0 border-y border-border-subtle bg-surface-container px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
						<legend className="sr-only">{t("toolbar.roomLabel")}</legend>
						<span
							aria-hidden
							className="mr-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
						>
							{t("toolbar.roomLabel")}:
						</span>
						{[null, ...rooms].map((entry) => (
							<button
								key={entry ?? "all"}
								type="button"
								aria-pressed={room === entry}
								onClick={() => setRoom(entry)}
								style={
									room === entry ? { backgroundColor: COLOR_AMBER } : undefined
								}
								className={cn(
									CHIP_CLASSNAME,
									room === entry
										? "border-transparent text-primary-foreground"
										: "border-border-subtle bg-surface-high text-foreground hover:bg-surface-highest",
								)}
							>
								{entry ?? t("toolbar.allRooms")}
							</button>
						))}
					</fieldset>
				)}

				<div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
					<div className="flex min-w-0 flex-col gap-3 xl:col-span-8">
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
									{t("list.title")}
								</h2>
								<span className="rounded-md border border-border-subtle bg-surface-high px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
									{t("list.count", { count: scenes.length })}
								</span>
							</div>
							<div className="flex items-center gap-4">
								{scenes.length > 0 && (
									<span className="text-xs text-muted-foreground">
										{t("list.hint")}
									</span>
								)}
								<fieldset className="m-0 inline-flex gap-1 rounded-lg border border-border-subtle bg-surface-container p-1">
									<legend className="sr-only">{t("toolbar.viewLabel")}</legend>
									{(
										[
											["list", List, "toolbar.viewList"],
											["cards", LayoutGrid, "toolbar.viewCards"],
										] as const
									).map(([mode, Icon, labelKey]) => (
										<button
											key={mode}
											type="button"
											aria-pressed={viewMode === mode}
											aria-label={t(labelKey)}
											onClick={() => setViewMode(mode)}
											className={cn(
												"flex h-6 w-7 cursor-pointer items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
												viewMode === mode
													? "bg-surface-highest text-foreground"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											<Icon className="h-4 w-4" />
										</button>
									))}
								</fieldset>
							</div>
						</div>

						{scenes.length === 0 ? (
							<button
								type="button"
								onClick={() => navigate(NEW_SCENE_PATH)}
								className="flex min-h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle px-6 py-4 text-center text-sm text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<Plus className="h-4 w-4 shrink-0" aria-hidden />
								{t("empty.ghost")}
							</button>
						) : visibleScenes.length === 0 ? (
							<p className="rounded-xl border border-dashed border-border-subtle p-6 text-center text-sm text-muted-foreground">
								{t("list.noResults")}
							</p>
						) : (
							<ul
								aria-label={t("list.ariaLabel")}
								className={cn(
									viewMode === "cards"
										? "grid grid-cols-1 content-start gap-3 sm:grid-cols-2 xl:min-h-[calc(5*11rem+4*0.75rem)]"
										: "flex flex-col gap-3 xl:min-h-[calc(11*4.625rem+10*0.75rem)]",
								)}
							>
								{renderItems()}
							</ul>
						)}

						{visibleScenes.length > 0 && (
							<ScenesPager
								page={page}
								lastPage={lastPage}
								from={page * pageSize + 1}
								to={Math.min((page + 1) * pageSize, visibleScenes.length)}
								total={visibleScenes.length}
								onChange={goToPage}
							/>
						)}
					</div>

					<aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:col-span-4">
						{selected ? (
							<SceneQuickEdit
								key={selected.id}
								scene={selected}
								devices={devices}
								onOpenEditor={openEditor}
								onDelete={handleDelete}
							/>
						) : (
							<SceneQuickEditPlaceholder
								message={
									scenes.length === 0
										? t("quick.emptyHint")
										: t("quick.selectPrompt")
								}
							/>
						)}
						{/* Sem dados até a NH-58 entregar o endpoint de métricas: mostra o estado vazio. */}
						<SceneMetricsPanel metrics={null} />
					</aside>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
			<header className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-2">
					<h1 className="flex items-center gap-2 text-3xl font-semibold leading-none tracking-tight text-foreground">
						{t("title")}
						{isError && scenesData && <StaleDataIndicator />}
					</h1>
					<p className="truncate text-sm text-muted-foreground">
						{t("header.subtitle")}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<label className="flex h-8 min-w-60 items-center gap-2 rounded-lg border border-border-subtle bg-surface-container px-3 text-muted-foreground focus-within:border-primary/50">
						<Search className="h-4 w-4 shrink-0" aria-hidden />
						<input
							type="search"
							aria-label={t("toolbar.searchLabel")}
							placeholder={t("toolbar.searchPlaceholder")}
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
						/>
					</label>

					<Button onClick={() => navigate(NEW_SCENE_PATH)}>
						<Plus />
						{t("header.addButton")}
					</Button>
				</div>
			</header>

			{renderBody()}
		</div>
	);
}
