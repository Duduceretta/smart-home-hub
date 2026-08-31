import { Lightbulb } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSetDeviceBrightness } from "../../../hooks/useSetDeviceBrightness";
import { useSetDeviceColor } from "../../../hooks/useSetDeviceColor";
import { useToggleDevice } from "../../../hooks/useToggleDevice";
import type { DeviceControlPanelProps } from "./device-control-panel.types";

const PRESET_COLORS = [
	"#FF0000",
	"#00FF00",
	"#0000FF",
	"#FFA500",
	"#FF00FF",
	"#FFFFFF",
];

/**
 * Controles de Luz — brilho (slider real, comando enviado ao soltar — não a
 * cada pixel arrastado — via `PUT /devices/{id}/brightness`, convertido
 * server-side pra escala real do DP) + toggle grande + seletor de cor
 * (quando `device.supportsColor`, `PUT /devices/{id}/color`). Migrado do
 * bloco `isLight` de `DeviceCard.tsx` (removido), não duplicado.
 *
 * Sem estado de brilho/cor vindos do GET (write-only, sem DP de leitura
 * exposto pela API) — o slider/swatch começam num valor local (80%/sem cor
 * selecionada) e refletem só a última intenção enviada nesta sessão, não o
 * estado real atual do bulbo.
 */
export function LightControlPanel({ device }: DeviceControlPanelProps) {
	const { t } = useTranslation("devices");
	const [brightness, setBrightness] = useState(80);
	const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);
	const lastCommittedBrightnessRef = useRef(80);

	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();
	const { mutate: setBrightness_, isPending: isSettingBrightness } =
		useSetDeviceBrightness();
	const { mutate: setColor, isPending: isSettingColor } = useSetDeviceColor();

	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	const commitBrightness = (value: number) => {
		setBrightness_(
			{ deviceId: device.id, brightnessPercent: value },
			{
				onSuccess: () => {
					lastCommittedBrightnessRef.current = value;
				},
				onError: () => {
					// Reverte o slider pro último valor confirmado — sem
					// leitura real de brilho, "confirmado" aqui é "o último
					// valor que o back-end aceitou nesta sessão".
					setBrightness(lastCommittedBrightnessRef.current);
				},
			},
		);
	};

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-container p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("controls.title", "Controles")}
				</h3>
				<button
					type="button"
					role="switch"
					aria-checked={isOn}
					aria-label={t("card.toggleAriaLabel", { name: device.name })}
					disabled={!isOnline || isToggling}
					onClick={() => toggleDevice(device.id)}
					className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all cursor-pointer disabled:cursor-not-allowed ${
						!isOnline
							? "bg-surface-high border border-border-subtle text-muted-foreground/50"
							: isOn
								? "bg-warm text-warm-foreground shadow-[0_0_8px_rgba(211,196,184,0.2)] hover:scale-105"
								: "bg-surface-high border border-border-subtle text-muted-foreground hover:bg-surface-highest hover:text-foreground"
					}`}
				>
					<Lightbulb className="h-6 w-6" />
				</button>
			</div>

			<div className="flex flex-col gap-3">
				<div className="flex items-end justify-between">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("controls.brightness", "Brilho")}
					</span>
					<span className="text-3xl font-semibold leading-none tracking-tight text-foreground">
						{isOn ? brightness : 0}
						<span className="ml-0.5 text-sm font-semibold text-warm">%</span>
					</span>
				</div>
				<button
					type="button"
					disabled={!isOnline || isSettingBrightness}
					aria-label={t("controls.brightness", "Brilho")}
					className="relative block h-2 w-full touch-none overflow-visible rounded-full bg-surface-low cursor-pointer group/slider disabled:cursor-not-allowed"
					onPointerDown={(e) => {
						if (!isOnline) return;
						e.currentTarget.setPointerCapture(e.pointerId);
						setIsDraggingBrightness(true);
						const rect = e.currentTarget.getBoundingClientRect();
						const pct = Math.round(
							((e.clientX - rect.left) / rect.width) * 100,
						);
						setBrightness(Math.max(0, Math.min(100, pct)));
					}}
					onPointerMove={(e) => {
						if (!isOnline || e.buttons !== 1) return;
						const rect = e.currentTarget.getBoundingClientRect();
						const pct = Math.round(
							((e.clientX - rect.left) / rect.width) * 100,
						);
						setBrightness(Math.max(0, Math.min(100, pct)));
					}}
					onPointerUp={(e) => {
						if (e.currentTarget.hasPointerCapture(e.pointerId)) {
							e.currentTarget.releasePointerCapture(e.pointerId);
						}
						setIsDraggingBrightness(false);
						commitBrightness(brightness);
					}}
				>
					<div
						className={`h-full rounded-full bg-warm relative ${isDraggingBrightness ? "" : "transition-all"}`}
						style={{ width: isOn ? `${brightness}%` : "0%" }}
					>
						<div
							className={`absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-warm-foreground shadow-sm transition-opacity ${
								isDraggingBrightness
									? "opacity-100"
									: "opacity-0 group-hover/slider:opacity-100"
							}`}
						/>
					</div>
				</button>

				{!device.supportsColor && (
					<p className="text-xs text-muted-foreground/70">
						{t(
							"controls.dimmerOnlyHint",
							"Este dispositivo não reporta suporte a cor (RGB) — apenas brilho.",
						)}
					</p>
				)}
			</div>

			{device.supportsColor && (
				<div className="flex flex-col gap-3 border-t border-border-subtle/50 pt-3">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("controls.color", "Cor")}
					</span>
					<div className="flex items-center gap-2">
						{PRESET_COLORS.map((preset) => (
							<button
								key={preset}
								type="button"
								disabled={!isOnline || isSettingColor}
								aria-label={preset}
								onClick={() =>
									setColor({ deviceId: device.id, colorHex: preset })
								}
								className="h-7 w-7 shrink-0 rounded-full border border-border-subtle shadow-xs transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
								style={{ backgroundColor: preset }}
							/>
						))}

						{/* Native color input — cross-browser picker completo sem
						dependência extra. `onChange` (não `onInput`) só dispara ao
						fechar/confirmar a escolha, então já é commit-on-release. */}
						<label className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-border-subtle text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
							<span className="text-xs leading-none">+</span>
							<input
								type="color"
								disabled={!isOnline || isSettingColor}
								onChange={(e) =>
									setColor({
										deviceId: device.id,
										colorHex: e.target.value.toUpperCase(),
									})
								}
								className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
							/>
						</label>
					</div>
				</div>
			)}
		</div>
	);
}
