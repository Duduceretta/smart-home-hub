import { Bot, Clock, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/utils";
import { useDeviceGroupAutomations } from "../../hooks/useDeviceGroupAutomations";
import type { DeviceGroupAutomationTriggerKind } from "../../types/device-groups.types";

interface DeviceGroupLinkedAutomationsProps {
	groupId: string;
}

const TRIGGER_ICON: Record<DeviceGroupAutomationTriggerKind, typeof Clock> = {
	schedule: Clock,
	sensor: Radio,
	unknown: Bot,
};

const TRIGGER_LABEL_KEY: Record<DeviceGroupAutomationTriggerKind, string> = {
	schedule: "automations.triggerSchedule",
	sensor: "automations.triggerSensor",
	unknown: "automations.triggerUnknown",
};

const TRIGGER_LABEL_FALLBACK: Record<DeviceGroupAutomationTriggerKind, string> =
	{
		schedule: "Gatilho por horário",
		sensor: "Gatilho por dispositivo/sensor",
		unknown: "Gatilho não identificado",
	};

/**
 * Linked Automations block for Device Groups, mirroring `RoomLinkedAutomations`.
 * Displays automations that reference devices within this group.
 */
export function DeviceGroupLinkedAutomations({
	groupId,
}: DeviceGroupLinkedAutomationsProps) {
	const { t } = useTranslation("device-groups");
	const navigate = useNavigate();
	const {
		data: automations = [],
		isLoading,
		isError,
		refetch,
	} = useDeviceGroupAutomations(groupId);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("automations.title", "Automações deste Grupo")}
				</h3>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					{[0, 1].map((i) => (
						<div
							key={i}
							className="h-14 animate-pulse rounded-lg border border-border-subtle bg-surface-container"
						/>
					))}
				</div>
			) : isError ? (
				<div className="flex items-center justify-between rounded-lg border border-dashed border-border-subtle p-3 text-xs text-muted-foreground">
					<span>
						{t(
							"automations.errorLoad",
							"Não foi possível carregar as automações.",
						)}
					</span>
					<Button variant="ghost" size="xs" onClick={() => refetch()}>
						{t("automations.retry", "Tentar de novo")}
					</Button>
				</div>
			) : automations.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border-subtle bg-surface-container/20 p-4 text-center">
					<p className="text-xs text-muted-foreground">
						{t(
							"automations.empty",
							"Nenhuma automação configurada para os dispositivos deste grupo.",
						)}
					</p>
					<button
						type="button"
						onClick={() => navigate("/automations")}
						className="mt-1 text-xs font-medium text-primary hover:underline cursor-pointer"
					>
						{t("automations.create", "Criar automação")}
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{automations.map((automation) => {
						const Icon = TRIGGER_ICON[automation.triggerKind];
						return (
							<button
								key={automation.id}
								type="button"
								onClick={() => navigate("/automations")}
								className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-container p-3 text-left transition-all hover:border-border hover:bg-surface-high cursor-pointer"
							>
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm/15 text-warm">
									<Icon className="h-4 w-4" />
								</span>
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="truncate text-sm font-medium text-foreground">
										{automation.name}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{t(
											TRIGGER_LABEL_KEY[automation.triggerKind],
											TRIGGER_LABEL_FALLBACK[automation.triggerKind],
										)}
									</span>
								</div>
								<span
									className={cn(
										"shrink-0 text-xs font-medium uppercase tracking-wider",
										automation.isActive
											? "text-primary font-semibold"
											: "text-muted-foreground",
									)}
								>
									{automation.isActive
										? t("automations.active", "Ativa")
										: t("automations.inactive", "Inativa")}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
