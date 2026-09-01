import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useScrollFade } from "@/core/hooks/useScrollFade";
import { cn } from "@/core/utils";
import { SCENES } from "../constants/dashboard.constants";
import { Pill } from "./Pill";

/**
 * Placeholder visual — sem onClick funcional/mutations. Cenas configuráveis
 * ficam para uma etapa futura que envolveria uma feature de backend própria.
 */
export function ScenesBar() {
	const { t } = useTranslation("dashboard");
	const [activeScene, setActiveScene] = useState<string | null>(null);
	const { ref, showLeftFade, showRightFade } = useScrollFade<HTMLDivElement>();

	return (
		<div className="relative">
			<div
				ref={ref}
				className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1 pr-8 md:flex-wrap md:overflow-visible md:pr-0"
			>
				{SCENES.map(({ key, labelKey, icon: Icon }) => (
					<Pill
						key={key}
						active={activeScene === key}
						onClick={() =>
							setActiveScene((current) => (current === key ? null : key))
						}
					>
						<Icon className="h-4 w-4 shrink-0" />
						<span>{t(labelKey)}</span>
					</Pill>
				))}
			</div>
			{/* Fades indicando scroll horizontal — só existem <md, onde a fileira
			 * ainda rola (a partir de md ela quebra linha via flex-wrap). Opacidade
			 * segue a posição real do scroll (useScrollFade), não fica sempre
			 * visível nem falta indicar que dá pra voltar. */}
			<div
				className={cn(
					"pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity duration-150 md:hidden",
					showLeftFade ? "opacity-100" : "opacity-0",
				)}
			/>
			<div
				className={cn(
					"pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-150 md:hidden",
					showRightFade ? "opacity-100" : "opacity-0",
				)}
			/>
		</div>
	);
}
