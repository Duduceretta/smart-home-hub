import { LayoutGrid, List, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { StaleDataIndicator } from "@/core/components/feedback/StaleDataIndicator";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/utils";
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
import { SceneQuickEdit } from "./list/SceneQuickEdit";
import { SceneQuickEditPlaceholder } from "./list/SceneQuickEditPlaceholder";
import { SceneRow } from "./list/SceneRow";
import { SceneTile } from "./list/SceneTile";
import { ScenesListSkeleton } from "./list/scenes-list.skeleton";

const NEW_SCENE_PATH = "/scenes/new";

const CHIP_CLASSNAME =
	"h-7 cursor-pointer rounded-full border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50";

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
		visibleScenes.map((scene) => {
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
				<SceneRow key={scene.id} {...props} />
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
					<fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
						<legend className="sr-only">{t("toolbar.roomLabel")}</legend>
						<span
							aria-hidden
							className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
						>
							{t("toolbar.roomLabel")}
						</span>
						{[null, ...rooms].map((entry) => (
							<button
								key={entry ?? "all"}
								type="button"
								aria-pressed={room === entry}
								onClick={() => setRoom(entry)}
								className={cn(
									CHIP_CLASSNAME,
									room === entry
										? "border-transparent bg-primary text-primary-foreground"
										: "border-border-subtle text-muted-foreground hover:text-foreground",
								)}
							>
								{entry ?? t("toolbar.allRooms")}
							</button>
						))}
					</fieldset>
				)}

				<div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
					<div className="flex min-w-0 flex-col gap-3">
						<div className="flex items-baseline justify-between gap-2">
							<h2 className="text-sm font-semibold text-foreground">
								{t("list.title")}
							</h2>
							{scenes.length > 0 && (
								<span className="text-xs text-muted-foreground">
									{t("list.hint")}
								</span>
							)}
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
										? "grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
										: "divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-container",
								)}
							>
								{renderItems()}
							</ul>
						)}
					</div>

					<aside className="xl:sticky xl:top-4">
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
					</aside>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<span className="text-xs font-medium uppercase tracking-wider text-primary">
						{t("header.eyebrow")}
					</span>
					<h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
						{t("title")}
						{isError && scenesData && <StaleDataIndicator />}
					</h1>
					<p className="max-w-xl text-sm text-muted-foreground">
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
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="h-4 w-4" />
							</button>
						))}
					</fieldset>

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
