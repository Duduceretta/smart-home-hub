import type React from "react";
import { CreateDeviceSheet } from "@/features/devices/components/CreateDeviceSheet";
import { DevicesGrid } from "@/features/devices/components/DevicesGrid";
import { DevicesHeader } from "@/features/devices/components/DevicesHeader";
import { DevicesMetrics } from "@/features/devices/components/DevicesMetrics";
import { DevicesToolbar } from "@/features/devices/components/DevicesToolbar";
import { EditDeviceSheet } from "@/features/devices/components/EditDeviceSheet";

export const DevicesPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6 animate-fade-up">
			<DevicesHeader />
			<DevicesMetrics />
			<DevicesToolbar />
			<DevicesGrid />
			<CreateDeviceSheet />
			<EditDeviceSheet />
		</div>
	);
};
