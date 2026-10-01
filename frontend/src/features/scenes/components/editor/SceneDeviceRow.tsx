import { Check } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { supportsLightAttributes } from "../../lib/scene-devices";
import type { SceneFormItem } from "../../types/scene.schemas";
import type { SceneDevice } from "../../types/scenes.types";
import { SceneLightControls } from "./SceneLightControls";

interface SceneDeviceRowProps {
	device: SceneDevice;
	/** Item da cena para este dispositivo; `undefined` quando ele não faz parte da cena. */
	item: SceneFormItem | undefined;
	onToggleIncluded: (device: SceneDevice) => void;
	onChangeItem: (deviceId: string, patch: Partial<SceneFormItem>) => void;
}

/**
 * Linha de um dispositivo no editor: marcar inclui o dispositivo com o estado
 * atual dele; depois dá para escolher ligar/desligar e, em luz Tuya local que
 * liga, ajustar brilho, temperatura e cor.
 */
export function SceneDeviceRow({
	device,
	item,
	onToggleIncluded,
	onChangeItem,
}: SceneDeviceRowProps) {
	const { t } = useTranslation("scenes");
	const switchId = useId();
	const isIncluded = item !== undefined;
	const showLightControls =
		isIncluded && item.isOn && supportsLightAttributes(device);

	return (
		<li
			className={cn(
				"flex flex-col gap-4 rounded-xl border bg-surface-high p-4 transition-colors",
				isIncluded ? "border-primary/40" : "border-border-subtle",
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<label className="flex min-w-0 cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={isIncluded}
						onChange={() => onToggleIncluded(device)}
						aria-label={t("editor.include", { name: device.name })}
						className="peer sr-only"
					/>
					<span
						aria-hidden
						className={cn(
							"flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
							isIncluded
								? "border-primary bg-primary text-primary-foreground"
								: "border-border-subtle bg-surface-container",
						)}
					>
						{isIncluded && <Check className="h-3.5 w-3.5" />}
					</span>
					<span className="truncate text-sm font-medium text-foreground">
						{device.name}
					</span>
					{!device.isOnline && (
						<span className="shrink-0 rounded-full bg-surface-highest px-2 py-1 text-xs text-muted-foreground">
							{t("editor.offline")}
						</span>
					)}
				</label>

				{isIncluded && (
					<div className="flex shrink-0 items-center gap-2">
						<label
							htmlFor={switchId}
							className="cursor-pointer text-xs text-muted-foreground"
						>
							{item.isOn ? t("editor.turnsOn") : t("editor.turnsOff")}
						</label>
						<Switch
							id={switchId}
							checked={item.isOn}
							aria-label={t("editor.turnOn", { name: device.name })}
							onCheckedChange={(checked) =>
								onChangeItem(device.id, { isOn: checked })
							}
						/>
					</div>
				)}
			</div>

			{showLightControls && (
				<SceneLightControls
					deviceName={device.name}
					value={item}
					onChange={(patch) => onChangeItem(device.id, patch)}
				/>
			)}
		</li>
	);
}
