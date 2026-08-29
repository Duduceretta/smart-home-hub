import type { AutomationFilterCounts } from "../../types/automations.types";

interface AutomationSummaryBarProps {
	counts: AutomationFilterCounts | undefined;
}

/**
 * Faixa de contexto rápido — uma linha, sem card dedicado. Densidade sobre
 * respiro: isso não é um dashboard, é só "quantas ativas, pausadas, quantas
 * incompletas" pra orientar o olhar antes do grid. Contagens vêm de
 * `useAutomationFilterCounts` (query própria, agregada no backend) — nunca
 * `.filter().length` sobre a lista carregada, que com scroll infinito real
 * nunca tem todos os itens em memória.
 */
export function AutomationSummaryBar({ counts }: AutomationSummaryBarProps) {
	const activeCount = counts?.active ?? 0;
	const inactiveCount = counts?.inactive ?? 0;
	const draftCount = counts?.draft ?? 0;

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
