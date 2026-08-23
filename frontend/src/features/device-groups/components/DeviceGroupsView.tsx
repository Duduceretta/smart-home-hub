import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeviceGroupsUIStore } from "../store/device-groups-ui.store";
import { CreateDeviceGroupSheet } from "./CreateDeviceGroupSheet";
import { DeviceGroupsGrid } from "./DeviceGroupsGrid";
import { EditDeviceGroupSheet } from "./EditDeviceGroupSheet";

export const DeviceGroupsView: React.FC = () => {
	const { t } = useTranslation("device-groups");
	const { query, setQuery, openCreateSheet } = useDeviceGroupsUIStore();

	return (
		<div className="space-y-6 pb-6">
			{/* Cabeçalho da Seção */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-zinc-100">
						{t("title")}
					</h1>
					<p className="mt-1 text-xs text-zinc-400">{t("header.subtitle")}</p>
				</div>

				{/* Botão de Ação Principal */}
				<button
					type="button"
					onClick={openCreateSheet}
					className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/30 cursor-pointer"
				>
					<Plus className="h-4 w-4" />
					{t("header.addButton")}
				</button>
			</div>

			{/* Barra de Filtro / Busca */}
			<div className="relative max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={t("toolbar.searchPlaceholder")}
					className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
				/>
			</div>

			{/* Grid Principal */}
			<DeviceGroupsGrid />

			{/* Modais e Painéis Deslizantes */}
			<CreateDeviceGroupSheet />
			<EditDeviceGroupSheet />
		</div>
	);
};
