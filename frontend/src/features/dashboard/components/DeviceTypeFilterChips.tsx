import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import {
	type ChipKey,
	DEVICE_TYPE_CHIPS,
} from "../constants/dashboard.constants";

interface DeviceTypeFilterChipsProps {
	activeChip: ChipKey;
	onChange: (chip: ChipKey) => void;
	countsByChip: Record<ChipKey, number>;
}

export function DeviceTypeFilterChips({
	activeChip,
	onChange,
	countsByChip,
}: DeviceTypeFilterChipsProps) {
	const { t } = useTranslation("dashboard");

	return (
		<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
			{DEVICE_TYPE_CHIPS.map((chip) => {
				const isActive = activeChip === chip;
				return (
					<button
						key={chip}
						type="button"
						aria-pressed={isActive}
						onClick={() => onChange(chip)}
						className={cn(
							"inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium tracking-wide transition-all cursor-pointer shadow-xs",
							isActive
								? "border-border bg-surface-high text-foreground"
								: "border-border-subtle bg-surface-container text-muted-foreground hover:border-border hover:bg-surface-high hover:text-foreground",
						)}
					>
						<span>{t(`filterChips.${chip}`)}</span>
						<span
							className={cn(
								"rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums",
								isActive
									? "bg-surface-highest text-foreground"
									: "bg-surface-high text-muted-foreground",
							)}
						>
							{countsByChip[chip]}
						</span>
					</button>
				);
			})}
		</div>
	);
}
