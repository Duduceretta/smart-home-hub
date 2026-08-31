import { ArrowRight, ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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

interface HistoryEventRowProps {
	event: HistoryEvent;
	isExpanded: boolean;
	onToggleExpand: (id: string) => void;
}

/**
 * Dense, scannable single row in the audit event timeline with inline accordion expansion.
 * Smoothly reveals full metadata beneath the line on click without triggering layout shifts or popups.
 */
export function HistoryEventRow({
	event,
	isExpanded,
	onToggleExpand,
}: HistoryEventRowProps) {
	const { t, i18n } = useTranslation("history");
	const [copied, setCopied] = useState(false);

	const localTime = formatLocalTime(
		event.timestampUtc,
		i18n.language || "pt-BR",
	);
	const localDate = formatRelativeDateGroup(
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

	// Target entity labels
	const targetLabel =
		event.deviceName || event.deviceGroupName || event.roomName || null;
	const targetType = event.deviceName
		? t("timeline.entityDevice", "Dispositivo")
		: event.deviceGroupName
			? t("timeline.entityGroup", "Grupo")
			: event.roomName
				? t("timeline.entityRoom", "Ambiente")
				: null;

	const handleCopyId = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(event.id);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex flex-col transition-colors">
			{/* Main Clickable Row Header */}
			{/* biome-ignore lint/a11y/useSemanticElements: interactive accordion row */}
			<div
				role="button"
				tabIndex={0}
				aria-expanded={isExpanded}
				onClick={() => onToggleExpand(event.id)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onToggleExpand(event.id);
					}
				}}
				className={cn(
					"group flex flex-col gap-2.5 px-4 py-3.5 transition-colors cursor-pointer sm:flex-row sm:items-center sm:gap-4 outline-none focus-visible:bg-surface-container",
					isExpanded
						? "bg-surface-container/70"
						: "hover:bg-surface-container/40",
				)}
			>
				{/* Time & Source Badge */}
				<div className="flex items-center gap-2.5 shrink-0">
					<span className="font-mono text-xs text-muted-foreground w-16">
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

				{/* Target Entity & Description */}
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

					{/* State Change Pill (e.g., off → on) */}
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

				{/* Severity Badge & Rotating Chevron */}
				<div className="flex items-center justify-between gap-3 shrink-0 sm:justify-end">
					<span
						className={cn(
							"flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
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

					<ChevronRight
						className={cn(
							"h-4 w-4 transition-transform duration-200 ease-out",
							isExpanded
								? "rotate-90 text-foreground"
								: "text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5",
						)}
					/>
				</div>
			</div>

			{/* Inline Expandable Accordion Drawer (Zero Layout Shift via CSS Grid) */}
			<div
				className={cn(
					"grid transition-[grid-template-rows,opacity] duration-200 ease-out",
					isExpanded
						? "grid-rows-[1fr] opacity-100"
						: "grid-rows-[0fr] opacity-0 pointer-events-none",
				)}
			>
				<div className="overflow-hidden">
					{isExpanded && (
						<div className="border-t border-border-subtle/60 bg-surface-container/30 px-4 py-4 sm:px-6 sm:py-5 space-y-3">
							{/* Metadata Matrix */}
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-border-subtle bg-surface-low p-3.5 shadow-2xs">
								<div className="flex flex-col gap-0.5">
									<span className="text-[10px] uppercase font-medium text-muted-foreground">
										{t("detailModal.timestamp", "Data / Hora Local")}
									</span>
									<span className="text-xs font-medium text-foreground">
										{localDate} às {localTime}
									</span>
								</div>

								<div className="flex flex-col gap-0.5">
									<span className="text-[10px] uppercase font-medium text-muted-foreground">
										{t("detailModal.eventType", "Tipo de Evento")}
									</span>
									<span className="font-mono text-xs text-foreground">
										{event.eventType}
									</span>
								</div>

								{event.deviceName && (
									<div className="flex flex-col gap-0.5">
										<span className="text-[10px] uppercase font-medium text-muted-foreground">
											{t("detailModal.device", "Dispositivo")}
										</span>
										<span className="text-xs font-medium text-foreground">
											{event.deviceName}
										</span>
									</div>
								)}

								{event.roomName && (
									<div className="flex flex-col gap-0.5">
										<span className="text-[10px] uppercase font-medium text-muted-foreground">
											{t("detailModal.room", "Ambiente")}
										</span>
										<span className="text-xs font-medium text-foreground">
											{event.roomName}
										</span>
									</div>
								)}

								{event.deviceGroupName && (
									<div className="flex flex-col gap-0.5">
										<span className="text-[10px] uppercase font-medium text-muted-foreground">
											{t("detailModal.group", "Grupo")}
										</span>
										<span className="text-xs font-medium text-foreground">
											{event.deviceGroupName}
										</span>
									</div>
								)}

								{hasStateChange && (
									<div className="flex flex-col gap-0.5">
										<span className="text-[10px] uppercase font-medium text-muted-foreground">
											Transição de Valor
										</span>
										<span className="font-mono text-xs text-foreground">
											{event.oldValue} → {event.newValue}
										</span>
									</div>
								)}
							</div>

							{/* Description full text */}
							<div className="rounded-xl border border-border-subtle bg-surface-low p-3 space-y-1">
								<span className="text-[10px] uppercase font-medium text-muted-foreground">
									{t("detailModal.message", "Descrição do Evento")}
								</span>
								<p className="text-xs text-foreground/90 font-normal leading-relaxed">
									{event.description}
								</p>
							</div>

							{/* Technical IDs & UTC Info */}
							<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface-high/40 px-3 py-2 text-[11px] font-mono text-muted-foreground">
								<div className="flex items-center gap-2">
									<span>ID: {event.id}</span>
									<button
										type="button"
										onClick={handleCopyId}
										className="inline-flex items-center gap-1 rounded p-1 hover:bg-surface-high hover:text-foreground transition-colors cursor-pointer"
										title="Copiar Event ID"
									>
										{copied ? (
											<Check className="h-3 w-3 text-primary" />
										) : (
											<Copy className="h-3 w-3" />
										)}
									</button>
								</div>

								<div className="flex items-center gap-2">
									<span>UTC: {event.timestampUtc}</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
