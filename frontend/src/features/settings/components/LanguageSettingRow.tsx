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
	const { t, i18n } = useTranslation("settings");
	const currentLanguage = i18n.language.startsWith("pt") ? "pt-BR" : "en-US";

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border-subtle bg-surface-low p-4">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-medium text-foreground">
					{t("language.label")}
				</span>
				<span className="text-xs text-muted-foreground">
					{t("language.description")}
				</span>
			</div>

			<Select
				value={currentLanguage}
				onValueChange={(value) => i18n.changeLanguage(value)}
			>
				<SelectTrigger
					className="h-11 sm:h-9 w-full sm:w-48 shrink-0"
					aria-label={t("language.label")}
				>
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
