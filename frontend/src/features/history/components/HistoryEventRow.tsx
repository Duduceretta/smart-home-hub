import { ArrowRight, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import {
	EVENT_SEVERITY_STYLES,
	EVENT_SOURCE_ICON,
	EVENT_SOURCE_STYLES,
} from "../constants/history.constants";
import type { HistoryEvent } from "../types/history.types";
import { formatLocalTime } from "../utils/formatHistoryDate";

interface HistoryEventRowProps {
	event: HistoryEvent;
	onSelect: (event: HistoryEvent) => void;
}

/**
 * Dense, scannable single row in the audit event timeline.
 * Displays local timestamp, source badge, entity chips, message, state change pill, and severity badge.
 */
export function HistoryEventRow({ event, onSelect }: HistoryEventRowProps) {
	const { t, i18n } = useTranslation("history");

	const localTime = formatLocalTime(
		event.timestampUtc,
		i18n.language || "pt-BR",
	);
	const SourceIcon =
		EVENT_SOURCE_ICON[event.source] ?? EVENT_SOURCE_ICON.Default;
	const sourceStyle =
		EVENT_SOURCE_STYLES[event.source] ?? EVENT_SOURCE_STYLES.System;
	const severityStyle =
		EVENT_SEVERITY_STYLES[event.severity] ?? EVENT_SEVERITY_STYLES.Info;

	const hasStateChange = Boolean(event.oldValue && event.newValue);

	// Entity labels
	const targetLabel =
		event.deviceName || event.deviceGroupName || event.roomName || null;
	const targetType = event.deviceName
		? t("timeline.entityDevice", "Dispositivo")
		: event.deviceGroupName
			? t("timeline.entityGroup", "Grupo")
			: event.roomName
				? t("timeline.entityRoom", "Ambiente")
				: null;

	return (
		// biome-ignore lint/a11y/useSemanticElements: interactive timeline row
		<div
			role="button"
			tabIndex={0}
			onClick={() => onSelect(event)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(event);
				}
			}}
			className="group flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-surface-container/60 cursor-pointer sm:flex-row sm:items-center sm:gap-4 outline-none focus-visible:bg-surface-container"
		>
			{/* Time & Source Badge */}
			<div className="flex items-center gap-2.5 shrink-0">
				<span className="font-mono text-xs text-muted-foreground">
					{localTime}
				</span>

				<span
					className={cn(
						"flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
						sourceStyle.badge,
					)}
				>
					<SourceIcon className={cn("h-3 w-3", sourceStyle.iconColor)} />
					<span>{t(`filters.sources.${event.source}`, event.source)}</span>
				</span>
			</div>

			{/* Main Content: Target Entity & Description */}
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				{targetLabel && (
					<span className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-high px-2 py-0.5 text-xs font-medium text-foreground truncate max-w-[200px]">
						{targetLabel}
						{targetType && (
							<span className="text-[10px] text-muted-foreground font-normal">
								({targetType})
							</span>
						)}
					</span>
				)}

				<span className="truncate text-xs text-foreground/90 font-normal">
					{event.description}
				</span>

				{/* State Change Transition Pill (e.g., off → on) */}
				{hasStateChange && (
					<span className="inline-flex items-center gap-1 rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border-subtle/50">
						<span className="text-muted-foreground/80">{event.oldValue}</span>
						<ArrowRight className="h-2.5 w-2.5 text-primary/70" />
						<span className="text-foreground font-semibold">
							{event.newValue}
						</span>
					</span>
				)}
			</div>

			{/* Severity Badge & Chevron */}
			<div className="flex items-center justify-between gap-3 shrink-0 sm:justify-end">
				<span
					className={cn(
						"flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
						severityStyle.badge,
					)}
				>
					<span className={cn("h-1.5 w-1.5 rounded-full", severityStyle.dot)} />
					<span>
						{t(`filters.severities.${event.severity}`, event.severity)}
					</span>
				</span>

				<ChevronRight className="h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
			</div>
		</div>
	);
}
