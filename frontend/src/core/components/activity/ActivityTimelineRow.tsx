import type { LucideIcon } from "lucide-react";

interface ActivityTimelineRowProps {
	icon: LucideIcon;
	/** Classe Tailwind de cor pro ícone (ex: "text-primary"). */
	iconColorClassName: string;
	/** Classe Tailwind de cor pra borda do círculo do ícone (ex: "border-primary"). */
	borderColorClassName: string;
	title: string;
	description: string;
	relativeTime: string;
}

/**
 * Linha de uma timeline de atividade (ícone circulado + título + descrição +
 * tempo relativo) — puramente apresentacional, sem saber de "tipo de
 * evento" nenhum (isso é decisão de quem chama). Mora em `core/` porque é
 * reaproveitada por features diferentes (dashboard's ActivityLogTimeline e
 * automations' histórico de execução) sem que uma importe da outra.
 */
export function ActivityTimelineRow({
	icon: Icon,
	iconColorClassName,
	borderColorClassName,
	title,
	description,
	relativeTime,
}: ActivityTimelineRowProps) {
	return (
		<div className="relative z-10 flex gap-4 items-start">
			<div
				className={`w-6 h-6 rounded-full bg-surface-high border-2 flex items-center justify-center shrink-0 mt-0.5 ${borderColorClassName}`}
			>
				<Icon className={`w-3 h-3 ${iconColorClassName}`} />
			</div>
			<div className="flex flex-col min-w-0">
				<span className="text-sm text-foreground truncate">{title}</span>
				<span className="text-xs text-muted-foreground truncate">
					{description}
				</span>
				<span className="text-xs text-muted-foreground/60 mt-0.5 uppercase">
					{relativeTime}
				</span>
			</div>
		</div>
	);
}
