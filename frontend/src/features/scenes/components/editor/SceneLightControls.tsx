import { useTranslation } from "react-i18next";
import { Slider } from "@/core/components/ui/slider";
import { cn } from "@/core/utils";
import { SCENE_COLOR_PRESETS } from "../../constants/scene-colors";
import type { SceneFormItem } from "../../types/scene.schemas";

/** Valor mostrado quando o slider ainda não foi mexido (a cena não altera o atributo). */
const UNTOUCHED_SLIDER_POSITION = 100;

type LightAttributes = Pick<
	SceneFormItem,
	"brightness" | "colorHex" | "colorTempPercent"
>;

interface SceneLightControlsProps {
	deviceName: string;
	value: LightAttributes;
	onChange: (patch: Partial<LightAttributes>) => void;
}

interface AttributeSliderProps {
	groupLabel: string;
	label: string;
	hint?: string;
	value: number | null;
	onChange: (next: number | null) => void;
}

/**
 * Slider de um atributo de luz com semântica de 3 estados: `null` = a cena não mexe
 * (rótulo "Não alterar"), número = valor que a cena aplica. Mexer no slider sai do
 * "não alterar"; o botão volta a ele.
 */
function AttributeSlider({
	groupLabel,
	label,
	hint,
	value,
	onChange,
}: AttributeSliderProps) {
	const { t } = useTranslation("scenes");

	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
			<legend className="sr-only">{groupLabel}</legend>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
				<span className="flex items-center gap-2">
					<span className="text-sm text-foreground">
						{value === null ? t("editor.lightControls.unchanged") : `${value}%`}
					</span>
					{value !== null && (
						<button
							type="button"
							onClick={() => onChange(null)}
							className="cursor-pointer rounded-md px-1 text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							{t("editor.lightControls.keepUnchanged")}
						</button>
					)}
				</span>
			</div>
			<Slider
				min={0}
				max={100}
				step={1}
				value={[value ?? UNTOUCHED_SLIDER_POSITION]}
				onValueChange={([next]) => onChange(next ?? null)}
				className={cn(value === null && "opacity-60")}
			/>
			{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
		</fieldset>
	);
}

/**
 * Controles de luz de um item de cena: brilho, temperatura de cor e cor. Só aparece
 * para luz Tuya local que a cena liga (a API recusa atributo nos demais).
 */
export function SceneLightControls({
	deviceName,
	value,
	onChange,
}: SceneLightControlsProps) {
	const { t } = useTranslation("scenes");

	const isPreset = SCENE_COLOR_PRESETS.some(
		(preset) => preset.hex.toLowerCase() === value.colorHex?.toLowerCase(),
	);

	return (
		<div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
			<AttributeSlider
				groupLabel={t("editor.lightControls.brightnessGroup", {
					name: deviceName,
				})}
				label={t("editor.lightControls.brightness")}
				value={value.brightness}
				onChange={(next) => onChange({ brightness: next })}
			/>

			<AttributeSlider
				groupLabel={t("editor.lightControls.colorTempGroup", {
					name: deviceName,
				})}
				label={t("editor.lightControls.colorTemp")}
				hint={`${t("editor.lightControls.colorTempWarm")} — ${t("editor.lightControls.colorTempCool")}`}
				value={value.colorTempPercent}
				onChange={(next) => onChange({ colorTempPercent: next })}
			/>

			<fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
				<legend className="sr-only">
					{t("editor.lightControls.colorGroup", { name: deviceName })}
				</legend>
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("editor.lightControls.color")}
				</span>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						aria-label={t("editor.colors.none")}
						aria-pressed={value.colorHex === null}
						onClick={() => onChange({ colorHex: null })}
						className={cn(
							"flex h-8 cursor-pointer items-center rounded-full border px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
							value.colorHex === null
								? "border-primary/50 bg-primary/10 text-primary"
								: "border-border-subtle text-muted-foreground hover:text-foreground",
						)}
					>
						{t("editor.colors.none")}
					</button>

					{value.colorHex && !isPreset && (
						<button
							type="button"
							aria-label={t("editor.colors.custom")}
							aria-pressed
							className="h-8 w-8 cursor-pointer rounded-full border-2 border-primary outline-none"
							style={{ backgroundColor: value.colorHex }}
						/>
					)}

					{SCENE_COLOR_PRESETS.map((preset) => {
						const isSelected =
							preset.hex.toLowerCase() === value.colorHex?.toLowerCase();

						return (
							<button
								key={preset.id}
								type="button"
								aria-label={t(preset.labelKey, preset.id)}
								aria-pressed={isSelected}
								onClick={() => onChange({ colorHex: preset.hex })}
								className={cn(
									"h-8 w-8 cursor-pointer rounded-full border-2 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring/50 motion-safe:hover:scale-105",
									isSelected ? "border-primary" : "border-border-subtle",
								)}
								style={{ backgroundColor: preset.hex }}
							/>
						);
					})}
				</div>
			</fieldset>
		</div>
	);
}
