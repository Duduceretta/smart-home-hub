import type { Scene } from "../../types/scenes.types";
import { SceneCard } from "./SceneCard";
import { SceneNewTile } from "./SceneNewTile";

interface SceneGalleryProps {
	scenes: Scene[];
	activatingSceneId: string | null;
	onActivate: (scene: Scene) => void;
	onEdit: (scene: Scene) => void;
	onDelete: (scene: Scene) => void;
	onCreate: () => void;
}

/**
 * Galeria de cenas: grade de cartões "pôster" (1 coluna no celular, 2 no tablet,
 * 3 no desktop) terminada por um tile de nova cena — o conteúdo é o protagonista,
 * sem painel lateral de detalhe como nas telas de cômodos e grupos.
 */
export function SceneGallery({
	scenes,
	activatingSceneId,
	onActivate,
	onEdit,
	onDelete,
	onCreate,
}: SceneGalleryProps) {
	return (
		<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{scenes.map((scene) => (
				<li key={scene.id}>
					<SceneCard
						scene={scene}
						isActivating={activatingSceneId === scene.id}
						onActivate={onActivate}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				</li>
			))}
			<li>
				<SceneNewTile onCreate={onCreate} />
			</li>
		</ul>
	);
}
