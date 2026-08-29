import type { AutomationView } from "../types/automations.types";

interface AutomationSummaryBarProps {
	automations: AutomationView[];
}

/**
 * Faixa de contexto rápido — uma linha, sem card dedicado. Densidade sobre
 * respiro: isso não é um dashboard, é só "quantas ativas, pausadas, quantas
 * incompletas" pra orientar o olhar antes do grid. Sem métrica de "falhas
 * hoje" — o backend não rastreia execução ainda (ver `AutomationView`).
 */
export function AutomationSummaryBar({
	automations,
}: AutomationSummaryBarProps) {
	const activeCount = automations.filter((a) => a.isActive).length;
	const inactiveCount = automations.length - activeCount;
	const draftCount = automations.filter((a) => a.isDraft).length;

	return (
		<div className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
			<span>
				<span className="font-semibold tabular-nums text-foreground">
					{activeCount}
				</span>{" "}
				ativas
			</span>
			<span className="text-muted-foreground/40">·</span>
			<span>
				<span className="font-semibold tabular-nums text-foreground">
					{inactiveCount}
				</span>{" "}
				pausadas
			</span>
			{draftCount > 0 && (
				<>
					<span className="text-muted-foreground/40">·</span>
					<span>
						<span className="font-semibold tabular-nums text-foreground">
							{draftCount}
						</span>{" "}
						{draftCount === 1 ? "incompleta" : "incompletas"}
					</span>
				</>
			)}
		</div>
	);
}
