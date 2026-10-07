import { ChartNoAxesColumn } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";

interface MetricCardProps {
	title: string;
	/** Complemento curto ao lado do título (ex: o período). */
	hint?: string;
	children: ReactNode;
	/** Ex.: `flex-1` para o card absorver a altura que sobrar na coluna. */
	className?: string;
}

/**
 * Casca de um card de métrica: título em caixa alta e conteúdo. Cada métrica é um card
 * próprio (e não uma lista de linhas) porque cada uma tem o seu gráfico.
 */
export function MetricCard({
	title,
	hint,
	children,
	className,
}: MetricCardProps) {
	return (
		<section
			aria-label={title}
			className={cn(
				"flex min-w-0 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-container p-4",
				className,
			)}
		>
			<header className="flex items-baseline justify-between gap-2">
				<h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{title}
				</h4>
				{hint && <span className="text-xs text-muted-foreground">{hint}</span>}
			</header>
			{children}
		</section>
	);
}

/**
 * Estado vazio de um card: o card continua na tela, com a área do gráfico marcada e a
 * explicação, em vez de sumir ou mostrar zeros que pareceriam medição.
 */
export function MetricEmpty({ className }: { className?: string }) {
	const { t } = useTranslation("scenes");

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-subtle bg-surface-low/30 py-4 text-center",
				className,
			)}
		>
			<ChartNoAxesColumn
				className="h-4 w-4 text-muted-foreground"
				aria-hidden
			/>
			<p className="text-xs text-muted-foreground">{t("metrics.empty")}</p>
		</div>
	);
}

/** Estilo do tooltip dos gráficos: mesmos tokens do tooltip do gráfico de energia dos cômodos. */
export const CHART_TOOLTIP_STYLE = {
	backgroundColor: "var(--color-popover)",
	borderColor: "var(--color-border-subtle)",
	borderRadius: "8px",
	color: "var(--color-foreground)",
	fontSize: "12px",
} as const;
