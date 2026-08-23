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
		<div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
			{SCENES.map(({ key, labelKey, icon: Icon }) => (
				<Pill
					key={key}
					active={activeScene === key}
					onClick={() =>
						setActiveScene((current) => (current === key ? null : key))
					}
				>
					<Icon className="w-4 h-4" />
					{t(labelKey)}
				</Pill>
			))}
		</div>
	);
}
