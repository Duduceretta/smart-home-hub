import { useTranslation } from "react-i18next";
import { getSceneIcon } from "../../constants/scenes.constants";
import { buildSceneBackdrop, sceneItemTone } from "../../lib/scene-wash";
import type { SceneFormItem } from "../../types/scene.schemas";
import type { SceneDevice } from "../../types/scenes.types";

/** Linhas do resumo "ao ativar": acima disso vira "+N" para a prévia não crescer sem fim. */
const MAX_PREVIEW_LINES = 5;

/** Tipo assumido para o wash quando o dispositivo ainda não chegou na lista carregada. */
const FALLBACK_DEVICE_TYPE = 2;

interface SceneStageProps {
	name: string;
	iconId: string | undefined;
	items: SceneFormItem[];
	devices: SceneDevice[];
}

/**
 * "Palco" da página de edição: reproduz ao vivo o clima da cena (o mesmo light wash
 * da lista) e resume o que ela fará ao ser ativada. Só leitura: tudo o que o usuário
 * escolhe no formulário aparece aqui na hora.
 */
export function SceneStage({ name, iconId, items, devices }: SceneStageProps) {
	const { t } = useTranslation("scenes");
	const Icon = getSceneIcon(iconId);
	const deviceById = new Map(devices.map((device) => [device.id, device]));

	const entries = items.map((item) => {
		const device = deviceById.get(item.deviceId);
		const deviceType = device?.type ?? FALLBACK_DEVICE_TYPE;

		return {
			item,
			name: device?.name ?? item.deviceId,
			deviceType,
			tone: sceneItemTone({ ...item, deviceType }),
		};
	});

	const backdrop = buildSceneBackdrop(
		entries.map(({ item, deviceType }) => ({
			deviceType,
			isOn: item.isOn,
			brightness: item.brightness,
			colorHex: item.colorHex,
		})),
	);
	const visible = entries.slice(0, MAX_PREVIEW_LINES);
	const hiddenCount = entries.length - visible.length;

	return (
		<div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-container">
			<div className="relative isolate flex min-h-44 flex-col justify-between gap-4 border-b border-border-subtle p-6">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 -z-10"
					style={backdrop ? { backgroundImage: backdrop } : undefined}
				/>
				<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high/80 text-foreground ring-1 ring-border-subtle">
					<Icon className="h-5 w-5" />
				</span>
				<div className="flex flex-col gap-1">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("editor.stage.preview")}
					</span>
					<p className="break-words text-2xl font-semibold tracking-tight text-foreground">
						{name.trim() || t("editor.stage.noName")}
					</p>
					<span className="text-sm text-muted-foreground">
						{items.length > 0
							? t("editor.selectedCount", { count: items.length })
							: t("editor.stage.noDevices")}
					</span>
				</div>
			</div>

			<ul className="flex flex-col gap-2 p-4">
				{visible.length === 0 ? (
					<li className="text-sm text-muted-foreground">
						{t("editor.stage.hint")}
					</li>
				) : (
					visible.map(({ item, name: deviceName, tone }) => (
						<li
							key={item.deviceId}
							className="flex items-center gap-2 text-sm text-foreground"
						>
							<span
								aria-hidden
								className="h-2 w-2 shrink-0 rounded-full border border-muted-foreground/60"
								style={
									tone
										? { backgroundColor: tone, borderColor: "transparent" }
										: undefined
								}
							/>
							<span className="min-w-0 flex-1 truncate">{deviceName}</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{item.isOn
									? item.brightness !== null
										? `${t("editor.turnsOn")} · ${item.brightness}%`
										: t("editor.turnsOn")
									: t("editor.turnsOff")}
							</span>
						</li>
					))
				)}
				{hiddenCount > 0 && (
					<li className="text-xs text-muted-foreground">
						{t("editor.stage.more", { count: hiddenCount })}
					</li>
				)}
			</ul>
		</div>
	);
}
