import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select";

const LANGUAGES = [
	{ code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
	{ code: "en-US", label: "English (US)", flag: "🇺🇸" },
] as const;

export function LanguageSettingRow() {
	const { i18n } = useTranslation();
	const currentLanguage = i18n.language.startsWith("pt") ? "pt-BR" : "en-US";

	return (
		<div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-container p-4">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-medium text-foreground">Idioma</span>
				<span className="text-xs text-muted-foreground">
					Idioma usado na interface do hub.
				</span>
			</div>

			<Select
				value={currentLanguage}
				onValueChange={(value) => i18n.changeLanguage(value)}
			>
				<SelectTrigger className="w-48 shrink-0" aria-label="Idioma">
					<SelectValue />
				</SelectTrigger>
				<SelectContent align="end">
					{LANGUAGES.map((lang) => (
						<SelectItem key={lang.code} value={lang.code}>
							<span className="mr-1">{lang.flag}</span>
							{lang.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
