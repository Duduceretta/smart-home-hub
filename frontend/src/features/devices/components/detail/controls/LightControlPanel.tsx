import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToggleDevice } from "../../../hooks/useToggleDevice";
import type { DeviceControlPanelProps } from "./device-control-panel.types";

/**
 * Controles de Luz — brilho (mock local, sem persistência: não existe
 * endpoint de brilho no back-end hoje) + toggle grande. Migrado do bloco
 * `isLight` de `DeviceCard.tsx` (removido), não duplicado.
 *
 * Seletor de cor RGB pedido na especificação foi omitido nesta entrega: o
 * `Device` DTO não carrega nenhum sinal de capacidade "é RGB" vindo do
 * back-end — sem esse dado, o seletor seria decorativo.
 */
export function LightControlPanel({ device }: DeviceControlPanelProps) {
	const { t } = useTranslation("devices");
	const [brightness, setBrightness] = useState(80);
	const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);

	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();

	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

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
					disabled={!isOnline}
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

				<p className="text-xs text-muted-foreground/70">
					{t(
						"controls.dimmerOnlyHint",
						"Este dispositivo não reporta suporte a cor (RGB) — apenas brilho.",
					)}
				</p>
			</div>
		</div>
	);
}
