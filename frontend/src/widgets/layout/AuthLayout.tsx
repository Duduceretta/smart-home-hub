import { Home } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/core/utils";
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
			{/* Seletor de Tema no canto superior direito (visível em desktop e mobile) */}
			<div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
				<ThemePresetSelector variant="dropdown" />
			</div>

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

				<div className="relative z-10 flex h-full w-full flex-col justify-between p-12 pointer-events-none">
					<div
						className={cn(
							"opacity-0-init flex items-center gap-2 pointer-events-auto w-fit",
							mounted && "animate-slide-left",
						)}
					>
						<Home className="h-8 w-8 text-primary" />
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">
							Nexus Hub
						</h1>
					</div>

					<div
						className={cn(
							"opacity-0-init pointer-events-auto absolute bottom-6 left-6",
							mounted && "animate-fade-up delay-400",
						)}
					>
						<div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-low/80 px-4 py-2 backdrop-blur-md">
							<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.25)]" />
							<span className="text-xs font-medium text-muted-foreground">
								Todos os sistemas operacionais
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* LADO DIREITO (Dinâmico, recebe os formulários) */}
			<section className="relative z-10 flex min-h-screen w-full flex-col items-center justify-between overflow-y-auto bg-background p-4 py-8 sm:p-8 lg:p-8 2xl:p-12 lg:w-5/12">
				{/* Fundo dinâmico/sutil reaproveitando o céu noturno e calor da residência (mobile e desktop) */}
				<MobileAuthBackground />
				<DesktopAuthBackground />

				{/* Espaçador superior para alinhamento vertical equilibrado */}
				<div className="hidden lg:block w-full h-4" aria-hidden="true" />

				<div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center my-auto">
					{/* Bloco de marca compacto no topo em Mobile (identidade garantida em telas pequenas) */}
					<div className="mb-6 flex items-center gap-2 lg:hidden">
						<Home className="h-7 w-7 text-primary" />
						<span className="text-2xl font-semibold tracking-tight text-foreground">
							Nexus Hub
						</span>
					</div>

					<div className="flex w-full justify-center">
						{children ?? <Outlet />}
					</div>
				</div>

				<LegalFooter variant="compact" className="relative z-10 mt-6" />
			</section>
		</main>
	);
}

export default AuthLayout;
