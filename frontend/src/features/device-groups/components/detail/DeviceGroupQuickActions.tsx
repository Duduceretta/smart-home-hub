import { Power, PowerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { GROUP_DEVICE_ACTUATOR_TYPES } from "../../constants/device-groups.constants";
import { useSetDeviceGroupPower } from "../../hooks/useSetDeviceGroupPower";
import type { DeviceInGroup } from "../../types/device-groups.types";

interface DeviceGroupQuickActionsProps {
	devices: DeviceInGroup[];
}

/**
 * Bulk action buttons ("Ligar Tudo" / "Desligar Tudo") for device groups.
 */
export function DeviceGroupQuickActions({
	devices,
}: DeviceGroupQuickActionsProps) {
	const { t } = useTranslation("device-groups");
	const setPower = useSetDeviceGroupPower();

	const eligible = devices.filter((device) =>
		GROUP_DEVICE_ACTUATOR_TYPES.has(device.type),
	);
	const hasDeviceToTurnOn = eligible.some((device) => !device.isOn);
	const hasDeviceToTurnOff = eligible.some((device) => device.isOn);

	const runBulkPower = async (desiredState: boolean, actionLabel: string) => {
		try {
			const result = await setPower.mutateAsync({
				devices: eligible,
				desiredState,
			});
			if (result.totalCount === 0) return;

			if (result.failedCount > 0) {
				toast.error(
					t(
						"quickActions.toastPartial",
						`${result.succeededCount} de ${result.totalCount} dispositivos ${actionLabel} — ${result.failedCount} falharam.`,
						{
							succeeded: result.succeededCount,
							total: result.totalCount,
							failed: result.failedCount,
							action: actionLabel,
						},
					),
				);
			} else {
				toast.success(
					t(
						"quickActions.toastSuccess",
						`${result.succeededCount} dispositivo${result.succeededCount === 1 ? "" : "s"} ${actionLabel}.`,
						{ count: result.succeededCount, action: actionLabel },
					),
				);
			}
		} catch {
			toast.error(
				t(
					"quickActions.toastError",
					"Não foi possível executar a ação em massa no grupo.",
				),
			);
		}
	};

	return (
		<div className="flex gap-2">
			<Button
				variant="outline"
				className="flex-1 border-border-subtle bg-surface-container text-foreground/90 transition-all hover:border-primary/40 hover:bg-surface-highest hover:text-primary disabled:border-transparent disabled:bg-surface-low/50 disabled:text-muted-foreground/40 disabled:cursor-not-allowed"
				disabled={!hasDeviceToTurnOn || setPower.isPending}
				onClick={() =>
					runBulkPower(true, t("quickActions.turnedOn", "ligados"))
				}
			>
				<Power className="h-3.5 w-3.5 shrink-0 text-primary" />
				{t("quickActions.turnOnAll", "Ligar Tudo")}
			</Button>
			<Button
				variant="outline"
				className="flex-1 border-border-subtle bg-surface-container text-foreground/90 transition-all hover:border-destructive/40 hover:bg-surface-highest hover:text-destructive disabled:border-transparent disabled:bg-surface-low/50 disabled:text-muted-foreground/40 disabled:cursor-not-allowed"
				disabled={!hasDeviceToTurnOff || setPower.isPending}
				onClick={() =>
					runBulkPower(false, t("quickActions.turnedOff", "desligados"))
				}
			>
				<PowerOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				{t("quickActions.turnOffAll", "Desligar Tudo")}
			</Button>
		</div>
	);
}
