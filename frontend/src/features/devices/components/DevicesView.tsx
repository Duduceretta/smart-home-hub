import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
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
 * `AutomationsView`/`RoomsView`: título vive DENTRO da coluna master.
 * Painel de lista de largura fixa à esquerda + painel de detalhe ocupando o
 * restante à direita, os dois nascem no mesmo Y.
 */
export const DevicesView: React.FC = () => {
	const { t } = useTranslation("devices");
	const location = useLocation();
	const navigate = useNavigate();

	const returnTo = (location.state as { returnTo?: string })?.returnTo;
	const returnLabel = (location.state as { returnLabel?: string })?.returnLabel;
	const stateDeviceId = (location.state as { selectedDeviceId?: string })
		?.selectedDeviceId;

	const selectedDeviceId = useDevicesUIStore((s) => s.selectedDeviceId);
	const setSelectedDeviceId = useDevicesUIStore((s) => s.setSelectedDeviceId);
	const resetFilters = useDevicesUIStore((s) => s.resetFilters);
	const openDiscoveryModal = useDevicesUIStore((s) => s.openDiscoveryModal);

	useEffect(() => {
		if (stateDeviceId) {
			resetFilters();
			setSelectedDeviceId(stateDeviceId);
		}
	}, [stateDeviceId, resetFilters, setSelectedDeviceId]);

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
					{returnTo && (
						<button
							type="button"
							onClick={() => navigate(returnTo)}
							className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-1"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							{t("header.returnTo", {
								label: returnLabel || t("title", "Dispositivos"),
							})}
						</button>
					)}
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
