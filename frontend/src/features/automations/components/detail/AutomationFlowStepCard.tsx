import type { ComponentType, ReactNode } from "react";

interface AutomationFlowStepCardProps {
	icon?: ComponentType<{ className?: string }>;
	label: string;
	children: ReactNode;
}

/**
 * Card padrão dos blocos do fluxo de automação (Gatilho, Condição, Ações) —
 * label em destaque com ícone opcional acima, conteúdo livre abaixo.
 */
export function AutomationFlowStepCard({
	icon: Icon,
	label,
	children,
}: AutomationFlowStepCardProps) {
	return (
		<div className="rounded-lg border border-border-subtle/20 bg-surface-container p-4">
			<div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{Icon && <Icon className="h-3.5 w-3.5" />}
				{label}
			</div>
			{children}
		</div>
	);
}
