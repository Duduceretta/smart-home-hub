import { cn } from "@/core/utils";

interface ScrollFadeBottomProps {
	/** Token de superfície de origem do gradiente — precisa bater com o
	 * `bg-*` real do container ao redor (`from-popover` num Dialog,
	 * `from-surface-low` num painel, etc). */
	fromClassName?: string;
	className?: string;
}

/**
 * Indicador de fade-out no fim de uma área com rolagem própria (Dialogs,
 * wizards) — padrão obrigatório do design system pra sinalizar conteúdo
 * cortado abaixo da dobra. Deve ficar dentro de um wrapper `relative`.
 */
export function ScrollFadeBottom({
	fromClassName = "from-popover",
	className,
}: ScrollFadeBottomProps) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t to-transparent",
				fromClassName,
				className,
			)}
		/>
	);
}
