import { CheckIcon, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { cn } from "@/core/utils";
import { useThemeUIStore } from "../store/theme-ui.store";
import { THEME_PRESET_OPTIONS, type ThemePresetId } from "../types/theme.types";

interface ThemePresetSelectorProps {
	variant?: "grid" | "dropdown";
}

export function ThemePresetSelector({
	variant = "grid",
}: ThemePresetSelectorProps) {
	const { t } = useTranslation("settings");
	const preset = useThemeUIStore((state) => state.preset);
	const setPreset = useThemeUIStore((state) => state.setPreset);

	if (variant === "dropdown") {
		const activeOption =
			THEME_PRESET_OPTIONS.find((opt) => opt.id === preset) ??
			THEME_PRESET_OPTIONS[0];

		return (
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label={t("theme.ariaLabel")}
								className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-low text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer"
							>
								<Palette className="h-4 w-4" />
								<span
									className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full ring-1 ring-background"
									style={{ backgroundColor: activeOption.swatch.primary }}
									aria-hidden="true"
								/>
							</button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="bottom" align="end">
						{t("theme.changeTheme", "Alterar o tema")}
					</TooltipContent>
				</Tooltip>
				<DropdownMenuContent align="end" className="w-56 p-1">
					<DropdownMenuRadioGroup
						value={preset}
						onValueChange={(val) => setPreset(val as ThemePresetId)}
					>
						{THEME_PRESET_OPTIONS.map((option) => (
							<DropdownMenuRadioItem
								key={option.id}
								value={option.id}
								className="flex items-center gap-2.5 cursor-pointer py-1.5"
							>
								<span
									className="size-3.5 rounded-full border border-border-subtle shrink-0"
									style={{ backgroundColor: option.swatch.primary }}
									aria-hidden="true"
								/>
								<span className="text-sm font-medium text-foreground">
									{option.label}
								</span>
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<div
			role="radiogroup"
			aria-label={t("theme.ariaLabel")}
			className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4"
		>
			{THEME_PRESET_OPTIONS.map((option) => {
				const selected = option.id === preset;

				return (
					<label
						key={option.id}
						className={cn(
							"flex cursor-pointer flex-col gap-2 rounded-xl border p-2 text-left transition-colors",
							selected
								? "border-primary ring-2 ring-primary/50 bg-surface-container"
								: "border-border-subtle bg-surface-low hover:border-border hover:bg-surface-container",
						)}
					>
						<input
							type="radio"
							name="theme-preset"
							value={option.id}
							checked={selected}
							onChange={() => setPreset(option.id)}
							className="sr-only"
						/>

						<div
							className="relative h-14 w-full overflow-hidden rounded-lg"
							style={{ backgroundColor: option.swatch.background }}
						>
							<div
								className="absolute inset-x-2 bottom-2 h-6 rounded-md"
								style={{ backgroundColor: option.swatch.card }}
							/>
							<div
								className="absolute right-2 top-2 size-3.5 rounded-full"
								style={{ backgroundColor: option.swatch.primary }}
							/>
							{selected ? (
								<div className="absolute inset-0 flex items-center justify-center bg-black/20">
									<CheckIcon
										className="size-5 drop-shadow"
										style={{ color: option.swatch.primary }}
										aria-hidden="true"
									/>
								</div>
							) : null}
						</div>

						<span className="text-sm font-medium text-foreground">
							{option.label}
						</span>
					</label>
				);
			})}
		</div>
	);
}
