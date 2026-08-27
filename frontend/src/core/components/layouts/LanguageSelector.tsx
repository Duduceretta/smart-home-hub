import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select";

const LANGUAGES = [
	{ code: "pt-BR", label: "PT-BR", flag: "🇧🇷" },
	{ code: "en-US", label: "EN-US", flag: "🇺🇸" },
] as const;

export function LanguageSelector() {
	const { i18n } = useTranslation();
	const currentLanguage = i18n.language.startsWith("pt") ? "pt-BR" : "en-US";

	return (
		<Select
			value={currentLanguage}
			onValueChange={(value) => i18n.changeLanguage(value)}
		>
			<SelectTrigger size="sm" className="h-7 gap-1.5 text-xs">
				<Languages className="h-3.5 w-3.5 text-muted-foreground" />
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
	);
}
