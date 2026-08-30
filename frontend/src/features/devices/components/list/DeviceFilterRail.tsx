import {
	AlertTriangle,
	LayoutGrid,
	Lightbulb,
	Snowflake,
	Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { ROOM_ICON_MAP } from "@/features/rooms/constants/rooms.constants";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { useDevices } from "../../hooks/useDevices";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import { DeviceTypeEnum } from "../../types/devices.types";

interface RailChip {
	key: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	isActive: boolean;
	badge?: number;
	onClick?: () => void;
}

/**
 * Trilha vertical de filtro — mesmo padrão de `AutomationFilterRail`
 * (feature `automations`), duplicado localmente (isolamento do FSD):
 * recolhida (~52px) por padrão, só ícone + barra lateral indicando o ativo;
 * expande em overlay (absolute, não desloca a lista) no hover do mouse OU
 * pinada por toque/clique, fechando só com um clique/toque fora dela.
 *
 * Reúne dois grupos de filtro, separados por divisor: os filtros rápidos
 * que antes viviam em `DevicesGlanceBar.tsx` (removida da página — mesmas
 * métricas, mesma lógica de toggle) e o filtro por ambiente que já morava
 * aqui. "Total" e "Clima" eram só informativos na barra antiga; aqui viram
 * filtros de verdade (Total = limpa tudo, Clima = categoria Climatização),
 * já que na trilha todo item é um botão — não faz sentido misturar chip
 * estático com chip clicável no mesmo grupo visual.
 */
export function DeviceFilterRail() {
	const { t } = useTranslation("devices");
	const railRef = useRef<HTMLDivElement>(null);
	const [hovered, setHovered] = useState(false);
	const [pinned, setPinned] = useState(false);
	const expanded = hovered || pinned;

	const { data: rooms = [] } = useRooms();
	const { data: devicesData } = useDevices({ pageSize: 200 });
	const devices = devicesData?.items ?? [];

	const {
		query,
		activeTab,
		setActiveTab,
		statusFilter,
		setStatusFilter,
		selectedRoomId,
		setSelectedRoomId,
		onlyOn,
		toggleOnlyOn,
		resetFilters,
	} = useDevicesUIStore();

	const metrics = useMemo(() => {
		const total = devices.length;
		const lightsOnCount = devices.filter(
			(d) => d.category === "Iluminação" && d.isOn && d.isOnline,
		).length;
		const offlineCount = devices.filter((d) => !d.isOnline).length;
		const climateCount = devices.filter(
			(d) => d.type === DeviceTypeEnum.Thermostat,
		).length;
		const activeCount = devices.filter((d) => d.isOn && d.isOnline).length;
		const estimatedWatts = activeCount * 120;

		return { total, lightsOnCount, offlineCount, climateCount, estimatedWatts };
	}, [devices]);

	useEffect(() => {
		if (!pinned) return;

		const handlePointerDown = (event: PointerEvent) => {
			if (!railRef.current?.contains(event.target as Node)) {
				setPinned(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [pinned]);

	const isNoFilterActive =
		query === "" &&
		activeTab === "Todos" &&
		statusFilter === null &&
		selectedRoomId === null &&
		!onlyOn;
	const isLightsFilterActive = activeTab === "Iluminação" && onlyOn;
	const isConsumptionFilterActive = onlyOn && activeTab === "Todos";
	const isClimateFilterActive = activeTab === "Climatização";
	const isOfflineFilterActive = statusFilter === "offline";

	const quickFilterChips: RailChip[] = [
		{
			key: "all",
			label: t("glanceBar.total", `${metrics.total} Dispositivos`, {
				count: metrics.total,
			}),
			icon: LayoutGrid,
			isActive: isNoFilterActive,
			onClick: resetFilters,
		},
		{
			key: "lights",
			label: t("glanceBar.lightsOn", `${metrics.lightsOnCount} Luzes Acesas`, {
				count: metrics.lightsOnCount,
			}),
			icon: Lightbulb,
			isActive: isLightsFilterActive,
			badge: metrics.lightsOnCount,
			onClick: () => {
				if (isLightsFilterActive) {
					setActiveTab("Todos");
					if (onlyOn) toggleOnlyOn();
				} else {
					setActiveTab("Iluminação");
					if (!onlyOn) toggleOnlyOn();
				}
			},
		},
		{
			key: "consumption",
			label: t("glanceBar.consumption", `${metrics.estimatedWatts}W Consumo`, {
				watts: metrics.estimatedWatts,
			}),
			icon: Zap,
			isActive: isConsumptionFilterActive,
			onClick: toggleOnlyOn,
		},
		{
			key: "climate",
			label: t("glanceBar.climate", `${metrics.climateCount} Clima`, {
				count: metrics.climateCount,
			}),
			icon: Snowflake,
			isActive: isClimateFilterActive,
			badge: metrics.climateCount,
			onClick: () =>
				setActiveTab(isClimateFilterActive ? "Todos" : "Climatização"),
		},
		...(metrics.offlineCount > 0
			? [
					{
						key: "offline",
						label: t("glanceBar.offline", `${metrics.offlineCount} Offline`, {
							count: metrics.offlineCount,
						}),
						icon: AlertTriangle,
						isActive: isOfflineFilterActive,
						badge: metrics.offlineCount,
						onClick: () =>
							setStatusFilter(isOfflineFilterActive ? null : "offline"),
					} satisfies RailChip,
				]
			: []),
	];

	const roomChips: RailChip[] = [
		{
			key: "room-all",
			label: t("toolbar.roomFilterAll", "Todos"),
			icon: LayoutGrid,
			isActive: selectedRoomId === null,
			onClick: () => setSelectedRoomId(null),
		},
		...rooms.map(
			(room): RailChip => ({
				key: `room-${room.id}`,
				label: room.name,
				icon: ROOM_ICON_MAP[room.icon ?? ""] ?? ROOM_ICON_MAP.default,
				isActive: selectedRoomId === room.id,
				onClick: () => setSelectedRoomId(room.id),
			}),
		),
	];

	const renderChip = (chip: RailChip) => {
		const Icon = chip.icon;

		return (
			<button
				key={chip.key}
				type="button"
				onClick={() => {
					chip.onClick?.();
					setPinned(true);
				}}
				aria-pressed={chip.isActive}
				title={expanded ? undefined : chip.label}
				className={cn(
					"group relative flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-left transition-all cursor-pointer",
					chip.isActive
						? "bg-primary/10 text-foreground"
						: "text-muted-foreground hover:bg-surface-high hover:text-foreground",
				)}
			>
				<span
					className={cn(
						"absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary transition-opacity",
						chip.isActive ? "opacity-100" : "opacity-0",
					)}
				/>

				<span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
					<Icon
						className={cn(
							"h-4 w-4 transition-colors",
							chip.isActive
								? "text-primary"
								: "text-muted-foreground group-hover:text-foreground",
						)}
					/>
					{!!chip.badge && chip.badge > 0 && !expanded && (
						<span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-surface-low px-0.5 text-[9px] font-bold tabular-nums leading-none text-foreground">
							{chip.badge > 9 ? "9+" : chip.badge}
						</span>
					)}
				</span>

				{expanded && (
					<span
						className={cn(
							"min-w-0 flex-1 truncate text-xs tracking-tight whitespace-nowrap",
							chip.isActive
								? "font-semibold text-foreground"
								: "font-medium text-muted-foreground group-hover:text-foreground",
						)}
					>
						{chip.label}
					</span>
				)}
			</button>
		);
	};

	return (
		<section
			ref={railRef}
			aria-label={t("toolbar.filterRailAriaLabel", "Filtros de dispositivos")}
			className="relative h-full w-13 shrink-0"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<div
				className={cn(
					"absolute inset-y-0 left-0 flex flex-col overflow-hidden rounded-xl bg-surface-low shadow-sm transition-[width] duration-200 ease-out",
					expanded ? "z-20 w-52 shadow-lg" : "z-10 w-13",
				)}
			>
				<div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5 scrollbar-thin">
					{quickFilterChips.map(renderChip)}
					{roomChips.length > 1 && (
						<>
							<div className="mx-2 my-1 h-px shrink-0 bg-border-subtle" />
							{roomChips.map(renderChip)}
						</>
					)}
				</div>
			</div>
		</section>
	);
}
