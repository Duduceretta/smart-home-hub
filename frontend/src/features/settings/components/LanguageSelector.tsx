import { ChevronDown } from "lucide-react";
import type React from "react";
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
import { BrazilFlag, USAFlag } from "./FlagIcons";

export interface LanguageOption {
	code: "pt-BR" | "en-US";
	label: string;
	Flag: React.ComponentType<{ className?: string }>;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
	{ code: "pt-BR", label: "Português", Flag: BrazilFlag },
	{ code: "en-US", label: "English", Flag: USAFlag },
] as const;

interface LanguageSelectorProps {
	className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps = {}) {
	const { t, i18n } = useTranslation("settings");

	const currentCode = i18n.language?.toLowerCase().startsWith("pt")
		? "pt-BR"
		: "en-US";

	const activeOption =
		SUPPORTED_LANGUAGES.find((lang) => lang.code === currentCode) ??
		SUPPORTED_LANGUAGES[0];

	const ActiveFlag = activeOption.Flag;

	const handleLanguageChange = (value: string) => {
		i18n.changeLanguage(value);
	};

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t("language.ariaLabel", "Selecionar idioma")}
							className={cn(
								"flex h-9 w-[138px] items-center justify-between rounded-lg border border-border-subtle bg-surface-low px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring shrink-0",
								className,
							)}
						>
							<div className="flex items-center gap-2 min-w-0">
								<ActiveFlag />
								<span className="truncate font-medium">
									{activeOption.label}
								</span>
							</div>
							<ChevronDown
								className="size-3.5 text-muted-foreground opacity-70 shrink-0"
								aria-hidden="true"
							/>
						</button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom" align="end">
					{t("language.changeLanguage", "Alterar idioma")}
				</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="w-44 p-1">
				<DropdownMenuRadioGroup
					value={currentCode}
					onValueChange={handleLanguageChange}
				>
					{SUPPORTED_LANGUAGES.map((lang) => {
						const ItemFlag = lang.Flag;
						return (
							<DropdownMenuRadioItem
								key={lang.code}
								value={lang.code}
								className="flex items-center gap-2.5 cursor-pointer py-1.5 text-sm font-medium"
							>
								<ItemFlag />
								<span className="text-foreground">{lang.label}</span>
							</DropdownMenuRadioItem>
						);
					})}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
