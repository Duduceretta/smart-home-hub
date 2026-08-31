import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { usePickerDevices } from "../hooks/usePickerDevices";

interface DeviceGroupMultiSelectProps {
	id: string;
	label: string;
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	error?: string;
	disabled?: boolean;
}

const RowSkeleton = () => (
	<div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
		<div className="h-4 w-4 rounded bg-surface-high" />
		<div className="h-3 w-1/2 rounded bg-surface-high" />
	</div>
);

export function DeviceGroupMultiSelect({
	id,
	label,
	selectedIds,
	onChange,
	error,
	disabled,
}: DeviceGroupMultiSelectProps) {
	const { t } = useTranslation("device-groups");
	const [searchTerm, setSearchTerm] = useState("");
	const { data: devices = [], isLoading, isError } = usePickerDevices();

	const filteredDevices = useMemo(() => {
		if (!searchTerm.trim()) return devices;
		const searchLower = searchTerm.toLowerCase().trim();
		return devices.filter(
			(device) =>
				device.name.toLowerCase().includes(searchLower) ||
				device.brand.toLowerCase().includes(searchLower),
		);
	}, [devices, searchTerm]);

	const toggleDevice = (deviceId: string) => {
		if (disabled) return;
		if (selectedIds.includes(deviceId)) {
			onChange(selectedIds.filter((selected) => selected !== deviceId));
		} else {
			onChange([...selectedIds, deviceId]);
		}
	};

	const errorId = `${id}-error`;

	return (
		<div className="space-y-1.5 w-full min-w-0">
			<label
				htmlFor={id}
				className={cn(
					"block text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors",
					error && "text-destructive",
				)}
			>
				{label}
			</label>

			<div
				className={cn(
					"rounded-lg border bg-surface-container transition-all overflow-hidden",
					error
						? "border-destructive/50 focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive"
						: "border-border-subtle focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40",
				)}
			>
				<div className="relative border-b border-border-subtle bg-surface-low/30">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<input
						id={id}
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder={t(
							"picker.searchPlaceholder",
							"Buscar dispositivo por nome ou marca...",
						)}
						disabled={disabled}
						aria-invalid={!!error}
						aria-describedby={error ? errorId : undefined}
						className="h-9 w-full border-0 bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
					/>
				</div>

				<div className="max-h-56 overflow-y-auto divide-y divide-border-subtle/50 scrollbar-thin">
					{isLoading && (
						<>
							<RowSkeleton />
							<RowSkeleton />
							<RowSkeleton />
						</>
					)}

					{isError && (
						<p className="px-3 py-4 text-center text-xs text-destructive">
							{t(
								"picker.errorLoading",
								"Erro ao carregar os dispositivos disponíveis.",
							)}
						</p>
					)}

					{!isLoading && !isError && filteredDevices.length === 0 && (
						<p className="px-3 py-4 text-center text-xs text-muted-foreground">
							{t("picker.emptySearch", "Nenhum dispositivo encontrado.")}
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
										"flex cursor-pointer items-center gap-3 px-3 py-2.5 text-xs transition-colors",
										isSelected
											? "bg-primary/10 text-foreground"
											: "text-foreground/80 hover:bg-surface-high",
									)}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleDevice(device.id)}
										disabled={disabled}
										className="h-4 w-4 shrink-0 rounded border-border-subtle bg-surface-high text-primary accent-primary"
									/>
									<span
										className={cn(
											"h-1.5 w-1.5 shrink-0 rounded-full",
											device.isOn ? "bg-primary" : "bg-muted-foreground/40",
										)}
									/>
									<span className="min-w-0 flex-1 truncate font-medium">
										{device.name}
									</span>
									<span className="shrink-0 truncate text-[10px] text-muted-foreground">
										{device.brand}
									</span>
								</label>
							);
						})}
				</div>
			</div>

			<div className="flex items-center justify-between pt-0.5">
				<div className="min-h-4.5 flex items-start">
					{error && (
						<p
							id={errorId}
							className="pl-1 text-xs font-medium text-destructive leading-tight"
						>
							{error}
						</p>
					)}
				</div>
				<span className="pl-2 text-xs text-muted-foreground shrink-0">
					{t("picker.selectedCount", `${selectedIds.length} selecionado(s)`, {
						count: selectedIds.length,
					})}
				</span>
			</div>
		</div>
	);
}
