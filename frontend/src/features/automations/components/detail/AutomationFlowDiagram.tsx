import { ArrowDown, Zap } from "lucide-react";
import type { ComponentType } from "react";
import type { AutomationView } from "../../types/automations.types";
import { AutomationFlowStepCard } from "./AutomationFlowStepCard";

interface AutomationFlowDiagramProps {
	automation: AutomationView;
	triggerIcon: ComponentType<{ className?: string }>;
}

/**
 * Fluxo visual Gatilho → Condição (opcional) → Ações, cada etapa separada
 * por uma seta.
 */
export function AutomationFlowDiagram({
	automation,
	triggerIcon: TriggerIcon,
}: AutomationFlowDiagramProps) {
	return (
		<>
			<AutomationFlowStepCard icon={TriggerIcon} label="Gatilho">
				<p className="text-sm font-medium text-foreground">
					{automation.triggerSummary}
				</p>
			</AutomationFlowStepCard>

			{automation.conditionSummary && (
				<>
					<ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/60" />
					<AutomationFlowStepCard label="Condição">
						<p className="text-sm font-medium text-foreground">
							{automation.conditionSummary}
						</p>
					</AutomationFlowStepCard>
				</>
			)}

			<ArrowDown className="mx-auto h-4 w-4 text-muted-foreground/60" />

			<AutomationFlowStepCard icon={Zap} label="Ações">
				{automation.actionSummaries.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						Nenhuma ação configurada ainda.
					</p>
				) : (
					<ul className="space-y-1.5">
						{automation.actionSummaries.map((action) => (
							<li key={action} className="text-sm font-medium text-foreground">
								• {action}
							</li>
						))}
					</ul>
				)}
			</AutomationFlowStepCard>
		</>
	);
}
