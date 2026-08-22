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
import { deviceUnitWidth, ROW_CAPACITY_UNITS } from "../utils/deviceRowUnits";

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

	useEffect(() => {
		if (isOpen) setDraft(selectedIds);
	}, [isOpen, selectedIds]);

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
			<DialogContent className="sm:max-w-md bg-[#201f20] border-[#46464b]/40 text-[#e5e2e2]">
				<DialogHeader>
					<DialogTitle className="text-[#e5e2e2]">
						{t("roomSection.editTitle", "Escolher dispositivos exibidos")}
					</DialogTitle>
					<DialogDescription className="text-[#c7c6cb]">
						{t(
							"roomSection.editDescription",
							"No máximo o equivalente a 1 linha do grid (2 cards normais, ou 1 card largo como TV/Climatização).",
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
					{devices.map((device) => {
						const isSelected = draft.includes(device.id);
						const width = deviceUnitWidth(device.type);
						const disabled =
							!isSelected && usedUnits + width > ROW_CAPACITY_UNITS;
						const Icon = DEVICE_CONFIG[device.type].icon;

						return (
							<label
								key={device.id}
								className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
									disabled
										? "border-[#46464b]/20 opacity-40 cursor-not-allowed"
										: "border-[#46464b]/20 hover:bg-[#2a2a2a] cursor-pointer"
								} ${isSelected ? "bg-[#2a2a2a] border-[#c5c6cf]/40" : "bg-[#1c1b1c]"}`}
							>
								<input
									type="checkbox"
									checked={isSelected}
									disabled={disabled}
									onChange={() => toggleDevice(device)}
									className="h-4 w-4 accent-[#c5c6cf] cursor-pointer disabled:cursor-not-allowed"
								/>
								<Icon className="h-4 w-4 text-[#c7c6cb] shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="text-sm font-medium text-[#e5e2e2] truncate">
										{device.name}
									</span>
									<span className="text-[10px] text-[#c7c6cb]/60">
										{width === 2
											? t("roomSection.wideCard", "ocupa a linha inteira")
											: t("roomSection.normalCard", "1 coluna")}
									</span>
								</div>
							</label>
						);
					})}
				</div>

				<DialogFooter className="bg-transparent border-t-0 pt-0">
					<Button
						variant="ghost"
						onClick={handleReset}
						className="text-[#c7c6cb] hover:text-[#e5e2e2]"
					>
						{t("roomSection.resetToAuto", "Usar automático")}
					</Button>
					<Button
						onClick={handleSave}
						className="bg-[#c5c6cf] text-[#2e3037] hover:bg-[#c5c6cf]/80"
					>
						{t("common:actions.save", "Salvar")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
