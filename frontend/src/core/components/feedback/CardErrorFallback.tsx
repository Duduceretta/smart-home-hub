import type { ReactNode } from "react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/utils";

interface CardErrorFallbackProps {
	/** Mensagem de erro exibida ao lado do botão de retry. Ignorada se `children` for passado. */
	message?: ReactNode;
	children?: ReactNode;
	/** Texto do botão de retry — cada chamador traduz no próprio namespace (ex: `t("energy.retry")`). */
	retryLabel: string;
	onRetry: () => void;
	/** Ajusta dimensão/superfície por chamador (ex: `bg-surface-low/50`) preservando paridade com o skeleton do card. */
	className?: string;
}

/**
 * Fallback local de erro (seção 12.5 de `ui-and-design-system.md`) — container
 * neutro `border-dashed`, nunca vermelho/`destructive`. Extraído de 6 cópias
 * idênticas (`DeviceEnergyChart`, `RoomEnergyChart`, `RoomClimateSection`,
 * `DeviceLinkedAutomations`, `RoomLinkedAutomations`, `DeviceGroupLinkedAutomations`)
 * mais `DeviceListPanel`. `role="alert"` já embutido — não repetir no chamador.
 */
export function CardErrorFallback({
	message,
	children,
	retryLabel,
	onRetry,
	className,
}: CardErrorFallbackProps) {
	return (
		<div
			role="alert"
			className={cn(
				"flex items-center justify-between rounded-lg border border-dashed border-border-subtle p-3 text-xs text-muted-foreground",
				className,
			)}
		>
			<span>{children ?? message}</span>
			<Button variant="ghost" size="xs" onClick={onRetry}>
				{retryLabel}
			</Button>
		</div>
	);
}
