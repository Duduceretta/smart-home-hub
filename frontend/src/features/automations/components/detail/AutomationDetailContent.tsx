import type { ComponentType } from "react";
import type { AutomationView } from "../../types/automations.types";
import { AutomationExecutionSection } from "./AutomationExecutionSection";
import { AutomationFlowDiagram } from "./AutomationFlowDiagram";
import { AutomationMetadataGrid } from "./AutomationMetadataGrid";

interface AutomationDetailContentProps {
	automation: AutomationView;
	triggerIcon: ComponentType<{ className?: string }>;
}

/**
 * Corpo do painel de detalhe da automação — fluxo gatilho/condição/ações,
 * metadados (criada/atualizada/última execução) e histórico de execuções.
 */
export function AutomationDetailContent({
	automation,
	triggerIcon,
}: AutomationDetailContentProps) {
	return (
		<div className="relative min-h-0 flex-1">
			<div className="h-full overflow-y-auto pt-4 lg:p-5 scrollbar-gutter-stable scrollbar-thin">
				<div key={automation.id} className="space-y-4 animate-fade-in">
					<AutomationFlowDiagram
						automation={automation}
						triggerIcon={triggerIcon}
					/>

					<AutomationMetadataGrid automation={automation} />

					<AutomationExecutionSection automationId={automation.id} />
				</div>
			</div>
		</div>
	);
}
