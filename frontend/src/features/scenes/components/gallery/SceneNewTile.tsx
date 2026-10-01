import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SceneNewTileProps {
	onCreate: () => void;
}

/**
 * Último tile da galeria: convite discreto a criar outra cena. Mesmo formato
 * dos cartões para a grade não ter "buraco" no fim.
 */
export function SceneNewTile({ onCreate }: SceneNewTileProps) {
	const { t } = useTranslation("scenes");

	return (
		<button
			type="button"
			onClick={onCreate}
			className="group flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-subtle bg-surface-container/30 p-4 text-center outline-none transition-colors hover:border-primary/40 hover:bg-surface-container/60 focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high text-muted-foreground transition-colors group-hover:text-primary">
				<Plus className="h-5 w-5" />
			</span>
			<span className="text-lg font-medium text-foreground">
				{t("newTile.title")}
			</span>
			<span className="text-sm text-muted-foreground">
				{t("newTile.subtitle")}
			</span>
		</button>
	);
}
