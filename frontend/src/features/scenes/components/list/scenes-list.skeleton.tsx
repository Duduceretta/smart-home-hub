const SKELETON_ROW_IDS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

/**
 * Espelha a lista de cenas (linhas com ícone, nome e faixa de luz) e a coluna lateral,
 * para a troca skeleton → dados não deslocar o layout.
 */
export function ScenesListSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className="grid animate-pulse grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]"
		>
			<div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-container">
				{SKELETON_ROW_IDS.map((id) => (
					<div key={id} className="flex items-center gap-4 px-4 py-3">
						<div className="h-8 w-8 rounded-full bg-surface-high" />
						<div className="h-8 w-8 rounded-lg bg-surface-high" />
						<div className="flex w-48 flex-col gap-2">
							<div className="h-4 w-32 rounded-md bg-surface-high" />
							<div className="h-3 w-24 rounded-md bg-surface-high/60" />
						</div>
						<div className="h-2 flex-1 rounded-full bg-surface-high" />
					</div>
				))}
			</div>
			<div className="hidden h-72 rounded-xl border border-border-subtle bg-surface-container xl:block" />
		</div>
	);
}
