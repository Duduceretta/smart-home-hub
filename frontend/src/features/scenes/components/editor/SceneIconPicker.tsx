import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { SCENE_ICON_OPTIONS } from "../../constants/scenes.constants";

interface SceneIconPickerProps {
	value: string | undefined;
	onChange: (iconId: string) => void;
}

/**
 * Seletor de ícone da cena: grade compacta de 6 colunas, um botão por ícone com
 * rótulo acessível ("Noite", "Cinema"…) e `aria-pressed` no selecionado.
 */
export function SceneIconPicker({ value, onChange }: SceneIconPickerProps) {
	const { t } = useTranslation("scenes");

	return (
		<div className="grid grid-cols-6 gap-2">
			{SCENE_ICON_OPTIONS.map((option) => {
				const Icon = option.icon;
				const isSelected = value === option.id;

				return (
					<button
						key={option.id}
						type="button"
						aria-label={t(option.labelKey, option.id)}
						aria-pressed={isSelected}
						onClick={() => onChange(option.id)}
						className={cn(
							"flex h-10 cursor-pointer items-center justify-center rounded-xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
							isSelected
								? "border-primary/50 bg-primary/10 text-primary"
								: "border-border-subtle bg-surface-high text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="h-5 w-5" />
					</button>
				);
			})}
		</div>
	);
}
