import { Loader2, RefreshCw, Search, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INTEGRATION_ICON } from "../../constants/devices.constants";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import { INTEGRATION_TYPE_LABEL_KEYS } from "../../types/devices.types";

export const DiscoveryStepFound: React.FC = () => {
	const { t } = useTranslation("devices");
	const isScanning = useDevicesUIStore((s) => s.isScanning);
	const discoveredDevices = useDevicesUIStore((s) => s.discoveredDevices);
	const selectDiscoveredDevice = useDevicesUIStore(
		(s) => s.selectDiscoveredDevice,
	);
	const triggerRescan = useDevicesUIStore((s) => s.triggerRescan);
	const setDiscoveryStep = useDevicesUIStore((s) => s.setDiscoveryStep);

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div className="pr-10">
				<h2 className="text-sm font-semibold text-[#e5e2e2]">
					{t("discoveryModal.scan.sectionTitle")}
				</h2>
				<p className="mt-0.5 text-[11px] text-[#c7c6cb]">
					{isScanning
						? t("discoveryModal.scan.scanningTitle")
						: t("discoveryModal.scan.foundCount", {
								count: discoveredDevices.length,
							})}
				</p>
			</div>

			<button
				type="button"
				onClick={triggerRescan}
				disabled={isScanning}
				className="flex items-center gap-3 rounded-lg border border-[#46464b]/30 bg-[#201f20] p-3 text-left transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
			>
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-[#c7c6cb]">
					<RefreshCw
						className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`}
					/>
				</span>
				<div className="min-w-0">
					<p className="text-xs font-medium text-[#e5e2e2]">
						{t("discoveryModal.scan.rescanButton")}
					</p>
					<p className="truncate text-[11px] text-[#8a898f]">
						{t("discoveryModal.scan.rescanDescription")}
					</p>
				</div>
			</button>

			<div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto">
				{discoveredDevices.map((device) => {
					const Icon = INTEGRATION_ICON[device.integrationType];
					return (
						<button
							key={device.temporaryId}
							type="button"
							onClick={() => selectDiscoveredDevice(device)}
							className="flex flex-col gap-1.5 rounded-lg border border-[#46464b]/30 bg-[#201f20] p-3 text-left transition-colors hover:bg-[#2a2a2a] cursor-pointer"
						>
							<div className="flex items-center gap-2">
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a2a] text-[#c5c6cf]">
									<Icon className="h-4 w-4" />
								</span>
								<div className="min-w-0">
									<p
										title={device.name}
										className="truncate text-sm font-medium text-[#e5e2e2]"
									>
										{device.name}
									</p>
									<p className="truncate text-[11px] text-[#c7c6cb]">
										{device.brand}
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between gap-2 text-[11px] text-[#c7c6cb]">
								<span className="truncate">
									{t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])}
								</span>
								{device.signalStrength != null ? (
									<span className="shrink-0">
										{t("discoveryModal.found.signalLabel", {
											value: device.signalStrength,
										})}
									</span>
								) : (
									device.ipAddress && (
										<span className="shrink-0 truncate font-mono">
											{device.ipAddress}
										</span>
									)
								)}
							</div>
						</button>
					);
				})}

				{isScanning && (
					<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#46464b]/40 p-6 text-center">
						<Loader2 className="h-5 w-5 animate-spin text-[#c5c6cf]" />
						<p className="text-[11px] text-[#c7c6cb]">
							{t("discoveryModal.scan.scanningSubtitle")}
						</p>
					</div>
				)}
			</div>

			{!isScanning && discoveredDevices.length === 0 && (
				<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#46464b]/40 py-10 text-center">
					<Search className="h-5 w-5 text-[#c7c6cb]" />
					<p className="text-sm font-medium text-[#e5e2e2]">
						{t("discoveryModal.scan.emptyTitle")}
					</p>
					<p className="max-w-xs text-[11px] text-[#c7c6cb]">
						{t("discoveryModal.scan.emptySubtitle")}
					</p>
				</div>
			)}

			<div className="mt-auto flex items-center justify-between border-t border-[#46464b]/20 pt-4">
				<button
					type="button"
					onClick={() => setDiscoveryStep("configure")}
					className="inline-flex items-center gap-2 rounded-full border border-[#46464b]/30 bg-transparent px-3 py-1.5 text-[11px] font-medium text-[#c7c6cb] transition-colors hover:bg-[#201f20] hover:text-[#e5e2e2] cursor-pointer"
				>
					<Settings2 className="h-3.5 w-3.5" />
					{t("discoveryModal.scan.manualButton")}
				</button>
			</div>
		</div>
	);
};
