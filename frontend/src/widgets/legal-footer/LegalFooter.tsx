import { Link } from "react-router-dom";
import { cn } from "@/core/utils";

interface LegalFooterProps {
	className?: string;
	variant?: "compact" | "full";
}

/**
 * Rodapé legal reutilizável para páginas públicas (AuthLayout, páginas legais, etc.).
 * Apresenta links obrigatórios exigidos pelo Google OAuth consent screen.
 */
export function LegalFooter({
	className,
	variant = "compact",
}: LegalFooterProps) {
	const currentYear = new Date().getFullYear();

	if (variant === "compact") {
		return (
			<footer
				data-testid="legal-footer"
				className={cn(
					"flex w-full flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground",
					className,
				)}
			>
				<span>© {currentYear} Nexus Hub</span>
				<span aria-hidden="true" className="text-border">
					•
				</span>
				<Link
					to="/legal/terms"
					className="transition-colors hover:text-foreground hover:underline"
				>
					Termos de Serviço
				</Link>
				<span aria-hidden="true" className="text-border">
					•
				</span>
				<Link
					to="/legal/privacy"
					className="transition-colors hover:text-foreground hover:underline"
				>
					Privacidade
				</Link>
			</footer>
		);
	}

	return (
		<footer
			data-testid="legal-footer"
			className={cn(
				"w-full border-t border-border-subtle bg-surface-low py-6 text-center text-xs text-muted-foreground",
				className,
			)}
		>
			<div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
				<p>© {currentYear} Nexus Hub. Todos os direitos reservados.</p>
				<div className="flex items-center gap-4">
					<Link
						to="/legal/terms"
						className="transition-colors hover:text-foreground hover:underline"
					>
						Termos de Serviço
					</Link>
					<span aria-hidden="true" className="text-border">
						•
					</span>
					<Link
						to="/legal/privacy"
						className="transition-colors hover:text-foreground hover:underline"
					>
						Política de Privacidade
					</Link>
				</div>
			</div>
		</footer>
	);
}

export default LegalFooter;
