import { useTranslation } from "react-i18next";
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
		<div className="flex items-center gap-2 overflow-x-auto pb-1">
			{DEVICE_TYPE_CHIPS.map((chip) => (
				<button
					key={chip}
					type="button"
					aria-pressed={activeChip === chip}
					onClick={() => onChange(chip)}
					className={`shrink-0 inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors cursor-pointer ${
						activeChip === chip
							? "bg-primary/10 border-primary text-foreground"
							: "bg-surface-container border-border-subtle text-muted-foreground hover:bg-surface-high hover:text-foreground"
					}`}
				>
					{t(`filterChips.${chip}`)} ({countsByChip[chip]})
				</button>
			))}
		</div>
	);
}
