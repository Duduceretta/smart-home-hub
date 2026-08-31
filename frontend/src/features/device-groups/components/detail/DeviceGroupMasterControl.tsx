import { Loader2, Power, Sun } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Switch } from "@/core/components/ui/switch";
import { cn } from "@/core/utils";
import { useSetDeviceGroupBrightness } from "../../hooks/useSetDeviceGroupBrightness";
import { useSetDeviceGroupPower } from "../../hooks/useSetDeviceGroupPower";
import type { DeviceInGroup } from "../../types/device-groups.types";

interface DeviceGroupMasterControlProps {
	groupId: string;
	devices: DeviceInGroup[];
}

/**
 * Compact Master Group Control card.
 * Dispatches dedicated server-side commands for power and collective brightness.
 */
export function DeviceGroupMasterControl({
	groupId,
	devices,
}: DeviceGroupMasterControlProps) {
	const { t } = useTranslation("device-groups");
	const setPower = useSetDeviceGroupPower();
	const setBrightness = useSetDeviceGroupBrightness();

	const [collectiveBrightness, setCollectiveBrightness] = useState(80);

	const totalCount = devices.length;
	const activeCount = devices.filter((d) => d.isOn).length;
	const isAnyOn = activeCount > 0;
	const lightDevices = devices.filter((d) => d.type === 1);
	const hasLights = lightDevices.length > 0;

	const isPowerPending = setPower.isPending;
	const isBrightnessPending = setBrightness.isPending;

	const handleMasterToggle = (turnOn: boolean) => {
		setPower.mutate(
			{ groupId, desiredState: turnOn },
			{
				onSuccess: (result) => {
					const actionText = turnOn
						? t("quickActions.turnedOn", "ligados")
						: t("quickActions.turnedOff", "desligados");

					if (result.failedCount > 0) {
						toast.warning(
							t(
								"quickActions.toastPartial",
								"{{succeeded}} de {{total}} dispositivos {{action}} — {{failed}} falharam.",
								{
									succeeded: result.succeededCount,
									total: result.totalCount,
									action: actionText,
									failed: result.failedCount,
								},
							),
						);
					} else if (result.succeededCount > 0) {
						toast.success(
							t(
								"quickActions.toastSuccess",
								"{{count}} dispositivo(s) {{action}} com sucesso.",
								{
									count: result.succeededCount,
									action: actionText,
								},
							),
						);
					}
				},
				onError: () => {
					toast.error(
						t(
							"quickActions.toastError",
							"Não foi possível executar a ação no grupo.",
						),
					);
				},
			},
		);
	};

	const handleCommitBrightness = (val: number) => {
		if (!hasLights) return;
		setBrightness.mutate(
			{ groupId, brightnessPercent: val },
			{
				onSuccess: () => {
					toast.success(
						t(
							"masterControl.brightnessSuccess",
							"Brilho ajustado para {{val}}% em {{count}} lâmpada(s).",
							{
								val,
								count: lightDevices.length,
							},
						),
					);
				},
			},
		);
	};

	if (totalCount === 0) return null;

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-container/60 p-4 shadow-xs">
			{/* Master Power Toggle Row */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
							isAnyOn
								? "bg-primary/15 text-primary shadow-xs"
								: "bg-surface-high text-muted-foreground",
						)}
					>
						<Power className="h-4 w-4" />
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-foreground">
							{t("masterControl.title", "Controle Mestre do Grupo")}
						</span>
						<span className="text-xs text-muted-foreground">
							{isPowerPending ? (
								<span className="flex items-center gap-1 text-primary">
									<Loader2 className="h-3 w-3 animate-spin" />
									{t("masterControl.applying", "Aplicando ao grupo...")}
								</span>
							) : (
								t(
									"masterControl.status",
									"{{active}} de {{total}} dispositivo(s) ligado(s)",
									{
										active: activeCount,
										total: totalCount,
									},
								)
							)}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Switch
						checked={isAnyOn}
						onCheckedChange={handleMasterToggle}
						disabled={isPowerPending}
						aria-label={t(
							"masterControl.toggleAria",
							"Alternar todos os dispositivos do grupo",
						)}
						className="scale-105"
					/>
				</div>
			</div>

			{/* Collective Brightness Slider Row */}
			{hasLights && (
				<div className="border-t border-border-subtle/50 pt-3">
					<div className="flex items-center justify-between text-xs mb-2">
						<div className="flex items-center gap-1.5 font-medium text-foreground">
							<Sun className="h-3.5 w-3.5 text-warm" />
							<span>{t("masterControl.brightness", "Brilho Coletivo")}</span>
							<span className="text-muted-foreground font-normal">
								({lightDevices.length}{" "}
								{lightDevices.length === 1 ? "luz" : "luzes"})
							</span>
						</div>
						<span className="font-semibold text-foreground">
							{isAnyOn ? `${collectiveBrightness}%` : "0%"}
						</span>
					</div>

					<div className="relative flex h-2 w-full items-center rounded-full bg-surface-high">
						<div
							className={cn(
								"h-full rounded-full transition-all",
								isAnyOn ? "bg-primary" : "bg-muted-foreground/30",
							)}
							style={{ width: isAnyOn ? `${collectiveBrightness}%` : "0%" }}
						/>
						<input
							type="range"
							min={1}
							max={100}
							value={collectiveBrightness}
							disabled={isBrightnessPending || !isAnyOn}
							onChange={(e) => setCollectiveBrightness(Number(e.target.value))}
							onPointerUp={() => handleCommitBrightness(collectiveBrightness)}
							aria-label={t(
								"masterControl.brightnessAria",
								"Ajustar brilho coletivo",
							)}
							className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
