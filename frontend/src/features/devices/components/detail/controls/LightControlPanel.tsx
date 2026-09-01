import { Lightbulb, Palette, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeviceWorkMode } from "../../../hooks/useDeviceWorkMode";
import { useSetDeviceBrightness } from "../../../hooks/useSetDeviceBrightness";
import { useSetDeviceColor } from "../../../hooks/useSetDeviceColor";
import { useSetDeviceColorTemp } from "../../../hooks/useSetDeviceColorTemp";
import { useSetDeviceWorkMode } from "../../../hooks/useSetDeviceWorkMode";
import { useToggleDevice } from "../../../hooks/useToggleDevice";
import { ColorWheel } from "./ColorWheel";
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
 * Controles de Luz — mesmo padrão de abas Branco/Cor do app Smart Life:
 * trocar de aba dispara `PUT /devices/{id}/work-mode` de verdade (DP21), não
 * é só UI. A aba inicial reflete o work_mode real (`GET .../work-mode`,
 * consultado ao abrir o painel), não assume "Branco" fixo.
 *
 * Brilho (DP22, 10-1000) fica visível nas duas abas; a segunda coluna troca
 * entre temperatura de cor (DP23, aba Branco) e o seletor RGB (DP24, aba
 * Cor) — os três confirmados por diagnóstico manual contra hardware real
 * (ver TuyaColorConverter/DeviceConfiguration no backend). Toggle
 * liga/desliga migrado pra esquerda do card (era só o ícone no canto
 * superior direito).
 *
 * Sem estado de brilho/cor/temp vindo do GET (write-only, sem DP de leitura
 * exposto pela API) — os controles começam num valor local e refletem só a
 * última intenção enviada nesta sessão, exceto a aba ativa (essa sim lida
 * do hardware real).
 */
export function LightControlPanel({ device }: DeviceControlPanelProps) {
	const { t } = useTranslation("devices");
	const isOnline = device.isOnline;
	const isOn = device.isOn && isOnline;

	const { mutate: toggleDevice, isPending: isToggling } = useToggleDevice();

	// --- Aba Branco/Cor (work_mode real) ---
	const { data: remoteWorkMode, isLoading: isLoadingWorkMode } =
		useDeviceWorkMode(device.id, isOnline);
	const { mutate: setWorkMode, isPending: isSettingWorkMode } =
		useSetDeviceWorkMode();
	const [activeTab, setActiveTab] = useState<"white" | "colour">("white");
	const hasSyncedInitialTab = useRef(false);

	useEffect(() => {
		if (hasSyncedInitialTab.current) return;
		if (remoteWorkMode === "white" || remoteWorkMode === "colour") {
			setActiveTab(remoteWorkMode);
			hasSyncedInitialTab.current = true;
		}
	}, [remoteWorkMode]);

	const switchTab = (tab: "white" | "colour") => {
		if (tab === activeTab || isSettingWorkMode) return;
		setActiveTab(tab);
		setWorkMode(
			{ deviceId: device.id, workMode: tab },
			{ onError: () => setActiveTab(activeTab) },
		);
	};

	// --- Brilho (DP22) ---
	const [brightness, setBrightness] = useState(80);
	const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);
	const lastCommittedBrightnessRef = useRef(80);
	const { mutate: commitBrightness_, isPending: isSettingBrightness } =
		useSetDeviceBrightness();

	const commitBrightness = (value: number) => {
		commitBrightness_(
			{ deviceId: device.id, brightnessPercent: value },
			{
				onSuccess: () => {
					lastCommittedBrightnessRef.current = value;
				},
				onError: () => setBrightness(lastCommittedBrightnessRef.current),
			},
		);
	};

	// --- Temperatura de cor (DP23, só aba Branco) ---
	const [colorTemp, setColorTemp] = useState(50);
	const [isDraggingColorTemp, setIsDraggingColorTemp] = useState(false);
	const lastCommittedColorTempRef = useRef(50);
	const { mutate: commitColorTemp_, isPending: isSettingColorTemp } =
		useSetDeviceColorTemp();

	const commitColorTemp = (value: number) => {
		commitColorTemp_(
			{ deviceId: device.id, colorTempPercent: value },
			{
				onSuccess: () => {
					lastCommittedColorTempRef.current = value;
				},
				onError: () => setColorTemp(lastCommittedColorTempRef.current),
			},
		);
	};

	// --- Cor RGB (DP24, só aba Cor) ---
	const { mutate: setColor, isPending: isSettingColor } = useSetDeviceColor();

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-container p-4">
			<div className="flex items-center justify-between gap-3">
				<button
					type="button"
					role="switch"
					aria-checked={isOn}
					aria-label={t("card.toggleAriaLabel", { name: device.name })}
					disabled={!isOnline || isToggling}
					onClick={() => toggleDevice(device.id)}
					className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer disabled:cursor-not-allowed ${
						!isOnline
							? "bg-surface-high border border-border-subtle text-muted-foreground/50"
							: isOn
								? "bg-warm text-warm-foreground shadow-[0_0_8px_rgba(211,196,184,0.2)] hover:scale-105"
								: "bg-surface-high border border-border-subtle text-muted-foreground hover:bg-surface-highest hover:text-foreground"
					}`}
				>
					<Lightbulb className="h-6 w-6" />
				</button>

				{device.supportsColor ? (
					// biome-ignore lint/a11y/useSemanticElements: segmented control de 2 opções, não um form <fieldset>
					<div
						role="group"
						aria-label={t("controls.modeGroup", "Modo")}
						className="flex items-center gap-0.5 rounded-md bg-surface-high/60 p-0.5"
					>
						<button
							type="button"
							onClick={() => switchTab("white")}
							disabled={!isOnline || isLoadingWorkMode}
							aria-pressed={activeTab === "white"}
							className={`flex h-11 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed lg:h-8 ${
								activeTab === "white"
									? "bg-surface-highest text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Sun className="h-3.5 w-3.5" />
							{t("controls.tabWhite", "Branco")}
						</button>
						<button
							type="button"
							onClick={() => switchTab("colour")}
							disabled={!isOnline || isLoadingWorkMode}
							aria-pressed={activeTab === "colour"}
							className={`flex h-11 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed lg:h-8 ${
								activeTab === "colour"
									? "bg-surface-highest text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Palette className="h-3.5 w-3.5" />
							{t("controls.tabColor", "Cor")}
						</button>
					</div>
				) : (
					<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{t("controls.title", "Controles")}
					</h3>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{/* Brilho — visível nas duas abas */}
				<div className="flex flex-col gap-3">
					<div className="flex items-end justify-between">
						<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							{t("controls.brightness", "Brilho")}
						</span>
						<span className="text-2xl font-semibold leading-none tracking-tight text-foreground">
							{isOn ? brightness : 0}
							<span className="ml-0.5 text-sm font-semibold text-warm">%</span>
						</span>
					</div>
					<button
						type="button"
						disabled={!isOnline || isSettingBrightness}
						aria-label={t("controls.brightness", "Brilho")}
						className="group/slider relative flex h-11 w-full touch-none cursor-pointer items-center disabled:cursor-not-allowed"
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
						{/* Trilha visual fina — a área de toque real é o botão pai
						 * (h-11/44px), essa div só existe pra manter a espessura visual
						 * original de h-2. */}
						<div className="relative h-2 w-full overflow-visible rounded-full bg-surface-low">
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

				{/* Segunda coluna — temperatura de cor (Branco) ou seletor RGB (Cor) */}
				{device.supportsColor && activeTab === "white" && (
					<div className="flex flex-col gap-3">
						<div className="flex items-end justify-between">
							<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{t("controls.colorTemp", "Temperatura")}
							</span>
							<span className="text-xs font-medium text-muted-foreground">
								{t("controls.colorTempWarm", "Quente")} ·{" "}
								{t("controls.colorTempCool", "Frio")}
							</span>
						</div>
						<button
							type="button"
							disabled={!isOnline || isSettingColorTemp}
							aria-label={t("controls.colorTemp", "Temperatura")}
							className="group/slider relative flex h-11 w-full touch-none cursor-pointer items-center disabled:cursor-not-allowed"
							onPointerDown={(e) => {
								if (!isOnline) return;
								e.currentTarget.setPointerCapture(e.pointerId);
								setIsDraggingColorTemp(true);
								const rect = e.currentTarget.getBoundingClientRect();
								const pct = Math.round(
									((e.clientX - rect.left) / rect.width) * 100,
								);
								setColorTemp(Math.max(0, Math.min(100, pct)));
							}}
							onPointerMove={(e) => {
								if (!isOnline || e.buttons !== 1) return;
								const rect = e.currentTarget.getBoundingClientRect();
								const pct = Math.round(
									((e.clientX - rect.left) / rect.width) * 100,
								);
								setColorTemp(Math.max(0, Math.min(100, pct)));
							}}
							onPointerUp={(e) => {
								if (e.currentTarget.hasPointerCapture(e.pointerId)) {
									e.currentTarget.releasePointerCapture(e.pointerId);
								}
								setIsDraggingColorTemp(false);
								commitColorTemp(colorTemp);
							}}
						>
							{/* Trilha visual fina — a área de toque real é o botão pai
							 * (h-11/44px), essa div só existe pra manter a espessura
							 * visual original de h-2. */}
							<div className="relative h-2 w-full rounded-full bg-linear-to-r from-warm to-cool">
								<div
									className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm transition-opacity ${
										isDraggingColorTemp
											? "opacity-100"
											: "opacity-70 group-hover/slider:opacity-100"
									}`}
									style={{ left: `calc(${colorTemp}% - 7px)` }}
								/>
							</div>
						</button>
					</div>
				)}

				{device.supportsColor && activeTab === "colour" && (
					<div className="flex flex-col items-center gap-3">
						<span className="self-start text-xs font-medium uppercase tracking-wider text-muted-foreground">
							{t("controls.color", "Cor")}
						</span>

						<ColorWheel
							disabled={!isOnline || isSettingColor}
							onCommit={(hex) =>
								setColor({ deviceId: device.id, colorHex: hex })
							}
						/>

						<div className="flex flex-wrap items-center gap-1">
							{PRESET_COLORS.map((preset) => {
								const isSwatchDisabled = !isOnline || isSettingColor;
								return (
									<button
										key={preset}
										type="button"
										disabled={isSwatchDisabled}
										aria-label={preset}
										onClick={() =>
											setColor({ deviceId: device.id, colorHex: preset })
										}
										className="group/swatch flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-not-allowed"
									>
										<span
											className={`h-5 w-5 rounded-full border border-border-subtle shadow-xs transition-transform ${
												isSwatchDisabled ? "" : "group-hover/swatch:scale-110"
											}`}
											style={{ backgroundColor: preset }}
										/>
									</button>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
