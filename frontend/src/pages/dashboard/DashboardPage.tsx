import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActiveAutomationsCard } from "@/features/dashboard/components/ActiveAutomationsCard";
import { ActivityLogTimeline } from "@/features/dashboard/components/ActivityLogTimeline";
import { CameraFeedCard } from "@/features/dashboard/components/CameraFeedCard";
import { DashboardTopBar } from "@/features/dashboard/components/DashboardTopBar";
import {
	CHIP_TO_TYPES,
	type ChipKey,
	DeviceTypeFilterChips,
} from "@/features/dashboard/components/DeviceTypeFilterChips";
import { EnergyLoadWidget } from "@/features/dashboard/components/EnergyLoadWidget";
import { RoomDeviceSection } from "@/features/dashboard/components/RoomDeviceSection";
import { RoomDeviceSectionSkeleton } from "@/features/dashboard/components/RoomDeviceSectionSkeleton";
import { ScenesBar } from "@/features/dashboard/components/ScenesBar";
import { StatusHubSummary } from "@/features/dashboard/components/StatusHubSummary";
import { useDevices } from "@/features/devices/hooks/useDevices";
import type { Device } from "@/features/devices/types/devices.types";
import { SpotifyNowPlayingCard } from "@/features/integrations/components/SpotifyNowPlayingCard";
import { useRooms } from "@/features/rooms/hooks/useRooms";

const DEVICES_PAGE_SIZE = 200;
const UNASSIGNED_ROOM_KEY = "__unassigned__";

export function DashboardPage() {
	const { t } = useTranslation("dashboard");
	const [activeChip, setActiveChip] = useState<ChipKey>("all");

	const { data: roomsData, isLoading: isRoomsLoading } = useRooms();
	const { data: devicesPage, isLoading: isDevicesLoading } = useDevices({
		pageSize: DEVICES_PAGE_SIZE,
	});

	const devices = devicesPage?.items ?? [];
	const rooms = roomsData ?? [];
	const isLoading = isRoomsLoading || isDevicesLoading;

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

	return (
		<div className="flex flex-col gap-6">
			<DashboardTopBar />

			<div className="flex flex-col gap-4">
				<ScenesBar />
				<DeviceTypeFilterChips
					activeChip={activeChip}
					onChange={setActiveChip}
					countsByChip={countsByChip}
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				<div className="lg:col-span-8 flex flex-col gap-6">
					<StatusHubSummary />

					<EnergyLoadWidget />

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
		</div>
	);
}
