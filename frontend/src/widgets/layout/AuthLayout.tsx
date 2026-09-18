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
				// min-h-svh (não min-h-screen): na carga inicial mobile a barra de endereço
				// ainda está visível, então 100vh assume mais altura do que a área realmente
				// visível — o conteúdo "vaza" e exige scroll pra assentar. svh assume o menor
				// tamanho garantido (barra sempre visível), então já nasce do tamanho certo.
				// Só aqui no AuthLayout — o dashboard mantém min-h-screen de propósito, por
				// causa do comportamento do teclado virtual.
				"relative flex min-h-svh w-full flex-col bg-background selection:bg-primary/30 lg:flex-row antialiased",
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
			<section className="relative z-10 flex min-h-svh w-full flex-col items-center justify-between overflow-x-hidden overflow-y-auto bg-background px-5 py-4 sm:p-6 lg:p-8 2xl:p-12 lg:w-5/12">
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
					<div className="relative flex w-full justify-center">
						<div className="relative w-full max-w-94 flex flex-col items-center">
							{/* Container do Card com Borda Cibernética Neon Esmeralda e Halo Atmosférico */}
							<div className="relative w-full z-10">
								{/* Halo esmeralda atmosférico de profundidade atrás do card */}
								<div
									className="pointer-events-none absolute -inset-10 sm:-inset-14 rounded-[40px] bg-emerald-500/15 blur-3xl hidden lg:block -z-10"
									aria-hidden="true"
								/>
								<div
									className="pointer-events-none absolute -inset-4 rounded-3xl bg-emerald-400/10 blur-xl hidden lg:block -z-10"
									aria-hidden="true"
								/>

								{/* Contorno neon esmeralda no desktop que replica o brilho verde do card na referência */}
								<div className="pointer-events-none absolute -inset-0.5 rounded-2xl border-2 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.35),inset_0_0_15px_rgba(16,185,129,0.12)] hidden lg:block z-20" />

								{/* Casca opaca do card: fica fixa aqui (nunca desmonta) em vez de em cada
								    Form — a troca de rota desmonta/remonta só o conteúdo interno, e por uma
								    fração de segundo o backdrop-blur de um nó recém-montado ainda não
								    compositou, deixando o planeta atrás aparecer sem nenhum filtro. Com o
								    fundo/blur persistente aqui, a cobertura nunca é removida.
								    Troca de página é instantânea de propósito (sem crossfade, sem largura
								    variável por rota) — é assim que fluxos de auth de referência (Google,
								    GitHub, Auth0, Vercel) fazem: card de largura fixa, sem animação de
								    transição entre login/registro/etc. */}
								<div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 shadow-2xl backdrop-blur-xl">
									{children ?? <Outlet />}
								</div>
							</div>
						</div>
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
