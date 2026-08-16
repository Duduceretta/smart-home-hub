import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
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
		<div className="h-4 w-4 rounded bg-zinc-800/60" />
		<div className="h-3 w-1/2 rounded bg-zinc-800/60" />
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

	const errorAnimation = {
		initial: { opacity: 0, y: -2 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -2 },
		transition: { duration: 0.15, ease: "easeOut" as const },
	};

	const errorId = `${id}-error`;

	return (
		<div className="space-y-1 w-full min-w-0">
			<Label
				htmlFor={id}
				className={cn(
					"block text-xs font-medium uppercase tracking-wide text-zinc-400 transition-colors",
					error && "text-red-400",
				)}
			>
				{label}
			</Label>

			<div
				className={cn(
					"rounded-lg border bg-zinc-950/50 transition-all",
					error
						? "border-red-500/50 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
						: "border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50",
				)}
			>
				<div className="relative border-b border-zinc-800/80">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
					<Input
						id={id}
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder={t("picker.searchPlaceholder")}
						disabled={disabled}
						aria-invalid={!!error}
						aria-describedby={error ? errorId : undefined}
						className="border-0 bg-transparent pl-10 text-zinc-50 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
					/>
				</div>

				<div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60">
					{isLoading && (
						<>
							<RowSkeleton />
							<RowSkeleton />
							<RowSkeleton />
							<RowSkeleton />
						</>
					)}

					{isError && (
						<p className="px-3 py-4 text-center text-xs text-red-400">
							{t("picker.errorLoading")}
						</p>
					)}

					{!isLoading && !isError && filteredDevices.length === 0 && (
						<p className="px-3 py-4 text-center text-xs text-zinc-500">
							{t("picker.emptySearch")}
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
											? "bg-indigo-500/10 text-indigo-300"
											: "text-zinc-300 hover:bg-zinc-900/60",
									)}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => toggleDevice(device.id)}
										disabled={disabled}
										className="h-3.5 w-3.5 shrink-0 accent-indigo-500"
									/>
									<span
										className={cn(
											"h-1.5 w-1.5 shrink-0 rounded-full",
											device.isOn ? "bg-emerald-400" : "bg-zinc-600",
										)}
									/>
									<span className="min-w-0 flex-1 truncate font-medium">
										{device.name}
									</span>
									<span className="shrink-0 truncate text-[10px] text-zinc-500">
										{device.brand}
									</span>
								</label>
							);
						})}
				</div>
			</div>

			<div className="flex items-center justify-between pt-0.5">
				<div className="min-h-4.5 flex items-start">
					<AnimatePresence mode="wait">
						{error && (
							<motion.p
								id={errorId}
								{...errorAnimation}
								className="pl-1 text-[11px] font-medium text-red-400 leading-tight"
							>
								{error}
							</motion.p>
						)}
					</AnimatePresence>
				</div>
				<span className="pl-2 text-[11px] text-zinc-500 shrink-0">
					{t("picker.selectedCount", { count: selectedIds.length })}
				</span>
			</div>
		</div>
	);
}
