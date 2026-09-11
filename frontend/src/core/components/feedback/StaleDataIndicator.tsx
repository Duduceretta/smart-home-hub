import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";

interface StaleDataIndicatorProps {
	className?: string;
}

/**
 * Indicador discreto de dados desatualizados (seção 12.1 de
 * `ui-and-design-system.md` — Stale-While-Revalidate). Usado quando um
 * refetch em background falha (`isError`) mas o TanStack Query ainda tem
 * `data` de um fetch anterior bem-sucedido: o conteúdo normal continua na
 * tela com os dados em cache, só ganha esse ícone — nunca o fallback de
 * erro completo, reservado pro caso de não haver cache nenhum.
 *
 * `title` nativo (mesmo padrão já usado no projeto, ex: badge de energia
 * estimada em `StatusHubSummary.tsx`) em vez de um componente de Tooltip
 * novo — não há Tooltip Radix no design system ainda, e esse é o único
 * consumo até agora.
 */
export function StaleDataIndicator({ className }: StaleDataIndicatorProps) {
	const { t } = useTranslation("common");
	const label = t(
		"status.staleData",
		"Dados desatualizados — não foi possível atualizar agora.",
	);

	return (
		<AlertCircle
			className={cn("h-3 w-3 shrink-0 text-warm", className)}
			aria-label={label}
			{...({ title: label } as Record<string, string>)}
		/>
	);
}
