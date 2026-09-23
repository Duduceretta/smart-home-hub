import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { cn } from "@/core/utils";
import type { Device } from "@/features/devices/types/devices.types";
import { HomeDeviceCard } from "./HomeDeviceCard";

interface HomeDeviceGridProps {
	devices: Device[];
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
}

const SKELETON_KEYS = [
	"sk-1",
	"sk-2",
	"sk-3",
	"sk-4",
	"sk-5",
	"sk-6",
	"sk-7",
	"sk-8",
];

function DeviceGridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 animate-pulse">
			{SKELETON_KEYS.map((key) => (
				<div
					key={key}
					className="h-36 rounded-xl border border-border-subtle bg-muted"
				/>
			))}
		</div>
	);
}

/**
 * Grid de dispositivos responsivo Mobile-First.
 * - Mobile: 2 colunas estritas (`grid-cols-2 gap-3`).
 * - Tablet/Desktop: 3 a 6 colunas (`sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`).
 *
 * Estratégia de ordenação e favoritos:
 * TODO(favorites): O backend atualmente não possui flag 'isFavorite' ou métrica de uso no Device DTO.
 * A priorização inteligente do hub organiza:
 * 1. Dispositivos ativos / ligados no topo (padrão Google/Apple Home para fácil desligamento).
 * 2. Dispositivos online ordenados por ambiente.
 * 3. Dispositivos offline / sem ambiente por último.
 */
export function HomeDeviceGrid({
	devices,
	isLoading,
	isError,
	onRetry,
}: HomeDeviceGridProps) {
	const { t } = useTranslation("home");
	const [activeFilter, setActiveFilter] = useState<"all" | "active">("all");

	// Ordenação inteligente com prioridade para dispositivos ativos
	const sortedDevices = useMemo(() => {
		return [...devices].sort((a, b) => {
			const aActive = a.isOnline && a.isOn ? 1 : 0;
			const bActive = b.isOnline && b.isOn ? 1 : 0;
			if (aActive !== bActive) return bActive - aActive;

			if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;

			const roomA = a.room || "ZZZ";
			const roomB = b.room || "ZZZ";
			const roomDiff = roomA.localeCompare(roomB);
			if (roomDiff !== 0) return roomDiff;

			return a.name.localeCompare(b.name);
		});
	}, [devices]);

	// Filtro rápido no mobile/desktop
	const filteredDevices = useMemo(() => {
		if (activeFilter === "active") {
			return sortedDevices.filter((d) => d.isOnline && d.isOn);
		}
		return sortedDevices;
	}, [sortedDevices, activeFilter]);

	const activeCount = useMemo(
		() => devices.filter((d) => d.isOnline && d.isOn).length,
		[devices],
	);

	return (
		<section className="flex h-full flex-col gap-4 rounded-xl border border-border-subtle bg-card p-4 sm:p-5">
			{/* Cabeçalho da Seção com Filtros Rápidos */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("devices.title", "Dispositivos")}
					</h2>
					<span className="rounded-full bg-popover px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border-subtle">
						{devices.length}
					</span>
				</div>

				{/* Chips de filtro rápido de conveniência */}
				<div className="flex items-center justify-between sm:justify-end gap-2">
					<div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-muted p-1 shadow-2xs">
						<button
							type="button"
							onClick={() => setActiveFilter("all")}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
								activeFilter === "all"
									? "bg-popover text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{t("devices.filterAll", "Todos")} ({devices.length})
						</button>
						<button
							type="button"
							onClick={() => setActiveFilter("active")}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
								activeFilter === "active"
									? "bg-popover text-primary shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{t("devices.filterActive", "Ligados")} ({activeCount})
						</button>
					</div>

					<Link
						to="/devices"
						className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
					>
						<span>{t("devices.viewAll", "Ver todos")}</span>
					</Link>
				</div>
			</div>

			{/* Grid de Dispositivos ou Estados */}
			{isLoading ? (
				<DeviceGridSkeleton />
			) : isError ? (
				<CardErrorFallback
					message={t(
						"errors.loadFailed",
						"Não foi possível carregar os dispositivos",
					)}
					retryLabel={t("errors.retry", "Tentar novamente")}
					onRetry={onRetry}
				/>
			) : filteredDevices.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-subtle bg-popover p-8 text-center">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-highest text-muted-foreground border border-border-subtle">
						<Layers className="h-5 w-5" />
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm font-medium text-foreground">
							{activeFilter === "active"
								? "Nenhum dispositivo ligado no momento"
								: t("devices.empty", "Nenhum dispositivo cadastrado ainda.")}
						</p>
						<p className="text-xs text-muted-foreground">
							{activeFilter === "active"
								? "Todos os aparelhos e iluminações estão em modo de espera."
								: "Adicione lâmpadas, interruptores e sensores na central."}
						</p>
					</div>
					{activeFilter === "all" && (
						<Link
							to="/devices"
							className="mt-2 inline-flex items-center justify-center rounded-lg border border-border-subtle bg-surface-highest px-3.5 py-1.5 text-xs font-medium text-foreground hover:brightness-110 transition-colors shadow-2xs"
						>
							{t("devices.actionManage", "Gerenciar dispositivos")}
						</Link>
					)}
				</div>
			) : (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
					{filteredDevices.map((device) => (
						<HomeDeviceCard key={device.id} device={device} />
					))}
				</div>
			)}
		</section>
	);
}
