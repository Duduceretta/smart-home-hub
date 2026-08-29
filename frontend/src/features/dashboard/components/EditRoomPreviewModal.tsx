import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { DEVICE_CONFIG } from "@/features/devices/constants/devices.constants";
import type { Device } from "@/features/devices/types/devices.types";
import { deviceUnitWidth, ROW_CAPACITY_UNITS } from "../lib/deviceRowUnits";

interface EditRoomPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	devices: Device[];
	selectedIds: string[];
	onSave: (deviceIds: string[]) => void;
	onReset: () => void;
}

export function EditRoomPreviewModal({
	isOpen,
	onClose,
	devices,
	selectedIds,
	onSave,
	onReset,
}: EditRoomPreviewModalProps) {
	const { t } = useTranslation(["dashboard", "common"]);
	const [draft, setDraft] = useState<string[]>(selectedIds);

	// Só ressincroniza ao ABRIR o modal — não a cada mudança de referência de
	// `selectedIds` (recalculado a cada render de RoomDeviceSection, inclusive
	// por refetches em segundo plano). Depender de `selectedIds` aqui apagava
	// silenciosamente a edição em andamento do usuário assim que qualquer
	// refetch acontecesse enquanto o modal estava aberto.
	// biome-ignore lint/correctness/useExhaustiveDependencies: sincroniza só na transição de isOpen, de propósito.
	useEffect(() => {
		if (isOpen) setDraft(selectedIds);
	}, [isOpen]);

	const usedUnits = draft.reduce((total, id) => {
		const device = devices.find((d) => d.id === id);
		return device ? total + deviceUnitWidth(device.type) : total;
	}, 0);

	const toggleDevice = (device: Device) => {
		const isSelected = draft.includes(device.id);
		if (isSelected) {
			setDraft((current) => current.filter((id) => id !== device.id));
			return;
		}
		const width = deviceUnitWidth(device.type);
		if (usedUnits + width > ROW_CAPACITY_UNITS) return;
		setDraft((current) => [...current, device.id]);
	};

	const handleSave = () => {
		onSave(draft);
		onClose();
	};

	const handleReset = () => {
		onReset();
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md bg-surface-container border-border-subtle text-foreground">
				<DialogHeader>
					<DialogTitle className="text-foreground">
						{t("roomSection.editTitle", "Escolher dispositivos exibidos")}
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						{t(
							"roomSection.editDescription",
							"No máximo o equivalente a 1 linha do grid (2 cards normais, ou 1 card largo como TV/Climatização).",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="relative">
					<div className="flex flex-col gap-2 max-h-80 overflow-y-auto scrollbar-thin">
						{devices.map((device) => {
							const isSelected = draft.includes(device.id);
							const width = deviceUnitWidth(device.type);
							const disabled =
								!isSelected && usedUnits + width > ROW_CAPACITY_UNITS;
							const Icon = DEVICE_CONFIG[device.type].icon;

							return (
								<label
									key={device.id}
									className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
										disabled
											? "border-border-subtle opacity-40 cursor-not-allowed"
											: "border-border-subtle hover:bg-surface-highest cursor-pointer"
									} ${isSelected ? "bg-surface-highest border-primary/40" : "bg-surface-high"}`}
								>
									<input
										type="checkbox"
										checked={isSelected}
										disabled={disabled}
										onChange={() => toggleDevice(device)}
										className="h-4 w-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
									/>
									<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-medium text-foreground truncate">
											{device.name}
										</span>
										<span className="text-xs text-muted-foreground/60">
											{width === 2
												? t("roomSection.wideCard", "ocupa a linha inteira")
												: t("roomSection.normalCard", "1 coluna")}
										</span>
									</div>
								</label>
							);
						})}
					</div>
					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface-container to-transparent" />
				</div>

				<DialogFooter className="bg-transparent border-t-0 pt-0">
					<Button
						variant="ghost"
						onClick={handleReset}
						className="text-muted-foreground hover:text-foreground"
					>
						{t("roomSection.resetToAuto", "Usar automático")}
					</Button>
					<Button
						onClick={handleSave}
						className="bg-primary text-primary-foreground hover:bg-primary/80"
					>
						{t("common:actions.save", "Salvar")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
