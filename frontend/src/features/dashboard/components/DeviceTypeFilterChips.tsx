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
		<div className="flex items-center gap-4 overflow-x-auto pb-1">
			{DEVICE_TYPE_CHIPS.map((chip) => (
				<button
					key={chip}
					type="button"
					onClick={() => onChange(chip)}
					className={`shrink-0 text-[11px] font-mono uppercase tracking-wider pb-1 border-b-2 transition-colors cursor-pointer ${
						activeChip === chip
							? "text-[#e5e2e2] border-[#c5c6cf]"
							: "text-[#c7c6cb]/60 border-transparent hover:text-[#e5e2e2]"
					}`}
				>
					{t(`filterChips.${chip}`)} ({countsByChip[chip]})
				</button>
			))}
		</div>
	);
}
