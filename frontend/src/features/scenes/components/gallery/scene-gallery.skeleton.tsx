const SKELETON_CARD_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

/**
 * Espelha a grade da galeria (mesmos cartões `min-h-56`, mesma grade responsiva)
 * para a troca skeleton → dados não deslocar o layout.
 */
export function SceneGallerySkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
		>
			{SKELETON_CARD_IDS.map((id) => (
				<div
					key={id}
					className="flex min-h-56 flex-col justify-between rounded-2xl border border-border-subtle bg-surface-container p-4"
				>
					<div className="h-10 w-10 rounded-xl bg-surface-high" />
					<div className="flex flex-col gap-2">
						<div className="h-6 w-2/3 rounded-md bg-surface-high" />
						<div className="h-4 w-1/2 rounded-md bg-surface-high/60" />
					</div>
				</div>
			))}
		</div>
	);
}
