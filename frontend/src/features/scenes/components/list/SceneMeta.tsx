import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Scene } from "../../types/scenes.types";

interface SceneMetaProps {
	scene: Scene;
	offlineCount: number;
}

/**
 * Linha de metadados de uma cena: quantos dispositivos, quantos ligam e, quando há,
 * quantos estão offline agora (a ativação os pularia).
 */
export function SceneMeta({ scene, offlineCount }: SceneMetaProps) {
	const { t } = useTranslation("scenes");
	const turnsOn = scene.items.filter((item) => item.isOn).length;

	if (scene.items.length === 0) {
		return (
			<span className="rounded-full bg-alert/15 px-2 py-1 text-xs font-medium text-alert-foreground">
				{t("row.empty")}
			</span>
		);
	}

	return (
		<span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
			<span>{t("row.deviceCount", { count: scene.items.length })}</span>
			<span aria-hidden>·</span>
			<span>
				{turnsOn > 0
					? t("row.turnsOn", { count: turnsOn })
					: t("row.turnsOffAll")}
			</span>
			{offlineCount > 0 && (
				<span className="flex items-center gap-1 text-alert-foreground">
					<TriangleAlert className="h-3 w-3" aria-hidden />
					{t("row.offline", { count: offlineCount })}
				</span>
			)}
		</span>
	);
}
