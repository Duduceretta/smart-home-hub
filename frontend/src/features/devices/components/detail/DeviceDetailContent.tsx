import type { Device } from "../../types/devices.types";
import { getDeviceControlPanel } from "./controls/getDeviceControlPanel";
import { DeviceActivityFeed } from "./DeviceActivityFeed";
import { DeviceEnergyChart } from "./DeviceEnergyChart";
import { DeviceLinkedAutomations } from "./DeviceLinkedAutomations";

interface DeviceDetailContentProps {
	device: Device;
}

/**
 * Corpo do painel de detalhe do dispositivo — controles específicos da
 * categoria (resolvidos via `getDeviceControlPanel`, sem `if`s espalhados)
 * + os 3 blocos reaproveitados de Ambientes, filtrados por `deviceId`. Cada
 * seção busca seu próprio dado (loading/erro independentes por seção via
 * TanStack Query) e é dona do seu próprio estado vazio — mesmo padrão de
 * `rooms/components/detail/RoomDetailContent.tsx`.
 */
export function DeviceDetailContent({ device }: DeviceDetailContentProps) {
	const ControlPanel = getDeviceControlPanel(device.type);

	return (
		<div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-8 scrollbar-thin">
			<div className="flex flex-col gap-6">
				{ControlPanel && <ControlPanel device={device} />}

				<DeviceEnergyChart deviceId={device.id} />

				<DeviceLinkedAutomations deviceId={device.id} />

				<DeviceActivityFeed deviceId={device.id} />
			</div>
		</div>
	);
}
