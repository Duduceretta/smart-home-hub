import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { NexusHubWordmark } from "@/core/components/brand";
import { useReducedGraphics } from "@/core/hooks/useReducedGraphics";
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
	const { t } = useTranslation("auth");
	const location = useLocation();
	const { isReducedGraphics } = useReducedGraphics();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setMounted(true), 80);
		return () => clearTimeout(timer);
	}, []);

	return (
		<main
			className={cn(
				"relative flex min-h-screen w-full flex-col bg-background selection:bg-primary/30 lg:flex-row antialiased",
				isReducedGraphics && "static-graphics",
			)}
		>
			{/* LADO ESQUERDO: Painel Decorativo de Corte Arquitetônico (Fixo para Desktop) */}
			<section className="sticky top-0 z-20 hidden h-screen overflow-hidden border-r border-border-subtle bg-background shadow-[15px_0_50px_rgba(0,0,0,0.5)] lg:flex lg:w-7/12">
				<div className="absolute inset-0 z-0 overflow-hidden">
					{/* Ilustração arquitetônica com montagem progressiva sequencial */}
					<div
						data-testid="auth-illustration-container"
						className="relative h-full w-full"
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
						data-testid="auth-wordmark"
						className={cn(
							// Ancorado em % (não px) nos dois eixos: a ilustração usa preserveAspectRatio="none"
							// e estica de forma não-uniforme para preencher o container, então qualquer offset
							// fixo em px desalinha da ilustração assim que a altura do container muda (zoom da
							// página, DPI fracionário). % nos dois eixos acompanha esse mesmo esticamento.
							"opacity-0-init absolute top-[5.3%] left-[5.5%] flex items-center pointer-events-auto w-fit",
							mounted && "animate-slide-left",
						)}
					>
						{/* Largura em vw (não px fixo, não %): o wrapper é w-fit (shrink-to-fit),
						então % não tem base estável pra resolver contra — vw sim, e o painel é
						sempre exatos 7/12 da viewport (lg:w-7/12), então 14% de (7/12 * 100vw)
						acompanha a mesma escala do fio da luminária dentro do SVG ao lado. */}
						<NexusHubWordmark className="w-[8.167vw] h-auto text-foreground" />
						<h1 className="sr-only">Nexus Hub</h1>
					</div>

					<div
						data-testid="auth-status-badge"
						className={cn(
							"opacity-0-init pointer-events-auto absolute bottom-[1.4%] left-[1.4%] z-20",
							mounted && "animate-fade-up delay-400",
						)}
					>
						{/* Mesmo tratamento em vw do wordmark: gap/padding/ponto em em (herdam do
						font-size do próprio container), então tudo escala junto na mesma taxa
						da ilustração ao lado, sem salto de breakpoint. */}
						<div className="inline-flex items-center gap-[0.417vw] rounded-full border border-border-subtle bg-surface-low/80 px-[0.729vw] py-[0.313vw] backdrop-blur-md text-[0.625vw]">
							<span className="h-[0.417vw] w-[0.417vw] rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.25)]" />
							<span className="text-[1em] font-medium text-muted-foreground">
								{t(
									"illustration.allSystemsOperational",
									"Todos os sistemas operacionais",
								)}
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* LADO DIREITO (Dinâmico, recebe os formulários com escalabilidade proporcional) */}
			<section className="relative z-10 flex min-h-screen w-full flex-col items-center justify-between overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 2xl:p-12 lg:w-5/12">
				{/* Fundo dinâmico/sutil reaproveitando o céu noturno e calor da residência (mobile e desktop) */}
				<MobileAuthBackground />
				<DesktopAuthBackground />

				{/* Header Mobile / Controles Topo:
				    No mobile: barra de topo com logo à esquerda e seletores à direita (com flex-wrap para evitar sobreposição).
				    No desktop: seletores posicionados de forma absoluta no canto superior direito (lg:absolute lg:top-6 lg:right-6). */}
				<header className="relative z-30 flex w-full flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 lg:mb-0 lg:static lg:block">
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

				{/* Área central do formulário com preenchimento vertical proporcional para acomodar zoom */}
				<div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center py-6 sm:py-8 lg:py-10">
					<div className="flex w-full justify-center">
						{children ?? <Outlet />}
					</div>
				</div>

				{/* Rodapé legal:
				    No mobile: centralizado horizontalmente no fluxo do layout (mt-4 sm:mt-6 mb-2 w-full flex justify-center).
				    No desktop: ancorado no canto inferior direito de forma absoluta (lg:absolute lg:bottom-2 lg:right-3.5). */}
				<div className="relative z-20 mt-4 sm:mt-6 mb-2 flex w-full justify-center pointer-events-auto lg:absolute lg:bottom-2 lg:right-3.5 lg:mt-0 lg:mb-0 lg:w-auto">
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
