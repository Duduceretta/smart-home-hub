import { useTranslation } from "react-i18next";
import { useScrollFade } from "@/core/hooks/useScrollFade";
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
	const { ref, showLeftFade, showRightFade } = useScrollFade<HTMLDivElement>();

	return (
		<div className="relative">
			<div
				ref={ref}
				className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1 pr-8"
			>
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
			{/* Fades indicando scroll horizontal — opacidade segue a posição real
			 * do scroll (useScrollFade), não ficam sempre visíveis nem faltam
			 * indicar que dá pra voltar. */}
			<div
				className={cn(
					"pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity duration-150",
					showLeftFade ? "opacity-100" : "opacity-0",
				)}
			/>
			<div
				className={cn(
					"pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-150",
					showRightFade ? "opacity-100" : "opacity-0",
				)}
			/>
		</div>
	);
}
