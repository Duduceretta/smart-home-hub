import { cn } from "@/core/utils";
import { useDevice } from "../hooks/useDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceDetailPanel } from "./detail/DeviceDetailPanel";
import { DeviceDiscoveryModal } from "./dialogs/DeviceDiscoveryModal";
import { EditDeviceModal } from "./dialogs/EditDeviceModal";
import { DeviceListPanel } from "./list/DeviceListPanel";
import { DevicesGlanceBar } from "./list/DevicesGlanceBar";
import { DevicesHeader } from "./list/DevicesHeader";

/**
 * View de Dispositivos — master-detail, mesmo padrão estrutural de
 * `RoomsView` (feature `rooms`): painel de lista de largura fixa à esquerda
 * + painel de detalhe ocupando o restante à direita, nivelados. Abaixo de
 * `lg`, a lista ocupa a tela cheia e some quando algo é selecionado (sem
 * rota nova) — mesmo mecanismo de responsividade de `RoomsView`.
 * `DevicesHeader`/`DevicesGlanceBar` continuam no topo, span completo,
 * inalterados.
 */
export const DevicesView: React.FC = () => {
	const selectedDeviceId = useDevicesUIStore((s) => s.selectedDeviceId);
	const setSelectedDeviceId = useDevicesUIStore((s) => s.setSelectedDeviceId);
	const openDiscoveryModal = useDevicesUIStore((s) => s.openDiscoveryModal);

	const { data: selectedDevice = null } = useDevice(selectedDeviceId ?? "");

	return (
		<div className="flex h-full min-h-0 flex-col gap-6">
			<DevicesHeader />
			<DevicesGlanceBar />

			<div className="flex min-h-0 flex-1 gap-4">
				<div
					className={cn(
						"h-full w-full min-h-0 flex-col lg:flex lg:w-80 lg:shrink-0",
						selectedDeviceId ? "hidden lg:flex" : "flex",
					)}
				>
					<DeviceListPanel
						selectedId={selectedDeviceId}
						onSelect={setSelectedDeviceId}
						onCreate={openDiscoveryModal}
					/>
				</div>

				<div
					className={cn(
						"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
						selectedDeviceId ? "flex" : "hidden lg:flex",
					)}
				>
					<DeviceDetailPanel device={selectedDevice} />
				</div>
			</div>

			<DeviceDiscoveryModal />
			<EditDeviceModal />
		</div>
	);
};
