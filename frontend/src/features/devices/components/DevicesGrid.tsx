import { ChevronLeft, ChevronRight, Cpu, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useDevices } from "../hooks/useDevices";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceCard } from "./DeviceCard";
import { DeviceListRow } from "./DeviceListRow";

/**
 * Itens por página. Paginação é por contagem de dispositivos, não por
 * "linhas visuais" — a grade é responsiva (1 a 4 colunas) e TV/Climatização
 * ocupam 2 colunas, então "N linhas cheias" não é uma unidade estável entre
 * breakpoints. 12 itens/página se comporta bem como 3 linhas no layout xl
 * (4 colunas) quando os cards são todos de largura simples.
 */
const PAGE_SIZE = 12;

interface PaginationControlsProps {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
	page,
	totalPages,
	onPageChange,
}) => {
	const { t } = useTranslation("devices");

	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-between pt-2">
			<span className="text-xs text-[#c7c6cb]">
				{t("grid.pageIndicator", "Página {{page}} de {{totalPages}}", {
					page,
					totalPages,
				})}
			</span>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
					aria-label={t("grid.previousPage", "Página anterior")}
					className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1b1c] text-[#c7c6cb] transition-colors hover:bg-[#2a2a2a] hover:text-[#e5e2e2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1c1b1c]"
				>
					<ChevronLeft className="h-4 w-4" />
				</button>
				<button
					type="button"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
					aria-label={t("grid.nextPage", "Próxima página")}
					className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1b1c] text-[#c7c6cb] transition-colors hover:bg-[#2a2a2a] hover:text-[#e5e2e2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1c1b1c]"
				>
					<ChevronRight className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

interface EmptyStateProps {
	/** true = usuário não tem nenhum dispositivo cadastrado; false = filtro/busca zerou os resultados */
	hasNoDevices: boolean;
	onReset: () => void;
	onCreate: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
	hasNoDevices,
	onReset,
	onCreate,
}) => {
	const { t } = useTranslation("devices");

	const Icon = hasNoDevices ? Cpu : Search;

	return (
		<div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#201f20] border border-[#46464b]/30 text-[#c7c6cb]">
				<Icon className="h-5 w-5 text-[#c5c6cf]" />
			</div>
			<div>
				<p className="text-lg font-semibold text-[#e5e2e2] text-center">
					{hasNoDevices
						? t("grid.noDevicesTitle", "Nenhum dispositivo cadastrado")
						: t("grid.emptyTitle", "Nenhum dispositivo encontrado")}
				</p>
				<p className="mt-1.5 text-sm text-[#c7c6cb] text-center">
					{hasNoDevices
						? t(
								"grid.noDevicesSubtitle",
								"Cadastre seu primeiro dispositivo para começar a monitorar sua casa.",
							)
						: t("grid.emptySubtitle", "Tente ajustar seus filtros ou busca")}
				</p>
			</div>
			{hasNoDevices ? (
				<button
					type="button"
					onClick={onCreate}
					className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#46464b]/30 bg-linear-to-b from-[#2a2a2a] to-[#232323] px-5 py-2 text-xs font-semibold text-[#e5e2e2] transition-colors hover:from-[#353435] hover:to-[#2a2a2a] cursor-pointer active:scale-[0.98]"
				>
					<Plus className="h-4 w-4" />
					{t("grid.createFirstDevice", "Cadastrar Primeiro Dispositivo")}
				</button>
			) : (
				<button
					type="button"
					onClick={onReset}
					className="mt-2 rounded-full border border-[#46464b]/50 bg-[#201f20] px-4 py-1.5 text-xs font-medium text-[#e5e2e2] transition-colors hover:bg-[#353435] cursor-pointer"
				>
					{t("grid.clearFilters", "Limpar filtros")}
				</button>
			)}
		</div>
	);
};

const GridSkeleton: React.FC = () => (
	<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
		{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7", "sk-8"].map(
			(sk) => (
				<div
					key={sk}
					className="flex h-44 flex-col justify-between rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] p-4"
				>
					<div className="flex justify-between items-start">
						<div className="h-12 w-12 rounded-full bg-[#201f20]" />
						<div className="h-5 w-5 rounded-md bg-[#201f20]" />
					</div>
					<div className="space-y-2">
						<div className="h-4 w-3/4 rounded bg-[#201f20]" />
						<div className="h-3 w-1/2 rounded bg-[#201f20]/60" />
					</div>
					<div className="flex justify-between items-center pt-2 border-t border-[#46464b]/20">
						<div className="h-3 w-20 rounded bg-[#201f20]/60" />
						<div className="h-4 w-12 rounded bg-[#201f20]" />
					</div>
				</div>
			),
		)}
	</div>
);

const ListSkeleton: React.FC = () => (
	<div className="flex flex-col gap-2 animate-pulse">
		{["lsk-1", "lsk-2", "lsk-3", "lsk-4", "lsk-5"].map((sk) => (
			<div
				key={sk}
				className="flex items-center justify-between p-3.5 rounded-xl border border-[#46464b]/20 bg-[#1c1b1c]"
			>
				<div className="flex items-center gap-3.5">
					<div className="h-9 w-9 rounded-full bg-[#201f20]" />
					<div className="space-y-1.5">
						<div className="h-4 w-36 rounded bg-[#201f20]" />
						<div className="h-3 w-24 rounded bg-[#201f20]/60" />
					</div>
				</div>
				<div className="h-4 w-16 rounded bg-[#201f20]" />
			</div>
		))}
	</div>
);

export const DevicesGrid: React.FC = () => {
	const {
		query,
		activeTab,
		statusFilter,
		selectedRoomId,
		onlyOn,
		viewMode,
		page,
		setPage,
		resetFilters,
		openCreateSheet,
	} = useDevicesUIStore();

	const debouncedQuery = useDebouncedValue(query, 300);

	// Busca do TanStack Query — filtros (cômodo, apenas ligados, categoria,
	// status, busca) e paginação todos resolvidos server-side, sem
	// filtragem/paginação client-side.
	const { data, isLoading } = useDevices({
		query: debouncedQuery,
		category: activeTab,
		status: statusFilter,
		roomId: selectedRoomId,
		onlyOn,
		page,
		pageSize: PAGE_SIZE,
	});

	const devices = data?.items ?? [];
	const totalPages = data?.totalPages ?? 1;

	if (isLoading) {
		return viewMode === "list" ? <ListSkeleton /> : <GridSkeleton />;
	}

	if (devices.length === 0) {
		const isFilterActive =
			query !== "" ||
			activeTab !== "Todos" ||
			statusFilter !== null ||
			selectedRoomId !== null ||
			onlyOn;

		return (
			<EmptyState
				hasNoDevices={!isFilterActive}
				onReset={resetFilters}
				onCreate={openCreateSheet}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{viewMode === "list" ? (
				<div
					key="list"
					className="flex flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
				>
					{devices.map((device) => (
						<DeviceListRow key={device.id} device={device} />
					))}
				</div>
			) : (
				<div
					key="grid"
					className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max grid-flow-row-dense motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200"
				>
					{devices.map((device) => (
						<DeviceCard key={device.id} device={device} />
					))}
				</div>
			)}

			<PaginationControls
				page={page}
				totalPages={totalPages}
				onPageChange={setPage}
			/>
		</div>
	);
};
