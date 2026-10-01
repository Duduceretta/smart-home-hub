import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { StaleDataIndicator } from "@/core/components/feedback/StaleDataIndicator";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { useActivateScene } from "../hooks/useActivateScene";
import { useDeleteScene } from "../hooks/useDeleteScene";
import { useScenes } from "../hooks/useScenes";
import { useScenesUIStore } from "../store/scenes-ui.store";
import type { Scene } from "../types/scenes.types";
import { SceneEditorSheet } from "./editor/SceneEditorSheet";
import { SceneEmptyState } from "./gallery/SceneEmptyState";
import { SceneGallery } from "./gallery/SceneGallery";
import { SceneGallerySkeleton } from "./gallery/scene-gallery.skeleton";

/**
 * Tela de Cenas — galeria de atmosferas. Diferente de Cômodos e Grupos
 * (master-detail), aqui o conteúdo é a própria grade: tocar num cartão ativa a
 * cena; criar e editar acontece num painel lateral (editor).
 */
export function ScenesView() {
	const { t } = useTranslation("scenes");
	const confirm = useConfirm();

	const { data: scenesData, isLoading, isError, refetch } = useScenes();
	const scenes = scenesData ?? [];

	const openCreateEditor = useScenesUIStore((s) => s.openCreateEditor);
	const openEditEditor = useScenesUIStore((s) => s.openEditEditor);
	const activateScene = useActivateScene();
	const deleteScene = useDeleteScene();

	const activatingSceneId = activateScene.isPending
		? (activateScene.variables ?? null)
		: null;

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

				<Button onClick={() => openCreateEditor()} className="shrink-0">
					<Plus />
					{t("header.addButton")}
				</Button>
			</header>

			{isError && !scenesData ? (
				<CardErrorFallback
					message={t("page.loadError")}
					retryLabel={t("page.retry")}
					onRetry={() => refetch()}
					className="flex-col justify-center gap-3 rounded-xl bg-surface-low/50 p-6 text-center text-sm"
				/>
			) : isLoading ? (
				<SceneGallerySkeleton />
			) : scenes.length === 0 ? (
				<SceneEmptyState
					onStartFromSuggestion={(seed) => openCreateEditor(seed)}
					onStartFromScratch={() => openCreateEditor()}
				/>
			) : (
				<SceneGallery
					scenes={scenes}
					activatingSceneId={activatingSceneId}
					onActivate={(scene) => activateScene.mutate(scene.id)}
					onEdit={openEditEditor}
					onDelete={handleDelete}
					onCreate={() => openCreateEditor()}
				/>
			)}

			<SceneEditorSheet />
		</div>
	);
}
