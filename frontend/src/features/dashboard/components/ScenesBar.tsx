import { Home, LogOut, Moon, PlaySquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pill } from "./Pill";

const SCENES = [
	{ key: "arriveHome", icon: Home },
	{ key: "movieMode", icon: PlaySquare },
	{ key: "sleepMode", icon: Moon },
	{ key: "leaveHome", icon: LogOut },
] as const;

/**
 * Placeholder visual — sem onClick funcional/mutations. Cenas configuráveis
 * ficam para uma etapa futura que envolveria uma feature de backend própria.
 */
export function ScenesBar() {
	const { t } = useTranslation("dashboard");
	const [activeScene, setActiveScene] = useState<string | null>(null);

	return (
		<div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
			{SCENES.map(({ key, icon: Icon }) => (
				<Pill
					key={key}
					active={activeScene === key}
					onClick={() =>
						setActiveScene((current) => (current === key ? null : key))
					}
				>
					<Icon className="w-4 h-4" />
					{t(`scenesBar.${key}`)}
				</Pill>
			))}
		</div>
	);
}
