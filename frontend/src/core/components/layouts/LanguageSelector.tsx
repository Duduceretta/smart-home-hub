import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
	{ code: "pt-BR", label: "PT", flag: "🇧🇷" },
	{ code: "en-US", label: "EN", flag: "🇺🇸" },
] as const;

export function LanguageSelector() {
	const { i18n } = useTranslation();
	const currentLanguage = i18n.language.startsWith("pt") ? "pt-BR" : "en-US";

	return (
		<div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
			<Languages className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-zinc-500" />
			{LANGUAGES.map((lang) => {
				const isActive = currentLanguage === lang.code;
				return (
					<button
						key={lang.code}
						type="button"
						onClick={() => i18n.changeLanguage(lang.code)}
						className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer ${
							isActive
								? "bg-indigo-600 text-white shadow-sm"
								: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
						}`}
						title={lang.code === "pt-BR" ? "Português" : "English"}
					>
						<span>{lang.flag}</span>
						<span>{lang.label}</span>
					</button>
				);
			})}
		</div>
	);
}
