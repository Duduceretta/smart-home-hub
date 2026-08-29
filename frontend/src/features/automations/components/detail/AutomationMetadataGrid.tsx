import { formatRelativeTime } from "../../lib/format-relative-time";
import type { AutomationView } from "../../types/automations.types";

interface AutomationMetadataGridProps {
	automation: AutomationView;
}

function MetadataCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-3.5">
			<div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</div>
			<p className="text-xs font-medium text-foreground">{value}</p>
		</div>
	);
}

/** Grid Criada / Atualizada / Última execução. */
export function AutomationMetadataGrid({
	automation,
}: AutomationMetadataGridProps) {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<MetadataCard
				label="Criada"
				value={formatRelativeTime(automation.createdAt)}
			/>
			<MetadataCard
				label="Atualizada"
				value={
					automation.updatedAt
						? formatRelativeTime(automation.updatedAt)
						: "Nunca"
				}
			/>
			<MetadataCard
				label="Última execução"
				value={formatRelativeTime(automation.lastExecutedAt)}
			/>
		</div>
	);
}
