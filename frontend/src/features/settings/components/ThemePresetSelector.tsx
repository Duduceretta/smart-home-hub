import { CheckIcon } from "lucide-react";
import { cn } from "@/core/utils";
import { useThemeUIStore } from "../store/theme-ui.store";
import { THEME_PRESET_OPTIONS } from "../types/theme.types";

export function ThemePresetSelector() {
	const preset = useThemeUIStore((state) => state.preset);
	const setPreset = useThemeUIStore((state) => state.setPreset);

	return (
		<div
			role="radiogroup"
			aria-label="Tema de cores do aplicativo"
			className="grid grid-cols-2 gap-4 sm:grid-cols-4"
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
