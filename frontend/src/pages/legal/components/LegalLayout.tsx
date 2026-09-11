import { ArrowLeft, Calendar, Home, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemePresetSelector } from "@/features/settings/components/ThemePresetSelector";
import { LegalFooter } from "@/widgets/legal-footer";

interface TableOfContentItem {
	id: string;
	title: string;
}

interface LegalLayoutProps {
	title: string;
	subtitle: string;
	lastUpdated: string;
	tableOfContents?: TableOfContentItem[];
	children: ReactNode;
	counterpartLink?: {
		to: string;
		label: string;
	};
}

export function LegalLayout({
	title,
	subtitle,
	lastUpdated,
	tableOfContents,
	children,
	counterpartLink,
}: LegalLayoutProps) {
	const navigate = useNavigate();

	const handleGoBack = () => {
		if (window.history.length > 1) {
			navigate(-1);
		} else {
			navigate("/login");
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 flex flex-col">
			{/* Top Header */}
			<header className="sticky top-0 z-30 border-b border-border-subtle bg-background/80 backdrop-blur-md">
				<div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleGoBack}
							aria-label="Voltar para a página anterior"
							className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-low text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer"
						>
							<ArrowLeft className="h-4 w-4" />
						</button>
						<Link
							to="/"
							className="flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
						>
							<Home className="h-5 w-5 text-primary" />
							<span>Nexus Hub</span>
						</Link>
					</div>

					<div className="flex items-center gap-3">
						<ThemePresetSelector variant="dropdown" />
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 py-8 sm:py-12">
				<article className="mx-auto max-w-3xl px-4 sm:px-6">
					{/* Header section */}
					<header className="mb-8 border-b border-border-subtle pb-8">
						<div className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-low px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
							<ShieldCheck className="h-3.5 w-3.5 text-primary" />
							<span>Documento Oficial • Nexus Hub</span>
						</div>

						<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
							{title}
						</h1>
						<p className="mt-2 text-base text-muted-foreground">{subtitle}</p>

						<div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
							<Calendar className="h-3.5 w-3.5" />
							<span>Última atualização: {lastUpdated}</span>
						</div>
					</header>

					{/* Optional Table of Contents */}
					{tableOfContents && tableOfContents.length > 0 && (
						<nav
							aria-label="Índice do documento"
							className="mb-10 rounded-xl border border-border-subtle bg-surface-low/80 p-5 backdrop-blur-sm"
						>
							<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
								Sumário do Documento
							</h2>
							<ol className="grid gap-2 text-sm sm:grid-cols-2">
								{tableOfContents.map((item, index) => (
									<li key={item.id}>
										<a
											href={`#${item.id}`}
											className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
										>
											<span className="text-xs font-mono text-muted-foreground/70">
												{(index + 1).toString().padStart(2, "0")}.
											</span>
											<span>{item.title}</span>
										</a>
									</li>
								))}
							</ol>
						</nav>
					)}

					{/* Document Content */}
					<div className="space-y-10 leading-relaxed text-muted-foreground">
						{children}
					</div>

					{/* Counterpart link if provided */}
					{counterpartLink && (
						<div className="mt-12 rounded-xl border border-border-subtle bg-surface-low p-6 text-center">
							<p className="text-sm text-muted-foreground mb-2">
								Transparência e conformidade em toda a plataforma:
							</p>
							<Link
								to={counterpartLink.to}
								className="font-medium text-primary hover:underline"
							>
								{counterpartLink.label} →
							</Link>
						</div>
					)}
				</article>
			</main>

			{/* Full Legal Footer */}
			<LegalFooter variant="full" />
		</div>
	);
}

export default LegalLayout;
