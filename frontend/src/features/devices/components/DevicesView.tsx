import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { useDevice } from "../hooks/useDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceDetailPanel } from "./detail/DeviceDetailPanel";
import { DeviceDiscoveryModal } from "./dialogs/DeviceDiscoveryModal";
import { EditDeviceModal } from "./dialogs/EditDeviceModal";
import { DeviceFilterRail } from "./list/DeviceFilterRail";
import { DeviceListPanel } from "./list/DeviceListPanel";

/**
 * View de Dispositivos — master-detail, mesmo padrão estrutural de
 * `AutomationsView`/`RoomsView`: título vive DENTRO da coluna master (não
 * mais num header de página span-full acima das duas colunas — isso fazia
 * o painel de detalhe começar mais embaixo que o topo real da área de
 * conteúdo). Painel de lista de largura fixa à esquerda + painel de
 * detalhe ocupando o restante à direita, os dois nascem no mesmo Y. Abaixo
 * de `lg`, a lista ocupa a tela cheia e some quando algo é selecionado
 * (sem rota nova) — mesmo mecanismo de responsividade das outras.
 *
 * O antigo botão "+ Novo Dispositivo" do header de página foi removido —
 * duplicava o mesmo `onCreate` que já existe como ícone "+" dentro do
 * `DeviceListPanel` (mesmo padrão de `RoomListPanel`/`AutomationListPanel`,
 * nenhuma delas tem botão de criar fora do painel de lista).
 *
 * O filtro (rápido + por ambiente) vive todo na `DeviceFilterRail`, ao lado
 * da lista — mesmo padrão de trilha vertical de `AutomationFilterRail`
 * (feature `automations`). A trilha é autossuficiente (busca rooms/devices
 * e lê/escreve a store direto), por isso não recebe props daqui.
 */
export const DevicesView: React.FC = () => {
	const { t } = useTranslation("devices");
	const selectedDeviceId = useDevicesUIStore((s) => s.selectedDeviceId);
	const setSelectedDeviceId = useDevicesUIStore((s) => s.setSelectedDeviceId);
	const openDiscoveryModal = useDevicesUIStore((s) => s.openDiscoveryModal);

	const { data: selectedDevice = null } = useDevice(selectedDeviceId ?? "");

	return (
		<div className="flex h-full min-h-0 gap-4">
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col gap-4 lg:flex lg:w-96 lg:shrink-0",
					selectedDeviceId ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="flex shrink-0 flex-col gap-1">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						{t("title")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t(
							"header.subtitle",
							"Gerencie conexões, consumo e estados dos periféricos integrados.",
						)}
					</p>
				</div>

				<div className="flex min-h-0 flex-1 items-start gap-3">
					<DeviceFilterRail />

					<div className="h-full min-w-0 flex-1">
						<DeviceListPanel
							selectedId={selectedDeviceId}
							onSelect={setSelectedDeviceId}
							onCreate={openDiscoveryModal}
						/>
					</div>
				</div>
			</div>

			<div
				className={cn(
					"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
					selectedDeviceId ? "flex" : "hidden lg:flex",
				)}
			>
				<DeviceDetailPanel device={selectedDevice} />
			</div>

			<DeviceDiscoveryModal />
			<EditDeviceModal />
		</div>
	);
};
