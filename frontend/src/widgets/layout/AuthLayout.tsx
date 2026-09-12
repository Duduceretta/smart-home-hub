import { type ReactNode, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NexusHubWordmark } from "@/core/components/brand";
import { cn } from "@/core/utils";
import { LanguageSelector } from "@/features/settings/components/LanguageSelector";
import { ThemePresetSelector } from "@/features/settings/components/ThemePresetSelector";
import { LegalFooter } from "@/widgets/legal-footer";
import { ArchitecturalResidenceIllustration } from "./components/ArchitecturalResidenceIllustration";
import { DesktopAuthBackground } from "./components/DesktopAuthBackground";
import { MobileAuthBackground } from "./components/MobileAuthBackground";

interface AuthLayoutProps {
	children?: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
	const location = useLocation();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setMounted(true), 80);
		return () => clearTimeout(t);
	}, []);

	return (
		<main className="relative flex min-h-screen w-full flex-col bg-background selection:bg-primary/30 lg:flex-row antialiased">
			{/* LADO ESQUERDO: Painel Decorativo de Corte Arquitetônico (Fixo para Desktop) */}
			<section className="sticky top-0 z-20 hidden h-screen overflow-hidden border-r border-border-subtle bg-background shadow-[15px_0_50px_rgba(0,0,0,0.5)] lg:flex lg:w-7/12">
				<div className="absolute inset-0 z-0 overflow-hidden">
					{/* Ilustração arquitetônica com montagem progressiva sequencial */}
					<div
						data-testid="auth-illustration-container"
						className="h-full w-full"
					>
						<ArchitecturalResidenceIllustration
							key={location.pathname}
							className="h-full w-full"
						/>
					</div>

					{/* Vinheta lateral suave apenas na borda divisória direita (sem escurecer o piso inferior) */}
					<div className="absolute inset-y-0 right-0 w-16 bg-linear-to-r from-transparent to-background/40 pointer-events-none" />
				</div>

				<div className="relative z-10 h-full w-full pointer-events-none">
					<div
						className={cn(
							"opacity-0-init absolute top-12 left-[5.5%] flex items-center pointer-events-auto w-fit",
							mounted && "animate-slide-left",
						)}
					>
						<NexusHubWordmark className="h-6 w-auto text-foreground" />
						<h1 className="sr-only">Nexus Hub</h1>
					</div>

					<div
						className={cn(
							"opacity-0-init pointer-events-auto absolute bottom-2.75 left-3 sm:bottom-3.25 sm:left-4 z-20",
							mounted && "animate-fade-up delay-400",
						)}
					>
						<div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-low/80 px-3.5 py-1.5 backdrop-blur-md">
							<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.25)]" />
							<span className="text-xs font-medium text-muted-foreground">
								Todos os sistemas operacionais
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* LADO DIREITO (Dinâmico, recebe os formulários) */}
			<section className="relative z-10 flex min-h-screen w-full flex-col items-center justify-between overflow-y-auto bg-background p-4 py-6 sm:p-8 lg:p-8 2xl:p-12 lg:w-5/12">
				{/* Fundo dinâmico/sutil reaproveitando o céu noturno e calor da residência (mobile e desktop) */}
				<MobileAuthBackground />
				<DesktopAuthBackground />

				{/* Header Mobile / Controles Topo:
				    No mobile: barra de topo com logo à esquerda e seletores à direita (com flex-wrap para evitar sobreposição).
				    No desktop: seletores posicionados de forma absoluta no canto superior direito (lg:absolute lg:top-6 lg:right-6). */}
				<header className="relative z-30 flex w-full flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 lg:mb-0 lg:static lg:block">
					{/* Bloco de marca visível apenas no mobile */}
					<div className="flex items-center shrink-0 lg:hidden">
						<NexusHubWordmark className="h-5 w-auto text-foreground" />
						<span className="sr-only">Nexus Hub</span>
					</div>

					{/* Seletores de Idioma e Tema (únicos no DOM, adaptam de flex no mobile para absolute no desktop) */}
					<div className="flex items-center gap-2 shrink-0 lg:absolute lg:top-6 lg:right-6">
						<LanguageSelector />
						<ThemePresetSelector variant="dropdown" />
					</div>
				</header>

				{/* Espaçador superior para alinhamento vertical equilibrado no desktop */}
				<div className="hidden lg:block w-full h-4" aria-hidden="true" />

				<div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center my-auto">
					<div className="flex w-full justify-center">
						{children ?? <Outlet />}
					</div>
				</div>

				{/* Rodapé legal:
				    No mobile: centralizado horizontalmente no fluxo do layout (mt-6 sm:mt-8 mb-2 w-full flex justify-center).
				    No desktop: ancorado no canto inferior direito de forma absoluta (lg:absolute lg:bottom-2 lg:right-3.5). */}
				<div className="relative z-20 mt-6 sm:mt-8 mb-2 flex w-full justify-center pointer-events-auto lg:absolute lg:bottom-2 lg:right-3.5 lg:mt-0 lg:mb-0 lg:w-auto">
					<LegalFooter
						variant="compact"
						className="justify-center lg:justify-end"
					/>
				</div>
			</section>
		</main>
	);
}

export default AuthLayout;
