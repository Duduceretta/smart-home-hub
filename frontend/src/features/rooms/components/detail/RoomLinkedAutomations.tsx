import { Bot, Clock, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/utils";
import { useRoomAutomations } from "../../hooks/useRoomAutomations";
import type { RoomAutomationTriggerKind } from "../../types/rooms.types";

interface RoomLinkedAutomationsProps {
	roomId: string;
}

const TRIGGER_ICON: Record<RoomAutomationTriggerKind, typeof Clock> = {
	schedule: Clock,
	sensor: Radio,
	unknown: Bot,
};

const TRIGGER_LABEL_KEY: Record<RoomAutomationTriggerKind, string> = {
	schedule: "automations.triggerSchedule",
	sensor: "automations.triggerSensor",
	unknown: "automations.triggerUnknown",
};

const TRIGGER_LABEL_FALLBACK: Record<RoomAutomationTriggerKind, string> = {
	schedule: "Gatilho por horário",
	sensor: "Gatilho por dispositivo/sensor",
	unknown: "Gatilho não identificado",
};

/**
 * Automações que referenciam algum dispositivo deste ambiente — cruzamento
 * feito no back-end (`GET /rooms/{id}/automations`, ver
 * GetRoomAutomationsQuery.cs). Clique navega pra `/automations` — a tela de
 * Automações guarda a seleção em `useState` local, não em rota/query param,
 * então não dá pra abrir direto naquela automação sem mexer lá também (fora
 * do escopo aqui).
 */
export function RoomLinkedAutomations({ roomId }: RoomLinkedAutomationsProps) {
	const { t } = useTranslation("rooms");
	const navigate = useNavigate();
	const {
		data: automations = [],
		isLoading,
		isError,
		refetch,
	} = useRoomAutomations(roomId);

	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{t("automations.title", "Automações deste Ambiente")}
			</h3>

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
							"Nenhuma automação configurada para este ambiente.",
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
