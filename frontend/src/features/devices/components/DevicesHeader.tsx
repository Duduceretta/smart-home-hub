import { Plus } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useDevicesUIStore } from "../store/devices-ui.store";

export const DevicesHeader: React.FC = () => {
	const { t } = useTranslation("devices");
	const openCreateSheet = useDevicesUIStore((state) => state.openCreateSheet);

	return (
		<div className="-mx-4 sm:-mx-6 px-4 sm:px-6 flex flex-col justify-between gap-3 border-b border-zinc-800/80 pb-4 sm:flex-row sm:items-center">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-zinc-50">
					{t("title")}
				</h1>
				<p className="mt-0.5 text-xs text-zinc-400">{t("header.subtitle")}</p>
			</div>

			<button
				type="button"
				onClick={openCreateSheet}
				className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-500 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-[0.98]"
			>
				<Plus className="h-4 w-4" />
				<span>{t("header.addButton")}</span>
			</button>
		</div>
	);
};
