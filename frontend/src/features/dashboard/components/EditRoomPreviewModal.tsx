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
import { cn } from "@/core/utils";
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
			<DialogContent className="sm:max-w-md border-border-subtle bg-popover text-foreground shadow-xl">
				<DialogHeader>
					<DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
						{t("roomSection.editTitle", "Escolher dispositivos exibidos")}
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						{t(
							"roomSection.editDescription",
							"No máximo o equivalente a 1 linha do grid (2 cards normais, ou 1 card largo como TV/Climatização).",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
					{devices.map((device) => {
						const isSelected = draft.includes(device.id);
						const width = deviceUnitWidth(device.type);
						const disabled =
							!isSelected && usedUnits + width > ROW_CAPACITY_UNITS;
						const Icon = DEVICE_CONFIG[device.type].icon;

						return (
							<label
								key={device.id}
								className={cn(
									"flex items-center gap-3.5 rounded-lg border p-3.5 transition-all",
									disabled
										? "border-border-subtle bg-surface-low/30 opacity-40 cursor-not-allowed"
										: "cursor-pointer",
									isSelected
										? "border-primary/50 bg-primary/10 text-foreground"
										: !disabled &&
												"border-border-subtle bg-surface-container hover:border-border hover:bg-surface-high",
								)}
							>
								<input
									type="checkbox"
									checked={isSelected}
									disabled={disabled}
									onChange={() => toggleDevice(device)}
									className="h-4 w-4 shrink-0 rounded border-border-subtle text-primary accent-primary focus:ring-primary/40 cursor-pointer disabled:cursor-not-allowed"
								/>
								<Icon
									className={cn(
										"h-4 w-4 shrink-0 transition-colors",
										isSelected ? "text-primary" : "text-muted-foreground",
									)}
								/>
								<div className="flex min-w-0 flex-1 flex-col">
									<span className="truncate text-sm font-medium text-foreground">
										{device.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{width === 2
											? t("roomSection.wideCard", "ocupa a linha inteira")
											: t("roomSection.normalCard", "1 coluna")}
									</span>
								</div>
							</label>
						);
					})}
				</div>

				<DialogFooter className="border-t-0 bg-transparent pt-2">
					<Button
						variant="ghost"
						onClick={handleReset}
						className="text-xs font-medium text-muted-foreground hover:bg-surface-high hover:text-foreground"
					>
						{t("roomSection.resetToAuto", "Usar automático")}
					</Button>
					<Button
						onClick={handleSave}
						className="rounded-md border border-border bg-surface-high px-4 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest cursor-pointer"
					>
						{t("common:actions.save", "Salvar")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
