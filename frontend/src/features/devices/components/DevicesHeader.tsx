import { Plus } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useDevicesUIStore } from "../store/devices-ui.store";

export const DevicesHeader: React.FC = () => {
	const { t } = useTranslation("devices");
	const openCreateSheet = useDevicesUIStore((state) => state.openCreateSheet);

	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-semibold tracking-tight text-[#e5e2e2]">
					{t("title")}
				</h1>
				<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#c7c6cb]">
					<span
						className="h-2 w-2 rounded-full bg-[#c5c6cf] shadow-[0_0_8px_rgba(197,198,207,0.4)] animate-pulse"
						aria-hidden="true"
					/>
					{t("header.hubStatus", "Hub 01 Online")}
				</div>
			</div>

			<button
				type="button"
				onClick={openCreateSheet}
				className="inline-flex items-center gap-2 rounded-full border border-[#46464b]/30 bg-linear-to-b from-[#2a2a2a] to-[#232323] px-4 py-2 text-xs font-semibold text-[#e5e2e2] transition-colors hover:from-[#353435] hover:to-[#2a2a2a] cursor-pointer active:scale-[0.98]"
			>
				<Plus className="h-4 w-4" />
				<span>{t("header.addButton")}</span>
			</button>
		</div>
	);
};
