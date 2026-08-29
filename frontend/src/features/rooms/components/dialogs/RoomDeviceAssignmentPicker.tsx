import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/core/components/ui/input";
import { cn } from "@/core/utils";
import { useAssignableDevices } from "../../hooks/useAssignableDevices";

interface RoomDeviceAssignmentPickerProps {
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
}

const RowSkeleton = () => (
	<div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
		<div className="h-4 w-4 rounded bg-surface-highest/60" />
		<div className="h-3 w-1/2 rounded bg-surface-highest/60" />
	</div>
);

/**
 * Busca + lista de checkboxes — mesmo padrão de seleção múltipla do
 * `DeviceGroupMultiSelect` (feature `device-groups`), reimplementado
 * localmente aqui (FSD: features não importam componentes/hooks umas das
 * outras) com os tokens de cor atuais em vez da paleta zinc legada daquele
 * componente.
 */
export function RoomDeviceAssignmentPicker({
	selectedIds,
	onChange,
	disabled,
}: RoomDeviceAssignmentPickerProps) {
	const { t } = useTranslation("rooms");
	const [searchTerm, setSearchTerm] = useState("");
	const { data: devices = [], isLoading, isError } = useAssignableDevices();

	const filteredDevices = useMemo(() => {
		if (!searchTerm.trim()) return devices;
		const search = searchTerm.toLowerCase().trim();
		return devices.filter(
			(device) =>
				device.name.toLowerCase().includes(search) ||
				device.brand.toLowerCase().includes(search),
		);
	}, [devices, searchTerm]);

	const toggleDevice = (id: string) => {
		if (disabled) return;
		onChange(
			selectedIds.includes(id)
				? selectedIds.filter((selected) => selected !== id)
				: [...selectedIds, id],
		);
	};

	return (
		<div className="w-full min-w-0 space-y-1.5">
			<div className="rounded-lg border border-border-subtle bg-surface-container overflow-hidden">
				<div className="relative border-b border-border-subtle bg-surface-low/50">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder={t(
							"devicePicker.searchPlaceholder",
							"Buscar dispositivo...",
						)}
						disabled={disabled}
						className="border-0 bg-transparent pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>

				<div className="max-h-56 overflow-y-auto scrollbar-thin divide-y divide-border-subtle">
					{isLoading && (
						<>
							<RowSkeleton />
							<RowSkeleton />
							<RowSkeleton />
						</>
					)}

					{isError && (
						<p className="px-3 py-4 text-center text-xs font-medium text-destructive">
							{t(
								"devicePicker.errorLoad",
								"Não foi possível carregar os dispositivos.",
							)}
						</p>
					)}

					{!isLoading && !isError && filteredDevices.length === 0 && (
						<p className="px-3 py-4 text-center text-xs text-muted-foreground">
							{t("devicePicker.empty", "Nenhum dispositivo encontrado.")}
						</p>
					)}

					{!isLoading &&
						!isError &&
						filteredDevices.map((device) => {
							const isSelected = selectedIds.includes(device.id);
							return (
								<label
									key={device.id}
									className={cn(
										"flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
										isSelected
											? "bg-primary/10 text-primary font-medium"
											: "text-foreground hover:bg-surface-high",
									)}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleDevice(device.id)}
										disabled={disabled}
										className="h-4 w-4 shrink-0 rounded border-border-subtle text-primary accent-primary focus:ring-primary/40 cursor-pointer"
									/>
									<span
										className={cn(
											"h-2 w-2 shrink-0 rounded-full transition-colors",
											device.isOn
												? "bg-primary shadow-xs"
												: "bg-muted-foreground/30",
										)}
									/>
									<span className="min-w-0 flex-1 truncate">{device.name}</span>
									<span className="shrink-0 truncate text-xs text-muted-foreground">
										{device.brand}
									</span>
								</label>
							);
						})}
				</div>
			</div>

			<p className="text-right text-xs text-muted-foreground">
				{t(
					"devicePicker.selectedCount",
					`${selectedIds.length} selecionado${selectedIds.length === 1 ? "" : "s"}`,
					{ count: selectedIds.length },
				)}
			</p>
		</div>
	);
}
