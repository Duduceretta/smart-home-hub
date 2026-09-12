import { cn } from "@/core/utils";

interface FlagIconProps {
	className?: string;
	title?: string;
}

export function BrazilFlag({ className, title = "Brasil" }: FlagIconProps) {
	return (
		<svg
			data-testid="flag-brazil"
			viewBox="0 0 20 14"
			className={cn(
				"h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] shadow-xs border border-border-subtle/50",
				className,
			)}
			aria-hidden="true"
			focusable="false"
			role="img"
		>
			<title>{title}</title>
			{/* design-token-lint-ignore: cores oficiais da bandeira do Brasil */}
			<rect width="20" height="14" fill="#009B3A" />
			{/* design-token-lint-ignore: cores oficiais da bandeira do Brasil */}
			<polygon points="10,2 18,7 10,12 2,7" fill="#FEDF00" />
			{/* design-token-lint-ignore: cores oficiais da bandeira do Brasil */}
			<circle cx="10" cy="7" r="3.2" fill="#002776" />
			<path
				d="M 6.8 7.2 C 8 6.1 11.5 6.1 13.2 7.6"
				// design-token-lint-ignore: faixa branca oficial da bandeira do Brasil
				stroke="#FFFFFF"
				strokeWidth="0.8"
				fill="none"
			/>
		</svg>
	);
}

export function USAFlag({ className, title = "United States" }: FlagIconProps) {
	return (
		<svg
			data-testid="flag-usa"
			viewBox="0 0 20 13"
			className={cn(
				"h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] shadow-xs border border-border-subtle/50",
				className,
			)}
			aria-hidden="true"
			focusable="false"
			role="img"
		>
			<title>{title}</title>
			{/* design-token-lint-ignore: listras vermelhas e brancas oficiais dos EUA */}
			<rect width="20" height="13" fill="#B22234" />
			{/* design-token-lint-ignore: listra branca */}
			<rect y="1" width="20" height="1" fill="#FFFFFF" />
			{/* design-token-lint-ignore: listra branca */}
			<rect y="3" width="20" height="1" fill="#FFFFFF" />
			{/* design-token-lint-ignore: listra branca */}
			<rect y="5" width="20" height="1" fill="#FFFFFF" />
			{/* design-token-lint-ignore: listra branca */}
			<rect y="7" width="20" height="1" fill="#FFFFFF" />
			{/* design-token-lint-ignore: listra branca */}
			<rect y="9" width="20" height="1" fill="#FFFFFF" />
			{/* design-token-lint-ignore: listra branca */}
			<rect y="11" width="20" height="1" fill="#FFFFFF" />
			{/* design-token-lint-ignore: cantão azul dos EUA */}
			<rect width="8.5" height="7" fill="#3C3B6E" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="2" cy="1.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="4.25" cy="1.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="6.5" cy="1.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="3.1" cy="3.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="5.4" cy="3.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="2" cy="5.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="4.25" cy="5.5" r="0.6" fill="#FFFFFF" />
			{/* design-token-lint-ignore: estrelas brancas */}
			<circle cx="6.5" cy="5.5" r="0.6" fill="#FFFFFF" />
		</svg>
	);
}
