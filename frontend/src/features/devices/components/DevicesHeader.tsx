import { Plus } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useDevicesUIStore } from "../store/devices-ui.store";

export const DevicesHeader: React.FC = () => {
	const { t } = useTranslation("devices");
	const openDiscoveryModal = useDevicesUIStore(
		(state) => state.openDiscoveryModal,
	);

	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-semibold tracking-tight text-[#e5e2e2]">
					{t("title")}
				</h1>
				<p className="text-sm text-[#c7c6cb]">
					{t(
						"header.subtitle",
						"Gerencie conexões, consumo e estados dos periféricos integrados.",
					)}
				</p>
			</div>

			<button
				type="button"
				onClick={openDiscoveryModal}
				className="inline-flex items-center gap-2 rounded-full bg-[#c5c6cf] px-4 py-2 text-xs font-semibold text-[#2e3037] shadow-[0_0_16px_rgba(197,198,207,0.2)] transition-all hover:bg-[#d5d6de] hover:shadow-[0_0_20px_rgba(197,198,207,0.3)] cursor-pointer active:scale-[0.98]"
			>
				<Plus className="h-4 w-4" />
				<span>{t("header.addButton")}</span>
			</button>
		</div>
	);
};
