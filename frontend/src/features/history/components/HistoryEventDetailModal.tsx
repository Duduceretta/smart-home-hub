import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { cn } from "@/core/utils";
import {
	EVENT_SEVERITY_STYLES,
	EVENT_SOURCE_ICON,
	EVENT_SOURCE_STYLES,
} from "../constants/history.constants";
import type { HistoryEvent } from "../types/history.types";
import {
	formatLocalTime,
	formatRelativeDateGroup,
} from "../utils/formatHistoryDate";

interface HistoryEventDetailModalProps {
	event: HistoryEvent | null;
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Inspection modal displaying full audit metadata for a selected event.
 */
export function HistoryEventDetailModal({
	event,
	isOpen,
	onClose,
}: HistoryEventDetailModalProps) {
	const { t, i18n } = useTranslation("history");

	if (!event) return null;

	const SourceIcon =
		EVENT_SOURCE_ICON[event.source] ?? EVENT_SOURCE_ICON.Default;
	const sourceStyle =
		EVENT_SOURCE_STYLES[event.source] ?? EVENT_SOURCE_STYLES.System;
	const severityStyle =
		EVENT_SEVERITY_STYLES[event.severity] ?? EVENT_SEVERITY_STYLES.Info;

	const localDate = formatRelativeDateGroup(
		event.timestampUtc,
		i18n.language || "pt-BR",
	);
	const localTime = formatLocalTime(
		event.timestampUtc,
		i18n.language || "pt-BR",
	);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg border-border-subtle bg-popover text-popover-foreground">
				<DialogHeader>
					<div className="flex items-center gap-2 mb-1">
						<span
							className={cn(
								"flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
								sourceStyle.badge,
							)}
						>
							<SourceIcon
								className={cn("h-3.5 w-3.5", sourceStyle.iconColor)}
							/>
							<span>{t(`filters.sources.${event.source}`, event.source)}</span>
						</span>
						<span
							className={cn(
								"flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase",
								severityStyle.badge,
							)}
						>
							<span
								className={cn("h-1.5 w-1.5 rounded-full", severityStyle.dot)}
							/>
							<span>
								{t(`filters.severities.${event.severity}`, event.severity)}
							</span>
						</span>
					</div>
					<DialogTitle className="text-lg font-semibold text-foreground">
						{t("detailModal.title", "Detalhes do Evento")}
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						{event.description}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3 py-2 text-xs">
					{/* Key-Value Matrix */}
					<div className="grid grid-cols-2 gap-2 rounded-xl border border-border-subtle bg-surface-high p-3.5">
						<div className="flex flex-col gap-0.5">
							<span className="text-[10px] uppercase font-medium text-muted-foreground">
								{t("detailModal.timestamp", "Data / Hora (Local)")}
							</span>
							<span className="font-medium text-foreground">
								{localDate} às {localTime}
							</span>
						</div>

						<div className="flex flex-col gap-0.5">
							<span className="text-[10px] uppercase font-medium text-muted-foreground">
								{t("detailModal.eventType", "Tipo de Evento")}
							</span>
							<span className="font-mono text-foreground">
								{event.eventType}
							</span>
						</div>

						{event.deviceName && (
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] uppercase font-medium text-muted-foreground">
									{t("detailModal.device", "Dispositivo")}
								</span>
								<span className="font-medium text-foreground">
									{event.deviceName}
								</span>
							</div>
						)}

						{event.roomName && (
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] uppercase font-medium text-muted-foreground">
									{t("detailModal.room", "Ambiente")}
								</span>
								<span className="font-medium text-foreground">
									{event.roomName}
								</span>
							</div>
						)}

						{event.deviceGroupName && (
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] uppercase font-medium text-muted-foreground">
									{t("detailModal.group", "Grupo")}
								</span>
								<span className="font-medium text-foreground">
									{event.deviceGroupName}
								</span>
							</div>
						)}

						{(event.oldValue || event.newValue) && (
							<div className="col-span-2 flex flex-col gap-1 border-t border-border-subtle/50 pt-2 mt-1">
								<span className="text-[10px] uppercase font-medium text-muted-foreground">
									Transição de Estado
								</span>
								<div className="flex items-center gap-2 font-mono text-xs">
									<span className="rounded bg-surface-container px-2 py-0.5 text-muted-foreground">
										{event.oldValue || "—"}
									</span>
									<span className="text-primary font-bold">→</span>
									<span className="rounded bg-surface-container px-2 py-0.5 text-foreground font-semibold">
										{event.newValue || "—"}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Technical ID Information */}
					<div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface-container/50 p-3 font-mono text-[11px] text-muted-foreground">
						<div className="flex justify-between">
							<span>Event ID:</span>
							<span className="text-foreground select-all">{event.id}</span>
						</div>
						<div className="flex justify-between">
							<span>UTC:</span>
							<span className="text-foreground select-all">
								{event.timestampUtc}
							</span>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						size="sm"
						onClick={onClose}
						className="border-border-subtle bg-surface-high hover:bg-surface-highest cursor-pointer"
					>
						{t("detailModal.close", "Fechar")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
