import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { useSystemicFailureDetector } from "@/core/hooks/useSystemicFailureDetector";
import { ActiveAutomationsCard } from "@/features/dashboard/components/ActiveAutomationsCard";
import { ActivityLogTimeline } from "@/features/dashboard/components/ActivityLogTimeline";
import { CameraFeedCard } from "@/features/dashboard/components/CameraFeedCard";
import { DashboardTopBar } from "@/features/dashboard/components/DashboardTopBar";
import { DeviceTypeFilterChips } from "@/features/dashboard/components/DeviceTypeFilterChips";
import { EnergyLoadWidget } from "@/features/dashboard/components/EnergyLoadWidget";
import { RoomDeviceSectionSkeleton } from "@/features/dashboard/components/RoomDeviceSectionSkeleton";
import { ScenesBar } from "@/features/dashboard/components/ScenesBar";
import { StatusHubSummary } from "@/features/dashboard/components/StatusHubSummary";
import { SystemicFailureBanner } from "@/features/dashboard/components/SystemicFailureBanner";
import {
	ACTIVITY_LOG_VISIBLE_ENTRIES_LIMIT,
	CHIP_TO_TYPES,
	type ChipKey,
	UNASSIGNED_ROOM_KEY,
} from "@/features/dashboard/constants/dashboard.constants";
import { useActivityLog } from "@/features/dashboard/hooks/useActivityLog";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview";
import { useRecentAutomations } from "@/features/dashboard/hooks/useRecentAutomations";
import { useDashboardPreviewStore } from "@/features/dashboard/store/dashboard-preview.store";
import { useDashboardUIStore } from "@/features/dashboard/store/dashboard-ui.store";
import { EditDeviceModal } from "@/features/devices/components/dialogs/EditDeviceModal";
import { useDevices } from "@/features/devices/hooks/useDevices";
import type { Device } from "@/features/devices/types/devices.types";
import { SpotifyNowPlayingCard } from "@/features/integrations/components/SpotifyNowPlayingCard";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { RoomDeviceSection } from "./RoomDeviceSection";

const DEVICES_PAGE_SIZE = 200;

export const DashboardView: React.FC = () => {
	const { t } = useTranslation("dashboard");
	const activeChip = useDashboardUIStore((s) => s.activeChip);
	const setActiveChip = useDashboardUIStore((s) => s.setActiveChip);

	const {
		data: roomsData,
		isLoading: isRoomsLoading,
		isError: isRoomsError,
		refetch: refetchRooms,
	} = useRooms();
	const {
		data: devicesPage,
		isLoading: isDevicesLoading,
		isError: isDevicesError,
		refetch: refetchDevices,
	} = useDevices({
		pageSize: DEVICES_PAGE_SIZE,
	});

	const {
		data: overviewData,
		isError: isOverviewError,
		refetch: refetchOverview,
	} = useDashboardOverview();
	const {
		isError: isAutomationsSummaryError,
		refetch: refetchAutomationsSummary,
	} = useRecentAutomations();
	const { isError: isActivityLogError, refetch: refetchActivityLog } =
		useActivityLog(1, ACTIVITY_LOG_VISIBLE_ENTRIES_LIMIT);

	const devices = devicesPage?.items ?? [];
	const rooms = roomsData ?? [];
	const isLoading = isRoomsLoading || isDevicesLoading;
	const isError = isRoomsError || isDevicesError;

	/**
	 * Detector de falha sistêmica (seção 12.2 de `ui-and-design-system.md`):
	 * as 5 áreas do Dashboard (KPIs, gráfico de energia, seção de cômodos,
	 * automações recentes, linha do tempo) consomem, no total, estas 5
	 * queries independentes. 2+ falhando ao mesmo tempo é sintoma de outage
	 * de rede/backend, não de bug isolado num endpoint — nesse caso um
	 * único banner consolidado substitui os 5 alertas fragmentados.
	 */
	const { isSystemic, retryAll } = useSystemicFailureDetector([
		{ isError: isOverviewError, refetch: refetchOverview },
		{ isError: isRoomsError, refetch: refetchRooms },
		{ isError: isDevicesError, refetch: refetchDevices },
		{ isError: isAutomationsSummaryError, refetch: refetchAutomationsSummary },
		{ isError: isActivityLogError, refetch: refetchActivityLog },
	]);

	const energyUsageByRoomKey = useMemo(() => {
		const map: Record<string, { value: number; isEstimated: boolean }> = {};
		for (const room of overviewData?.roomUsage ?? []) {
			map[room.roomId ?? UNASSIGNED_ROOM_KEY] = {
				value: room.value,
				isEstimated: room.isEstimated,
			};
		}
		return map;
	}, [overviewData]);

	const expandedByRoom = useDashboardPreviewStore((s) => s.expandedByRoom);
	const setAllRoomsExpanded = useDashboardPreviewStore(
		(s) => s.setAllRoomsExpanded,
	);

	const countsByChip = useMemo(() => {
		const counts: Record<ChipKey, number> = {
			all: devices.length,
			lights: 0,
			climate: 0,
			media: 0,
		};
		for (const device of devices) {
			if (CHIP_TO_TYPES.lights?.includes(device.type)) counts.lights += 1;
			if (CHIP_TO_TYPES.climate?.includes(device.type)) counts.climate += 1;
			if (CHIP_TO_TYPES.media?.includes(device.type)) counts.media += 1;
		}
		return counts;
	}, [devices]);

	const filteredDevices = useMemo(() => {
		const allowedTypes = CHIP_TO_TYPES[activeChip];
		if (!allowedTypes) return devices;
		return devices.filter((device) => allowedTypes.includes(device.type));
	}, [devices, activeChip]);

	const devicesByRoomId = useMemo(() => {
		const map: Record<string, Device[]> = {};
		for (const device of filteredDevices) {
			const key = device.roomId ?? UNASSIGNED_ROOM_KEY;
			if (!map[key]) map[key] = [];
			map[key].push(device);
		}
		return map;
	}, [filteredDevices]);

	const roomSections = useMemo(
		() => [
			...rooms
				.filter((room) => (devicesByRoomId[room.id]?.length ?? 0) > 0)
				.map((room) => ({
					key: room.id,
					title: room.name,
					roomId: room.id,
					icon: room.icon,
				})),
			...(devicesByRoomId[UNASSIGNED_ROOM_KEY]?.length
				? [
						{
							key: UNASSIGNED_ROOM_KEY,
							title: t("roomSection.unassigned", "Sem Ambiente"),
							roomId: undefined,
							icon: undefined,
						},
					]
				: []),
		],
		[rooms, devicesByRoomId, t],
	);

	const roomKeys = roomSections.map((section) => section.key);
	const allRoomsExpanded = roomKeys.every((key) => expandedByRoom[key] ?? true);

	return (
		<div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
			<DashboardTopBar />

			{isSystemic && <SystemicFailureBanner onRetryAll={retryAll} />}

			<div className="flex flex-col gap-4">
				<ScenesBar />
				<DeviceTypeFilterChips
					activeChip={activeChip}
					onChange={setActiveChip}
					countsByChip={countsByChip}
				/>
			</div>

			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
				{/* Coluna Principal (Esquerda - 8 colunas) */}
				<div className="flex flex-col gap-6 self-stretch lg:col-span-8">
					<StatusHubSummary suppressErrorUI={isSystemic} />

					<EnergyLoadWidget suppressErrorUI={isSystemic} />

					{!isLoading && roomSections.length > 0 && (
						<button
							type="button"
							onClick={() => setAllRoomsExpanded(roomKeys, !allRoomsExpanded)}
							className="flex items-center gap-1.5 self-end rounded-md border border-border-subtle bg-surface-container/50 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-surface-high hover:text-foreground cursor-pointer shadow-xs"
						>
							{allRoomsExpanded ? (
								<ChevronsDownUp className="h-3.5 w-3.5" />
							) : (
								<ChevronsUpDown className="h-3.5 w-3.5" />
							)}
							{t(
								allRoomsExpanded
									? "roomSection.collapseAll"
									: "roomSection.expandAll",
							)}
						</button>
					)}

					{isLoading ? (
						<>
							<RoomDeviceSectionSkeleton />
							<RoomDeviceSectionSkeleton />
						</>
					) : isError ? (
						isSystemic ? (
							<>
								<RoomDeviceSectionSkeleton />
								<RoomDeviceSectionSkeleton />
							</>
						) : (
							<CardErrorFallback
								message={t(
									"roomSection.errorTitle",
									"Não foi possível carregar os ambientes e dispositivos",
								)}
								retryLabel={t("common:actions.retry", "Tentar novamente")}
								onRetry={() => {
									refetchRooms();
									refetchDevices();
								}}
							/>
						)
					) : (
						roomSections.map((section) => (
							<RoomDeviceSection
								key={section.key}
								title={section.title}
								roomId={section.roomId}
								icon={section.icon}
								devices={devicesByRoomId[section.key] ?? []}
								energyUsageKwh={energyUsageByRoomKey[section.key]?.value}
								energyUsageIsEstimated={
									energyUsageByRoomKey[section.key]?.isEstimated
								}
							/>
						))
					)}

					<ActiveAutomationsCard suppressErrorUI={isSystemic} />
				</div>

				{/* Coluna Lateral de Monitoramento (Direita - 4 colunas) */}
				<div className="sticky top-6 flex flex-col gap-6 lg:col-span-4">
					<CameraFeedCard />
					<SpotifyNowPlayingCard />
					<ActivityLogTimeline suppressErrorUI={isSystemic} />
				</div>
			</div>

			<EditDeviceModal />
		</div>
	);
};
