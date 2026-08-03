import { CreateDeviceSheet } from "./CreateDeviceSheet";
import { DevicesGrid } from "./DevicesGrid";
import { DevicesHeader } from "./DevicesHeader";
import { DevicesMetrics } from "./DevicesMetrics";
import { DevicesToolbar } from "./DevicesToolbar";
import { EditDeviceSheet } from "./EditDeviceSheet";

export const DevicesView: React.FC = () => {
	return (
		<div className="flex flex-col animate-fade-up">
			{/* 1. Header */}
			<div className="pb-5">
				<DevicesHeader />
			</div>

			{/* 2. Métricas */}
			<div className="pb-6">
				<DevicesMetrics />
			</div>

			{/* 3. Toolbar */}
			<div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-zinc-900/20 border-y border-zinc-800/80 backdrop-blur-sm">
				<DevicesToolbar />
			</div>

			{/* 4. Grid de Dispositivos */}
			<div className="pt-6">
				<DevicesGrid />
			</div>

			{/* Sheets / Modais */}
			<CreateDeviceSheet />
			<EditDeviceSheet />
		</div>
	);
};
