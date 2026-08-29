import { DeviceDiscoveryModal } from "./dialogs/DeviceDiscoveryModal";
import { EditDeviceModal } from "./dialogs/EditDeviceModal";
import { DevicesGlanceBar } from "./list/DevicesGlanceBar";
import { DevicesGrid } from "./list/DevicesGrid";
import { DevicesHeader } from "./list/DevicesHeader";
import { DevicesToolbar } from "./list/DevicesToolbar";

export const DevicesView: React.FC = () => {
	return (
		<div className="flex flex-col space-y-8">
			{/* 1. Header */}
			<DevicesHeader />

			{/* 2. Métricas */}
			<DevicesGlanceBar />

			{/* 3. Toolbar */}
			<DevicesToolbar />

			{/* 4. Grid de Dispositivos */}
			<DevicesGrid />

			{/* Sheets / Modais */}
			<DeviceDiscoveryModal />
			<EditDeviceModal />
		</div>
	);
};
