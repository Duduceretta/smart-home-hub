import { Loader2, RefreshCw, Search, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INTEGRATION_ICON } from "../../../constants/devices.constants";
import { useDevicesUIStore } from "../../../store/devices-ui.store";
import { INTEGRATION_TYPE_LABEL_KEYS } from "../../../types/devices.types";
import { cn } from "@/core/utils";

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
				<h2 className="text-sm font-bold tracking-tight text-foreground">
					{t("discoveryModal.scan.sectionTitle")}
				</h2>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{isScanning
						? t("discoveryModal.scan.scanningTitle")
						: t("discoveryModal.scan.foundCount", {
								count: discoveredDevices.length,
							})}
				</p>
			</div>

			{/* Banner de Repetir Busca / Status */}
			<button
				type="button"
				onClick={triggerRescan}
				disabled={isScanning}
				className="flex items-center gap-3.5 rounded-xl border border-border-subtle bg-surface-low p-3.5 text-left transition-all hover:border-border hover:bg-surface-high/60 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs"
			>
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-container text-foreground shadow-xs">
					<RefreshCw
						className={cn("h-4 w-4", isScanning && "animate-spin text-primary")}
					/>
				</span>
				<div className="min-w-0">
					<p className="text-xs font-semibold text-foreground">
						{t("discoveryModal.scan.rescanButton")}
					</p>
					<p className="truncate text-xs text-muted-foreground">
						{t("discoveryModal.scan.rescanDescription")}
					</p>
				</div>
			</button>

			{/* Lista de Dispositivos ou Empty/Scanning State */}
			{discoveredDevices.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border-subtle bg-surface-low/50 py-10 text-center">
					{isScanning ? (
						<>
							<Loader2 className="h-5 w-5 animate-spin text-primary" />
							<p className="text-xs font-medium text-muted-foreground">
								{t("discoveryModal.scan.scanningSubtitle")}
							</p>
						</>
					) : (
						<>
							<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-container text-muted-foreground shadow-xs">
								<Search className="h-5 w-5" />
							</div>
							<p className="text-sm font-semibold text-foreground">
								{t("discoveryModal.scan.emptyTitle")}
							</p>
							<p className="max-w-xs text-xs text-muted-foreground">
								{t("discoveryModal.scan.emptySubtitle")}
							</p>
						</>
					)}
				</div>
			) : (
				<div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto scrollbar-gutter-stable scrollbar-thin">
					{discoveredDevices.map((device) => {
						const Icon = INTEGRATION_ICON[device.integrationType];
						return (
							<button
								key={device.temporaryId}
								type="button"
								onClick={() => selectDiscoveredDevice(device)}
								className="group flex flex-col justify-between gap-3 rounded-xl border border-border-subtle bg-surface-low p-3.5 text-left transition-all hover:border-primary/40 hover:bg-surface-high/60 cursor-pointer shadow-xs"
							>
								<div className="flex items-center gap-3">
									<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-container text-primary shadow-xs transition-colors group-hover:border-primary/30">
										<Icon className="h-4.5 w-4.5" />
									</span>
									<div className="min-w-0">
										<p
											title={device.name}
											className="truncate text-xs font-semibold text-foreground"
										>
											{device.name}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{device.brand}
										</p>
									</div>
								</div>

								<div className="flex items-center justify-between gap-2 border-t border-border-subtle/50 pt-2 text-[11px] text-muted-foreground">
									<span className="truncate font-medium uppercase tracking-wider">
										{t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])}
									</span>
									{device.signalStrength != null ? (
										<span className="shrink-0 font-medium">
											{t("discoveryModal.found.signalLabel", {
												value: device.signalStrength,
											})}
										</span>
									) : (
										device.ipAddress && (
											<span className="shrink-0 font-mono rounded bg-surface-container border border-border-subtle px-1.5 py-0.5 text-[10px] text-foreground">
												{device.ipAddress}
											</span>
										)
									)}
								</div>
							</button>
						);
					})}

					{isScanning && (
						<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-surface-low/30 p-6 text-center">
							<Loader2 className="h-5 w-5 animate-spin text-primary" />
							<p className="text-xs text-muted-foreground">
								{t("discoveryModal.scan.scanningSubtitle")}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Rodapé: Ação Manual */}
			<div className="mt-auto flex items-center justify-between border-t border-border-subtle/60 pt-4">
				<button
					type="button"
					onClick={() => setDiscoveryStep("configure")}
					className="inline-flex h-8.5 items-center gap-2 rounded-lg border border-border-subtle bg-surface-container px-3.5 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-surface-high hover:text-foreground cursor-pointer shadow-xs"
				>
					<Settings2 className="h-3.5 w-3.5" />
					{t("discoveryModal.scan.manualButton")}
				</button>
			</div>
		</div>
	);
};
