import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CHIP_TO_TYPES,
	type ChipKey,
	UNASSIGNED_ROOM_KEY,
} from "@/features/dashboard/constants/dashboard.constants";
import { EditDeviceModal } from "@/features/devices/components/EditDeviceModal";
import { useDevices } from "@/features/devices/hooks/useDevices";
import type { Device } from "@/features/devices/types/devices.types";
import { SpotifyNowPlayingCard } from "@/features/integrations/components/SpotifyNowPlayingCard";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { useDashboardPreviewStore } from "../store/dashboard-preview.store";
import { ActiveAutomationsCard } from "./ActiveAutomationsCard";
import { ActivityLogTimeline } from "./ActivityLogTimeline";
import { CameraFeedCard } from "./CameraFeedCard";
import { DashboardTopBar } from "./DashboardTopBar";
import { DeviceTypeFilterChips } from "./DeviceTypeFilterChips";
import { EnergyLoadWidget } from "./EnergyLoadWidget";
import { RoomDeviceSection } from "./RoomDeviceSection";
import { RoomDeviceSectionSkeleton } from "./RoomDeviceSectionSkeleton";
import { ScenesBar } from "./ScenesBar";
import { StatusHubSummary } from "./StatusHubSummary";

const DEVICES_PAGE_SIZE = 200;

export const DashboardView: React.FC = () => {
	const { t } = useTranslation("dashboard");
	const [activeChip, setActiveChip] = useState<ChipKey>("all");

	const { data: roomsData, isLoading: isRoomsLoading } = useRooms();
	const { data: devicesPage, isLoading: isDevicesLoading } = useDevices({
		pageSize: DEVICES_PAGE_SIZE,
	});

	const { data: overviewData } = useDashboardOverview();

	const devices = devicesPage?.items ?? [];
	const rooms = roomsData ?? [];
	const isLoading = isRoomsLoading || isDevicesLoading;

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
		return filteredDevices.reduce<Record<string, Device[]>>((acc, device) => {
			const key = device.roomId ?? UNASSIGNED_ROOM_KEY;
			acc[key] = [...(acc[key] ?? []), device];
			return acc;
		}, {});
	}, [filteredDevices]);

	const roomSections = [
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
	];

	const roomKeys = roomSections.map((section) => section.key);
	const allRoomsExpanded = roomKeys.every((key) => expandedByRoom[key] ?? true);

	return (
		<div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
			<DashboardTopBar />

			<div className="flex flex-col gap-4">
				<ScenesBar />
				<DeviceTypeFilterChips
					activeChip={activeChip}
					onChange={setActiveChip}
					countsByChip={countsByChip}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
				<div className="lg:col-span-8 flex flex-col gap-6 self-stretch">
					<StatusHubSummary />

					<EnergyLoadWidget />

					{!isLoading && roomSections.length > 0 && (
						<button
							type="button"
							onClick={() => setAllRoomsExpanded(roomKeys, !allRoomsExpanded)}
							className="flex items-center gap-1.5 self-end rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer"
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

					<ActiveAutomationsCard />
				</div>

				<div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
					<CameraFeedCard />
					<SpotifyNowPlayingCard />
					<ActivityLogTimeline />
				</div>
			</div>

			<EditDeviceModal />
		</div>
	);
};
