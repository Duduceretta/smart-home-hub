import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { cn } from "@/core/utils";
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
			<DialogContent
				className={cn(
					"gap-0 overflow-hidden border border-border-subtle bg-surface-container p-0 text-foreground shadow-2xl sm:max-w-5xl sm:rounded-2xl",
					// Abaixo de sm vira tela cheia, mesmo padrão do
					// EditRoomPreviewModal (Dashboard)/EditDeviceModal.
					"max-sm:fixed max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-dvh max-sm:max-w-none max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none",
				)}
			>
				<div className="flex max-h-full min-h-0 flex-col sm:max-h-[85vh] sm:min-h-137.5 sm:flex-row">
					{/* Coluna esquerda (linha acima de sm): contexto + stepper vertical */}
					<div className="flex shrink-0 flex-col justify-between gap-6 border-b border-border-subtle bg-surface-low/75 p-4 sm:w-[34%] sm:border-r sm:border-b-0 sm:p-6">
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-3.5">
								<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-surface-high text-primary shadow-xs">
									<Plus className="h-5 w-5" />
								</span>

								<DialogHeader className="gap-1 text-left">
									<DialogTitle className="text-lg font-bold tracking-tight text-foreground">
										{t("discoveryModal.title")}
									</DialogTitle>
									<DialogDescription className="text-xs leading-relaxed text-muted-foreground">
										{t("discoveryModal.subtitle")}
									</DialogDescription>
								</DialogHeader>
							</div>

							<DiscoveryStepper currentStep={discoveryStep} />
						</div>

						{/* Badge de status ativo do pareamento */}
						<div className="flex w-fit items-center gap-2 h-7.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-xs font-medium text-primary shadow-xs">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
							{t("discoveryModal.sidebar.pairingModeActive")}
						</div>
					</div>

					{/* Coluna direita (área abaixo, <sm): conteúdo dinâmico do passo atual */}
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 scrollbar-gutter-stable scrollbar-thin bg-surface-container sm:p-6">
						<div
							key={discoveryStep}
							className="flex flex-1 flex-col animate-fade-in"
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
