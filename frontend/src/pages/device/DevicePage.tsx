import type React from "react";
import { CreateDeviceSheet } from "@/features/device/components/CreateDeviceSheet";
import { DevicesGrid } from "@/features/device/components/DevicesGrid";
import { DevicesHeader } from "@/features/device/components/DevicesHeader";
import { DevicesMetrics } from "@/features/device/components/DevicesMetrics";
import { DevicesToolbar } from "@/features/device/components/DevicesToolbar";
import { EditDeviceSheet } from "@/features/device/components/EditDeviceSheet";

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
