import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CHIP_TO_TYPES,
	type ChipKey,
} from "@/features/dashboard/constants/dashboard.constants";
import { EditDeviceModal } from "@/features/devices/components/EditDeviceModal";
import { useDevices } from "@/features/devices/hooks/useDevices";
import type { Device } from "@/features/devices/types/devices.types";
import { SpotifyNowPlayingCard } from "@/features/integrations/components/SpotifyNowPlayingCard";
import { useRooms } from "@/features/rooms/hooks/useRooms";
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
const UNASSIGNED_ROOM_KEY = "__unassigned__";

export const DashboardView: React.FC = () => {
	const { t } = useTranslation("dashboard");
	const [activeChip, setActiveChip] = useState<ChipKey>("all");

	const { data: roomsData, isLoading: isRoomsLoading } = useRooms();
	const { data: devicesPage, isLoading: isDevicesLoading } = useDevices({
		pageSize: DEVICES_PAGE_SIZE,
	});

	const devices = devicesPage?.items ?? [];
	const rooms = roomsData ?? [];
	const isLoading = isRoomsLoading || isDevicesLoading;

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
				<div className="lg:col-span-8 flex flex-col gap-6">
					<StatusHubSummary />

					<EnergyLoadWidget />

					{!isLoading && roomSections.length > 0 && (
						<button
							type="button"
							onClick={() => setAllRoomsExpanded(roomKeys, !allRoomsExpanded)}
							className="flex items-center gap-1.5 self-end rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#c7c6cb] transition-colors hover:bg-[#2a2a2a] hover:text-[#e5e2e2] cursor-pointer"
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
							/>
						))
					)}

					<ActiveAutomationsCard />
				</div>

				<div className="lg:col-span-4 flex flex-col gap-6">
					<CameraFeedCard />
					<SpotifyNowPlayingCard />
					<ActivityLogTimeline />
				</div>
			</div>

			<EditDeviceModal />
		</div>
	);
};
