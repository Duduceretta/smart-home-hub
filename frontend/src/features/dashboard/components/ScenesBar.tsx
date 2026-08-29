import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SCENES } from "../constants/dashboard.constants";
import { Pill } from "./Pill";

/**
 * Placeholder visual — sem onClick funcional/mutations. Cenas configuráveis
 * ficam para uma etapa futura que envolveria uma feature de backend própria.
 */
export function ScenesBar() {
	const { t } = useTranslation("dashboard");
	const [activeScene, setActiveScene] = useState<string | null>(null);

	return (
		<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none md:flex-wrap md:overflow-visible">
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
	);
}
