import { CreateDeviceSheet } from "./CreateDeviceSheet";
import { DevicesGlanceBar } from "./DevicesGlanceBar";
import { DevicesGrid } from "./DevicesGrid";
import { DevicesHeader } from "./DevicesHeader";
import { DevicesToolbar } from "./DevicesToolbar";
import { EditDeviceSheet } from "./EditDeviceSheet";

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
			<CreateDeviceSheet />
			<EditDeviceSheet />
		</div>
	);
};
