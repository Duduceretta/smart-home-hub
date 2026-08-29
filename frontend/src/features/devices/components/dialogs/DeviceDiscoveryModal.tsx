import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { useDeviceDiscovery } from "../../hooks/useDeviceDiscovery";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import { DiscoveryStepConfigure } from "./discovery/DiscoveryStepConfigure";
import { DiscoveryStepDone } from "./discovery/DiscoveryStepDone";
import { DiscoveryStepFound } from "./discovery/DiscoveryStepFound";
import { DiscoveryStepper } from "./discovery/DiscoveryStepper";

export const DeviceDiscoveryModal: React.FC = () => {
	const { t } = useTranslation("devices");
	const isOpen = useDevicesUIStore((s) => s.isDiscoveryModalOpen);
	const discoveryStep = useDevicesUIStore((s) => s.discoveryStep);
	const closeDiscoveryModal = useDevicesUIStore((s) => s.closeDiscoveryModal);

	useDeviceDiscovery();

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) closeDiscoveryModal();
			}}
		>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl">
				<div className="flex max-h-[80vh] min-h-137.5">
					{/* Coluna esquerda: contexto + stepper vertical */}
					<div className="flex w-[34%] shrink-0 flex-col justify-between border-r border-border-subtle/10 bg-surface-low p-6">
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-4">
								<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-surface-high to-surface-container text-primary ring-1 ring-border-subtle/30">
									<Plus className="h-5 w-5" />
								</span>
								<DialogHeader className="gap-1">
									<DialogTitle className="text-lg">
										{t("discoveryModal.title")}
									</DialogTitle>
									<DialogDescription className="text-xs">
										{t("discoveryModal.subtitle")}
									</DialogDescription>
								</DialogHeader>
							</div>

							<DiscoveryStepper currentStep={discoveryStep} />
						</div>

						<div className="flex w-fit items-center gap-2 h-8 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
							{t("discoveryModal.sidebar.pairingModeActive")}
						</div>
					</div>

					{/* Coluna direita: conteúdo dinâmico do passo atual */}
					<div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
						<div
							key={discoveryStep}
							className="flex flex-1 flex-col motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-300 motion-safe:ease-out"
						>
							{discoveryStep === "scan" && <DiscoveryStepFound />}
							{discoveryStep === "configure" && <DiscoveryStepConfigure />}
							{discoveryStep === "done" && <DiscoveryStepDone />}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
