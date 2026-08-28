import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/core/components/ui/input";
import { cn } from "@/core/utils";
import { useAssignableDevices } from "../hooks/useAssignableDevices";

interface RoomDeviceAssignmentPickerProps {
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
}

const RowSkeleton = () => (
	<div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
		<div className="h-4 w-4 rounded bg-surface-high" />
		<div className="h-3 w-1/2 rounded bg-surface-high" />
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
		<div className="w-full min-w-0 space-y-1">
			<div className="rounded-lg border border-border-subtle/20 bg-surface-high">
				<div className="relative border-b border-border-subtle/20">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Buscar dispositivo..."
						disabled={disabled}
						className="border-0 bg-transparent pl-10 focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>

				<div className="max-h-56 overflow-y-auto scrollbar-thin divide-y divide-border-subtle/10">
					{isLoading && (
						<>
							<RowSkeleton />
							<RowSkeleton />
							<RowSkeleton />
						</>
					)}

					{isError && (
						<p className="px-3 py-4 text-center text-xs text-alert-foreground">
							Não foi possível carregar os dispositivos.
						</p>
					)}

					{!isLoading && !isError && filteredDevices.length === 0 && (
						<p className="px-3 py-4 text-center text-xs text-muted-foreground">
							Nenhum dispositivo encontrado.
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
											? "bg-primary/10 text-primary"
											: "text-foreground hover:bg-surface-highest",
									)}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleDevice(device.id)}
										disabled={disabled}
										className="h-3.5 w-3.5 shrink-0 accent-primary"
									/>
									<span
										className={cn(
											"h-1.5 w-1.5 shrink-0 rounded-full",
											device.isOn ? "bg-primary" : "bg-muted-foreground/40",
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
				{selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"}
			</p>
		</div>
	);
}
