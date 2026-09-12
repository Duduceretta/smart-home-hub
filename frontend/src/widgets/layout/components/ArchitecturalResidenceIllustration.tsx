import { useAuthIllustrationUIStore } from "@/features/auth/store/auth-illustration-ui.store";

interface ArchitecturalResidenceIllustrationProps {
	className?: string;
}

export function ArchitecturalResidenceIllustration({
	className,
}: ArchitecturalResidenceIllustrationProps) {
	const {
		isLivingLampOn,
		isBedroomLampOn,
		isOfficeLampOn,
		toggleLivingLamp,
		toggleBedroomLamp,
		toggleOfficeLamp,
	} = useAuthIllustrationUIStore();

	return (
		<svg
			viewBox="15 165 810 715"
			preserveAspectRatio="none"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-label="Corte arquitetônico da residência"
		>
			<defs>
				{/* Estilos dinâmicos, transições de luz e acessibilidade */}
				<style>{`
					.transition-light {
						transition: opacity 300ms ease, fill 300ms ease, stroke 300ms ease;
					}
					g[role="button"] {
						outline: none !important;
						-webkit-tap-highlight-color: transparent;
					}
					g[role="button"]:focus,
					g[role="button"]:focus-visible {
						outline: none !important;
					}
					@keyframes warmBreathing {
						0%, 100% { opacity: 0.5; }
						50% { opacity: 0.8; }
					}
					.anim-breath {
						animation: warmBreathing 7s ease-in-out infinite;
					}
					/* Montagem arquitetônica progressiva em camadas sequenciais */
					@keyframes houseBuildRise {
						0% {
							opacity: 0;
							transform: translateY(22px);
						}
						100% {
							opacity: 1;
							transform: translateY(0);
						}
					}
					@keyframes houseBuildSlabs {
						0% {
							opacity: 0;
							transform: translateY(18px);
						}
						100% {
							opacity: 1;
							transform: translateY(0);
						}
					}
					@keyframes houseBuildDrop {
						0% {
							opacity: 0;
							transform: translateY(-12px);
						}
						100% {
							opacity: 1;
							transform: translateY(0);
						}
					}
					@keyframes houseBuildFade {
						0% {
							opacity: 0;
						}
						100% {
							opacity: 1;
						}
					}
					.house-layer-slabs,
					.house-layer-structure,
					.house-layer-architecture,
					.house-layer-furniture,
					.house-layer-items,
					.house-layer-lights {
						opacity: 0;
					}
					.house-layer-slabs {
						animation: houseBuildSlabs 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.04s both;
						will-change: transform, opacity;
					}
					.house-layer-structure {
						animation: houseBuildRise 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
						will-change: transform, opacity;
					}
					.house-layer-architecture {
						animation: houseBuildRise 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.26s both;
						will-change: transform, opacity;
					}
					.house-layer-furniture {
						animation: houseBuildRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.38s both;
						will-change: transform, opacity;
					}
					.house-layer-items {
						animation: houseBuildDrop 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
						will-change: transform, opacity;
					}
					.house-layer-lights {
						animation: houseBuildFade 0.58s cubic-bezier(0.16, 1, 0.3, 1) 0.62s both;
						will-change: opacity;
					}
					/* Deriva contínua e cintilação das estrelas na janela em sincronia com o céu do desktop */
					@keyframes windowStarDriftSlow {
						0% { transform: translateX(0px); }
						100% { transform: translateX(182px); }
					}
					@keyframes windowStarDriftMid {
						0% { transform: translateX(0px); }
						100% { transform: translateX(182px); }
					}
					@keyframes windowTwinkleA {
						0%, 100% { opacity: 0.35; }
						50% { opacity: 0.95; }
					}
					@keyframes windowTwinkleB {
						0%, 100% { opacity: 0.95; }
						50% { opacity: 0.3; }
					}
					@keyframes windowTwinkleC {
						0%, 100% { opacity: 0.4; }
						50% { opacity: 0.9; }
					}
					.window-drift-layer-slow {
						animation: windowStarDriftSlow 22.75s linear infinite;
						will-change: transform;
					}
					.window-drift-layer-mid {
						animation: windowStarDriftMid 13.65s linear infinite;
						will-change: transform;
					}
					.window-twinkle-a {
						animation: windowTwinkleA 5.5s ease-in-out infinite;
					}
					.window-twinkle-b {
						animation: windowTwinkleB 6.8s ease-in-out infinite;
					}
					.window-twinkle-c {
						animation: windowTwinkleC 6.0s ease-in-out infinite;
					}
					@media (prefers-reduced-motion: reduce) {
						.transition-light,
						.anim-breath,
						.house-layer-slabs,
						.house-layer-structure,
						.house-layer-architecture,
						.house-layer-furniture,
						.house-layer-items,
						.house-layer-lights,
						.window-drift-layer-slow,
						.window-drift-layer-mid,
						.window-twinkle-a,
						.window-twinkle-b,
						.window-twinkle-c {
							animation: none !important;
							transition: none !important;
							transform: none !important;
							opacity: 1 !important;
						}
					}
				`}</style>

				{/* 1. Sombras de contato e profundidade */}

				<filter
					id="soft-contact-shadow"
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
				>
					<feDropShadow
						dx="0"
						dy="6"
						stdDeviation="8"
						floodColor="var(--background)"
						floodOpacity="0.45"
					/>
				</filter>

				{/* 2. Gradientes atmosféricos e de iluminação arquitetônica */}
				<linearGradient
					id="sky-dusk-gradient"
					x1="420"
					y1="0"
					x2="420"
					y2="1000"
					gradientUnits="userSpaceOnUse"
				>
					<stop
						offset="0%"
						stopColor="var(--surface-highest)"
						stopOpacity="0.32"
					/>
					<stop offset="35%" stopColor="var(--popover)" stopOpacity="0.38" />
					<stop offset="75%" stopColor="var(--card)" stopOpacity="0.45" />
					<stop offset="100%" stopColor="var(--card)" stopOpacity="0.6" />
				</linearGradient>

				{/* Luz do pórtico / entrada principal */}
				<linearGradient id="entry-porch-light" x1="0.5" y1="0" x2="0.5" y2="1">
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.6" />
					<stop offset="60%" stopColor="var(--warm)" stopOpacity="0.25" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</linearGradient>

				{/* Cone de luz interativo da luminária arco no Living */}
				<linearGradient
					id="interactive-arc-lamp-cone"
					x1="0.5"
					y1="0"
					x2="0.5"
					y2="1"
				>
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.7" />
					<stop offset="30%" stopColor="var(--warm)" stopOpacity="0.25" />
					<stop offset="85%" stopColor="var(--warm)" stopOpacity="0.08" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</linearGradient>

				{/* Cone de luz interativo do pendente do quarto master */}
				<linearGradient
					id="interactive-bedroom-cone"
					x1="0.5"
					y1="0"
					x2="0.5"
					y2="1"
				>
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.75" />
					<stop offset="40%" stopColor="var(--warm)" stopOpacity="0.3" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</linearGradient>

				{/* Cone de luz interativo do spot de teto do Home Office */}
				<linearGradient
					id="interactive-office-cone"
					x1="0.5"
					y1="0"
					x2="0.5"
					y2="1"
				>
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.75" />
					<stop offset="35%" stopColor="var(--warm)" stopOpacity="0.25" />
					<stop offset="85%" stopColor="var(--warm)" stopOpacity="0.06" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</linearGradient>

				{/* Luz quente difusa dos ambientes internos */}
				<radialGradient id="ambient-room-warmth" cx="50%" cy="45%" r="60%">
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.3" />
					<stop offset="50%" stopColor="var(--warm)" stopOpacity="0.1" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</radialGradient>

				{/* Vista do céu noturno com estrelas da janela superior */}
				<linearGradient id="window-night-sky" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--background)" stopOpacity="0.98" />
					<stop offset="55%" stopColor="var(--card)" stopOpacity="0.95" />
					<stop offset="100%" stopColor="var(--popover)" stopOpacity="0.8" />
				</linearGradient>

				{/* Máscara de recorte do vão de vidro da janela (impede vazamento das estrelas) */}
				<clipPath id="window-stars-clip">
					<rect x="294" y="229" width="182" height="162" rx="1" />
				</clipPath>

				{/* Conjunto 1: Estrelas de fundo da janela (paralaxe distante - deriva lenta) */}
				<g id="window-stars-faint">
					<circle cx="325" cy="260" r="0.7" fill="var(--warm)" opacity="0.6" />
					<circle
						cx="342"
						cy="250"
						r="0.6"
						fill="var(--primary)"
						opacity="0.5"
					/>
					<circle
						cx="318"
						cy="320"
						r="0.8"
						fill="var(--primary)"
						opacity="0.55"
					/>
					<circle
						cx="308"
						cy="365"
						r="0.6"
						fill="var(--primary)"
						opacity="0.5"
					/>
					<circle cx="370" cy="275" r="0.8" fill="var(--warm)" opacity="0.6" />
					<circle cx="362" cy="305" r="0.6" fill="var(--warm)" opacity="0.5" />
					<circle cx="405" cy="318" r="0.7" fill="var(--warm)" opacity="0.55" />
					<circle
						cx="392"
						cy="355"
						r="0.8"
						fill="var(--primary)"
						opacity="0.55"
					/>
					<circle cx="368" cy="370" r="0.6" fill="var(--warm)" opacity="0.45" />
					<circle
						cx="428"
						cy="265"
						r="0.8"
						fill="var(--primary)"
						opacity="0.6"
					/>
					<circle
						cx="438"
						cy="290"
						r="0.6"
						fill="var(--primary)"
						opacity="0.5"
					/>
					<circle cx="426" cy="335" r="0.7" fill="var(--warm)" opacity="0.55" />
					<circle cx="440" cy="368" r="0.6" fill="var(--warm)" opacity="0.45" />
				</g>

				{/* Conjunto 2: Estrelas nítidas com cintilação e brilho (paralaxe média) */}
				<g id="window-stars-bright">
					{/* Estrela Polar com brilho cruzado e halo */}
					<g className="window-twinkle-a">
						<circle
							cx="385"
							cy="248"
							r="4.5"
							fill="var(--primary)"
							opacity="0.2"
						/>
						<circle
							cx="385"
							cy="248"
							r="1.6"
							fill="var(--primary)"
							opacity="0.95"
						/>
						<line
							x1="381"
							y1="248"
							x2="389"
							y2="248"
							stroke="var(--primary)"
							strokeWidth="0.6"
							opacity="0.75"
						/>
						<line
							x1="385"
							y1="244"
							x2="385"
							y2="252"
							stroke="var(--primary)"
							strokeWidth="0.6"
							opacity="0.75"
						/>
					</g>

					{/* Estrelas com halo e cintilação */}
					<g className="window-twinkle-b" style={{ animationDelay: "-1.8s" }}>
						<circle
							cx="310"
							cy="245"
							r="3"
							fill="var(--primary)"
							opacity="0.18"
						/>
						<circle
							cx="310"
							cy="245"
							r="1.3"
							fill="var(--primary)"
							opacity="0.95"
						/>
					</g>
					<circle
						cx="305"
						cy="285"
						r="0.9"
						fill="var(--primary)"
						className="window-twinkle-c"
						style={{ animationDelay: "-3.2s" }}
					/>
					<circle
						cx="338"
						cy="295"
						r="1.4"
						fill="var(--warm)"
						className="window-twinkle-a"
						style={{ animationDelay: "-2.1s" }}
					/>
					<circle
						cx="330"
						cy="350"
						r="1.0"
						fill="var(--warm)"
						className="window-twinkle-b"
						style={{ animationDelay: "-4.5s" }}
					/>

					<circle
						cx="398"
						cy="282"
						r="1.1"
						fill="var(--primary)"
						className="window-twinkle-c"
						style={{ animationDelay: "-1.4s" }}
					/>
					<circle
						cx="378"
						cy="325"
						r="1.3"
						fill="var(--primary)"
						className="window-twinkle-b"
						style={{ animationDelay: "-3.8s" }}
					/>

					<g className="window-twinkle-a" style={{ animationDelay: "-2.6s" }}>
						<circle
							cx="445"
							cy="242"
							r="3.2"
							fill="var(--primary)"
							opacity="0.15"
						/>
						<circle
							cx="445"
							cy="242"
							r="1.3"
							fill="var(--warm)"
							opacity="0.9"
						/>
					</g>
					<circle
						cx="460"
						cy="258"
						r="1.0"
						fill="var(--warm)"
						className="window-twinkle-b"
						style={{ animationDelay: "-0.8s" }}
					/>
					<circle
						cx="452"
						cy="310"
						r="1.2"
						fill="var(--primary)"
						className="window-twinkle-c"
						style={{ animationDelay: "-4.1s" }}
					/>
					<circle
						cx="465"
						cy="345"
						r="0.9"
						fill="var(--primary)"
						className="window-twinkle-a"
						style={{ animationDelay: "-1.9s" }}
					/>
				</g>
			</defs>

			{/* ========================================================================= */}
			{/* CAMADA 1 (FUNDO / PROFUNDIDADE DISTANTE COM PARALLAX LEVE) */}
			{/* ========================================================================= */}
			<g>
				{/* Fundo luminoso que elimina a escuridão excessiva */}
				<rect
					x="0"
					y="0"
					width="840"
					height="1000"
					fill="url(#sky-dusk-gradient)"
				/>
			</g>

			{/* ========================================================================= */}
			{/* CAMADA 2 (ESTRUTURA ARQUITETÔNICA, PAREDES E PISOS - OCUPANDO LARGURA) */}
			{/* ========================================================================= */}
			<g>
				{/* 1. Lajes, envoltória e cobertura da residência */}
				<g className="house-layer-slabs">
					{/* Volume principal da casa - expandido de x=45 a x=795 para ocupar a coluna inteira */}
					<rect
						x="45"
						y="180"
						width="750"
						height="660"
						fill="var(--card)"
						opacity="0.9"
						stroke="var(--border-subtle)"
						strokeWidth="1.5"
						filter="url(#soft-contact-shadow)"
						rx="4"
					/>

					{/* Platibanda e Cobertura em balanço (Beiral superior amplo) */}
					<polygon
						points="20,175 820,175 795,205 45,205"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>
					{/* Claraboia zenital superior */}
					<rect
						x="370"
						y="170"
						width="100"
						height="7"
						fill="var(--primary)"
						opacity="0.75"
						rx="1.5"
					/>

					{/* Laje Nível 2 (Divisão dos Pavimentos com perfil metálico aparente) */}
					<rect
						x="45"
						y="490"
						width="750"
						height="22"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					<line
						x1="45"
						y1="501"
						x2="795"
						y2="501"
						stroke="var(--border-subtle)"
						strokeWidth="1"
					/>

					{/* Laje Nível 1 (Piso Térreo / Fundação Nítida - sem degradê escurecendo) */}
					<rect
						x="20"
						y="840"
						width="800"
						height="32"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>
					{/* Linha de balizamento da fundação */}
					<line
						x1="20"
						y1="841"
						x2="820"
						y2="841"
						stroke="var(--primary)"
						strokeWidth="1"
						opacity="0.4"
					/>
				</g>

				{/* Brilho interior acolhedor suave que preenche a residência (iluminação) */}
				<g className="house-layer-lights">
					<rect
						x="45"
						y="180"
						width="750"
						height="660"
						fill="url(#ambient-room-warmth)"
						className="anim-breath"
					/>
				</g>

				{/* 2. Pilares e montantes verticais estruturais */}
				<g className="house-layer-structure">
					<rect
						x="45"
						y="180"
						width="16"
						height="660"
						fill="var(--surface-highest)"
					/>
					<rect
						x="779"
						y="180"
						width="16"
						height="660"
						fill="var(--surface-highest)"
					/>
					<rect
						x="250"
						y="205"
						width="10"
						height="285"
						fill="var(--popover)"
						opacity="0.7"
					/>
					<rect
						x="520"
						y="205"
						width="10"
						height="285"
						fill="var(--popover)"
						opacity="0.7"
					/>
				</g>

				{/* ========================================================================= */}
				{/* 3. PAREDES DE FUNDO: ELEMENTOS CURADOS EM ESPAÇOS VAZIOS                  */}
				{/* ========================================================================= */}
				<g className="house-layer-architecture">
					{/* 1. MEZANINO CENTRAL (PAREDE SUPERIOR): Janela com vista do céu escuro e estrelas */}
					<g filter="url(#soft-contact-shadow)">
						{/* Moldura estrutural externa da janela em metal escuro */}
						<rect
							x="290"
							y="225"
							width="190"
							height="170"
							rx="2"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1.5"
						/>
						{/* Vão de vidro: Céu escuro noturno com gradiente suave */}
						<rect
							x="294"
							y="229"
							width="182"
							height="162"
							rx="1"
							fill="url(#window-night-sky)"
						/>

						{/* Brilho cósmico / poeira estelar difusa sutil */}
						<ellipse
							cx="385"
							cy="260"
							rx="55"
							ry="30"
							fill="var(--primary)"
							opacity="0.025"
						/>

						{/* Estrelas dinâmicas em deriva contínua e cintilação através do vão da janela */}
						<g clipPath="url(#window-stars-clip)">
							{/* Camada 1: Estrelas de fundo lentas (paralaxe distante - loop contínuo) */}
							<g className="window-drift-layer-slow">
								<use href="#window-stars-faint" x="-182" y="0" />
								<use href="#window-stars-faint" x="0" y="0" />
								<use href="#window-stars-faint" x="182" y="0" />
							</g>

							{/* Camada 2: Estrelas nítidas / brilhantes com cintilação (paralaxe média - loop contínuo) */}
							<g className="window-drift-layer-mid">
								<use href="#window-stars-bright" x="-182" y="0" />
								<use href="#window-stars-bright" x="0" y="0" />
								<use href="#window-stars-bright" x="182" y="0" />
							</g>
						</g>

						{/* Caixilharia interna: 2 montantes verticais delgados dividindo em 3 panos de vidro */}
						<line
							x1="354"
							y1="229"
							x2="354"
							y2="391"
							stroke="var(--border)"
							strokeWidth="1.2"
						/>
						<line
							x1="415"
							y1="229"
							x2="415"
							y2="391"
							stroke="var(--border)"
							strokeWidth="1.2"
						/>

						{/* Reflexos sutis de vidro arquitetônico */}
						<polygon
							points="305,229 325,229 310,391 294,391"
							fill="var(--primary)"
							opacity="0.025"
						/>
						<polygon
							points="430,229 450,229 435,391 418,391"
							fill="var(--primary)"
							opacity="0.025"
						/>

						{/* Peitoril estrutural inferior em acabamento contemporâneo */}
						<rect
							x="286"
							y="395"
							width="198"
							height="5"
							rx="1"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<line
							x1="286"
							y1="395"
							x2="484"
							y2="395"
							stroke="var(--warm)"
							strokeWidth="1"
							opacity="0.8"
						/>
					</g>

					{/* 3. HOME OFFICE (PAREDE SUPERIOR DIREITA): Prateleira com Livros e Headphone Stand */}
					<g>
						<rect
							x="550"
							y="270"
							width="78"
							height="3"
							rx="1"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						{/* Livros retos */}
						<rect
							x="556"
							y="250"
							width="8"
							height="20"
							rx="0.8"
							fill="var(--warm)"
							opacity="0.9"
						/>
						<rect
							x="565"
							y="253"
							width="7"
							height="17"
							rx="0.8"
							fill="var(--surface-high)"
							stroke="var(--border)"
							strokeWidth="0.5"
						/>
						{/* Livros na diagonal */}
						<rect
							x="577"
							y="252"
							width="6"
							height="18"
							rx="0.8"
							fill="var(--primary)"
							opacity="0.7"
							transform="rotate(-17 577 270)"
						/>
						<rect
							x="584"
							y="254"
							width="6"
							height="16"
							rx="0.8"
							fill="var(--warm)"
							opacity="0.6"
							transform="rotate(-17 584 270)"
						/>
						{/* Acessório Tech: Headphone Stand com Fone Over-Ear */}
						<ellipse
							cx="612"
							cy="270"
							rx="4.5"
							ry="1.5"
							fill="var(--primary)"
							opacity="0.8"
						/>
						<line
							x1="612"
							y1="270"
							x2="612"
							y2="252"
							stroke="var(--primary)"
							strokeWidth="1.2"
						/>
						<path
							d="M606 254 C606 249 618 249 618 254"
							fill="none"
							stroke="var(--surface-highest)"
							strokeWidth="2.5"
						/>
						<rect
							x="604"
							y="253"
							width="3.5"
							height="7"
							rx="1"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						<rect
							x="616"
							y="253"
							width="3.5"
							height="7"
							rx="1"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
					</g>

					{/* Quadro Futurista do Home Office (display digital panorâmico, ajustado um pouco mais para baixo) */}
					<g filter="url(#soft-contact-shadow)">
						{/* Moldura técnica externa com chanfros sutis */}
						<rect
							x="565"
							y="300"
							width="110"
							height="36"
							rx="2"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1.2"
						/>
						{/* LED indicador de status do display digital */}
						<circle
							cx="572"
							cy="305"
							r="1.2"
							className="fill-emerald-400"
							opacity="0.9"
						/>

						{/* Tela digital interna */}
						<rect
							x="569"
							y="304"
							width="102"
							height="28"
							rx="1"
							fill="var(--popover)"
						/>

						{/* Arte futurista: Sol/horizonte cibernético vetorial */}
						<ellipse
							cx="620"
							cy="316"
							rx="12"
							ry="6"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="1"
							opacity="0.85"
						/>
						<circle
							cx="620"
							cy="314"
							r="2.5"
							fill="var(--warm)"
							opacity="0.8"
						/>

						{/* Espectro digital / onda de telemetria estilizada */}
						<path
							d="M 574 322 L 588 322 L 594 314 L 600 329 L 606 317 L 612 326 L 618 319 L 624 322 L 666 322"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="1.2"
							opacity="0.9"
						/>

						{/* Grid holográfico em perspectiva no piso virtual */}
						<line
							x1="574"
							y1="327"
							x2="666"
							y2="327"
							stroke="var(--primary)"
							strokeWidth="0.8"
							strokeDasharray="3 2"
							opacity="0.4"
						/>
						<line
							x1="574"
							y1="330"
							x2="666"
							y2="330"
							stroke="var(--warm)"
							strokeWidth="0.6"
							opacity="0.5"
						/>

						{/* Tags de telemetria digital no canto superior */}
						<rect
							x="648"
							y="307"
							width="14"
							height="2"
							rx="0.5"
							fill="var(--primary)"
							opacity="0.4"
						/>
						<rect
							x="648"
							y="310"
							width="8"
							height="1.5"
							rx="0.5"
							fill="var(--warm)"
							opacity="0.7"
						/>
					</g>

					{/* 4. LIVING ROOM (PAREDE TÉRREO ATRÁS DO SOFÁ): Quadro de Galeria Minimalista */}
					<g>
						<rect
							x="205"
							y="550"
							width="64"
							height="44"
							rx="2"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<rect
							x="209"
							y="554"
							width="56"
							height="36"
							fill="var(--popover)"
						/>
						<path
							d="M214 572 Q224 558 234 572 T254 572"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="1.2"
							opacity="0.8"
						/>
						<circle
							cx="251"
							cy="565"
							r="4"
							fill="var(--primary)"
							opacity="0.4"
						/>
					</g>

					{/* 5. PRATELEIRA COM ROBÔ INTELIGENTE (Abaixo à direita do quadro, acima à direita da luz) */}
					<g>
						{/* Prateleira flutuante minimalista estendida */}
						<rect
							x="280"
							y="620"
							width="80"
							height="3"
							rx="1"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>

						{/* Robô Inteligente Companion */}
						{/* Base / Esteiras de locomoção */}
						<rect
							x="289"
							y="616"
							width="20"
							height="4"
							rx="1.5"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						{/* Corpo arredondado */}
						<rect
							x="291"
							y="605"
							width="16"
							height="12"
							rx="3.5"
							fill="var(--surface-high)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						{/* Cabeça / Visor digital com olhos expressivos */}
						<rect
							x="290"
							y="597"
							width="18"
							height="10"
							rx="2.5"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.7"
						/>
						{/* Olhos digitais expressivos no visor */}
						<rect
							x="293"
							y="600.5"
							width="4"
							height="2.5"
							rx="1"
							className="fill-emerald-400"
						/>
						<rect
							x="301"
							y="600.5"
							width="4"
							height="2.5"
							rx="1"
							className="fill-emerald-400"
						/>
						{/* Antena com LED comunicador */}
						<line
							x1="299"
							y1="597"
							x2="299"
							y2="591"
							stroke="var(--primary)"
							strokeWidth="1"
							strokeLinecap="round"
						/>
						<circle
							cx="299"
							cy="590"
							r="1.5"
							fill="var(--warm)"
							opacity="0.9"
						/>
						{/* Braços articulados compactos */}
						<path
							d="M290 608 Q287 611 290 614"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="1"
							strokeLinecap="round"
						/>
						<path
							d="M308 608 Q311 611 308 614"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="1"
							strokeLinecap="round"
						/>

						{/* Pequena dock / módulo de carga na prateleira */}
						<rect
							x="313"
							y="614"
							width="8"
							height="6"
							rx="1"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						<circle
							cx="317"
							cy="617"
							r="1"
							className="fill-emerald-400"
							opacity="0.8"
						/>

						{/* Planta em vaso cerâmico contemporâneo com folhagem ornamental */}
						{/* Vaso cerâmico minimalista */}
						<rect
							x="332"
							y="610"
							width="18"
							height="10"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<line
							x1="331"
							y1="610"
							x2="351"
							y2="610"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.75"
						/>
						{/* Folhagens e brotos biofílicos */}
						<path
							d="M341 610 Q341 599 347 597 Q350 605 341 610"
							className="fill-emerald-400"
							opacity="0.9"
						/>
						<path
							d="M337 610 Q330 604 329 599 Q337 601 337 610"
							className="fill-emerald-400"
							opacity="0.75"
						/>
						<path
							d="M345 610 Q353 604 355 600 Q350 607 345 610"
							className="fill-emerald-400"
							opacity="0.85"
						/>
						{/* Ramo pendente suave caindo sobre a prateleira */}
						<path
							d="M349 610 Q357 616 354 626 Q350 622 349 610"
							className="fill-emerald-400"
							opacity="0.8"
						/>
					</g>

					{/* 6. CÂMERA DE SEGURANÇA NO TETO (APONTADA PARA A PORTA DE ENTRADA) */}
					<g>
						{/* Cone de visão / campo de vigilância transparente sutil apontado para a porta */}
						<polygon
							points="357,517 75,640 165,780"
							fill="var(--primary)"
							opacity="0.035"
						/>
						<line
							x1="357"
							y1="517"
							x2="75"
							y2="640"
							stroke="var(--primary)"
							strokeWidth="0.5"
							strokeDasharray="3 3"
							opacity="0.18"
						/>
						<line
							x1="357"
							y1="517"
							x2="165"
							y2="780"
							stroke="var(--primary)"
							strokeWidth="0.5"
							strokeDasharray="3 3"
							opacity="0.18"
						/>

						{/* Suporte de fixação articulado rente à laje (y=512) */}
						<rect
							x="350"
							y="512"
							width="14"
							height="3"
							rx="0.8"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<circle
							cx="357"
							cy="517"
							r="2.5"
							fill="var(--surface-high)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>

						{/* Corpo da câmera de segurança rotacionado em direção à porta de entrada */}
						<g transform="rotate(-50 357 517)">
							{/* Haste de suporte */}
							<rect
								x="355.5"
								y="517"
								width="3"
								height="4"
								fill="var(--border)"
							/>
							{/* Gabinete principal da câmera bullet */}
							<rect
								x="352"
								y="520"
								width="10"
								height="17"
								rx="3"
								fill="var(--popover)"
								stroke="var(--border)"
								strokeWidth="0.8"
							/>
							{/* Aba / viseira protetora superior */}
							<rect
								x="351"
								y="520"
								width="12"
								height="6"
								rx="1.5"
								fill="var(--surface-highest)"
								stroke="var(--border-subtle)"
								strokeWidth="0.6"
							/>
							{/* Lente óptica frontal voltada para a porta */}
							<ellipse
								cx="357"
								cy="537"
								rx="4.5"
								ry="1.5"
								fill="var(--surface-high)"
								stroke="var(--border)"
								strokeWidth="0.6"
							/>
							<circle cx="357" cy="537" r="2.2" fill="var(--card)" />
							<circle
								cx="357"
								cy="537"
								r="1"
								fill="var(--primary)"
								opacity="0.85"
							/>
							{/* LED de gravação / monitoramento ativo */}
							<circle cx="357" cy="532" r="1" className="fill-emerald-400" />
						</g>
					</g>
				</g>

				{/* 4. Acessos e circulação: Entrada Principal e Escada Estrutural */}
				<g className="house-layer-structure">
					{/* --- 1. ENTRADA PRINCIPAL / PORTA PIVOTANTE CONTEMPORÂNEA (NOVO ITEM 2) --- */}
					{/* Pórtico de entrada na lateral esquerda do térreo (x=65 a x=175) */}
					<rect
						x="65"
						y="580"
						width="110"
						height="260"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="1.5"
						rx="2"
					/>
					{/* Marquise / aba protetora sobre a porta */}
					<polygon
						points="50,580 185,580 180,592 55,592"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					{/* Luz do pórtico derramando sobre a porta e soleira */}
					<polygon
						points="65,592 175,592 195,840 45,840"
						fill="url(#entry-porch-light)"
						opacity="0.7"
					/>

					{/* Folha da porta pivotante em tom de madeira/grafite nobre */}
					<rect
						x="80"
						y="600"
						width="80"
						height="240"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1.5"
						rx="1"
						filter="url(#soft-contact-shadow)"
					/>
					{/* Puxador vertical em aço escovado alto */}
					<rect
						x="145"
						y="680"
						width="4"
						height="75"
						fill="var(--primary)"
						rx="1"
						opacity="0.9"
					/>
					{/* Friso arquitetônico horizontal da porta */}
					<line
						x1="80"
						y1="670"
						x2="160"
						y2="670"
						stroke="var(--border-subtle)"
						strokeWidth="1"
					/>
					<line
						x1="80"
						y1="740"
						x2="160"
						y2="740"
						stroke="var(--border-subtle)"
						strokeWidth="1"
					/>
					{/* Luminária embutida no teto da entrada (spot) */}
					<circle cx="120" cy="587" r="3" fill="var(--warm)" />
					<circle cx="120" cy="587" r="8" fill="var(--warm)" opacity="0.4" />

					{/* --- 2. ESCADA ARQUITETÔNICA EM PERSPECTIVA DIAGONAL (NOVO ITEM 5) --- */}
					{/* A escada parte de x=310, y=825 e sobe diagonalmente até x=495, y=510 */}
					<g filter="url(#soft-contact-shadow)">
						{/* Degrau 1 */}
						<polygon
							points="305,820 375,820 370,832 300,832"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="300"
							y1="832"
							x2="370"
							y2="832"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 2 */}
						<polygon
							points="325,785 395,785 390,797 320,797"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="320"
							y1="797"
							x2="390"
							y2="797"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 3 */}
						<polygon
							points="345,750 415,750 410,762 340,762"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="340"
							y1="762"
							x2="410"
							y2="762"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 4 */}
						<polygon
							points="365,715 435,715 430,727 360,727"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="360"
							y1="727"
							x2="430"
							y2="727"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 5 */}
						<polygon
							points="385,680 455,680 450,692 380,692"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="380"
							y1="692"
							x2="450"
							y2="692"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 6 */}
						<polygon
							points="405,645 475,645 470,657 400,657"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="400"
							y1="657"
							x2="470"
							y2="657"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 7 */}
						<polygon
							points="425,610 495,610 490,622 420,622"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="420"
							y1="622"
							x2="490"
							y2="622"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 8 */}
						<polygon
							points="445,575 515,575 510,587 440,587"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="440"
							y1="587"
							x2="510"
							y2="587"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>

						{/* Degrau 9 (Chegada Mezanino) */}
						<polygon
							points="465,540 535,540 530,552 460,552"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						<line
							x1="460"
							y1="552"
							x2="530"
							y2="552"
							stroke="var(--warm)"
							strokeWidth="2"
							opacity="0.85"
						/>
					</g>

					{/* Guarda-corpo diagonal contemporâneo e tirantes inclinados */}
					<line
						x1="305"
						y1="785"
						x2="495"
						y2="480"
						stroke="var(--primary)"
						strokeWidth="2"
						opacity="0.8"
					/>

					<polygon
						points="305,785 495,480 495,512 305,820"
						fill="var(--primary)"
						opacity="0.08"
					/>
				</g>
			</g>

			{/* ========================================================================= */}
			{/* CAMADA 3 (PRIMEIRO PLANO: MÓVEIS NÍTIDOS, COORDENADOS E LUZ INTERATIVA) */}
			{/* ========================================================================= */}
			<g>
				{/* --- MEZANINO CENTRAL (Superior Meio): Balcão Integral (x=260..520) com Profundidade 3D, TV, Vasinho de Flor e Micro-ondas --- */}
				<g className="house-layer-furniture">
					{/* Sombra de contato contínua do balcão no piso da laje */}
					<rect
						x="258"
						y="488.5"
						width="264"
						height="3.5"
						rx="1.5"
						fill="var(--background)"
						opacity="0.45"
					/>

					{/* Rodapé estrutural recuado do balcão ao longo de todo o vão */}
					<rect
						x="264"
						y="484"
						width="252"
						height="6"
						fill="var(--popover)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>

					{/* Tampo superior contínuo com perspectiva e profundidade axonométrica */}
					<polygon
						points="260,439 520,439 520,433 264,433"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					{/* Filete de luz/chanfro no bordo frontal do tampo integral */}
					<line
						x1="260"
						y1="439"
						x2="520"
						y2="439"
						stroke="var(--warm)"
						strokeWidth="0.8"
						opacity="0.6"
					/>

					{/* Lateral esquerda chanfrada em perspectiva (profundidade 3D junto ao pilar) */}
					<polygon
						points="260,439 264,433 264,480 260,484"
						fill="var(--popover)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>

					{/* Frente do Balcão contemporâneo ajustado para todo o mezanino */}
					<rect
						x="260"
						y="439"
						width="260"
						height="45"
						rx="1"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="1.2"
					/>

					{/* Divisões modulares da marcenaria planejada (4 módulos proporcionais de 65px) */}
					{/* Módulo 1 (x=260..325): Portas duplas com cava vertical */}
					<line
						x1="325"
						y1="439"
						x2="325"
						y2="484"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<line
						x1="292.5"
						y1="442"
						x2="292.5"
						y2="481"
						stroke="var(--border-subtle)"
						strokeWidth="0.6"
					/>
					<line
						x1="290"
						y1="446"
						x2="290"
						y2="454"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>
					<line
						x1="295"
						y1="446"
						x2="295"
						y2="454"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>

					{/* Módulo 2 (x=325..390): Nicho técnico e gavetão */}
					<line
						x1="390"
						y1="439"
						x2="390"
						y2="484"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					{/* Nicho de equipamentos / receiver */}
					<rect
						x="331"
						y="443"
						width="53"
						height="13"
						rx="1"
						fill="var(--popover)"
						stroke="var(--border-subtle)"
						strokeWidth="0.6"
					/>
					<rect
						x="336"
						y="448"
						width="43"
						height="5.5"
						rx="0.5"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.5"
					/>
					<circle
						cx="373"
						cy="450.5"
						r="0.7"
						className="fill-emerald-400"
						opacity="0.9"
					/>
					{/* Gavetão inferior */}
					<line
						x1="325"
						y1="464"
						x2="390"
						y2="464"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<line
						x1="347"
						y1="473"
						x2="368"
						y2="473"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>

					{/* Módulo 3 (x=390..455): Portas duplas sob o micro-ondas */}
					<line
						x1="455"
						y1="439"
						x2="455"
						y2="484"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<line
						x1="422.5"
						y1="442"
						x2="422.5"
						y2="481"
						stroke="var(--border-subtle)"
						strokeWidth="0.6"
					/>
					<line
						x1="420"
						y1="446"
						x2="420"
						y2="454"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>
					<line
						x1="425"
						y1="446"
						x2="425"
						y2="454"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>

					{/* Módulo 4 (x=455..520): Portas duplas no terminal direito */}
					<line
						x1="487.5"
						y1="442"
						x2="487.5"
						y2="481"
						stroke="var(--border-subtle)"
						strokeWidth="0.6"
					/>
					<line
						x1="485"
						y1="446"
						x2="485"
						y2="454"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>
					<line
						x1="490"
						y1="446"
						x2="490"
						y2="454"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.75"
					/>
				</g>

				<g className="house-layer-items">
					{/* --- SMART TV COM PROFUNDIDADE E PAINEL SMART HOME --- */}
					<g filter="url(#soft-contact-shadow)">
						{/* Base e pedestal da TV no balcão */}
						<polygon
							points="298,438 322,438 320,434 300,434"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<rect
							x="308"
							y="427"
							width="4"
							height="8"
							rx="0.5"
							fill="var(--border)"
						/>

						{/* Moldura da TV com chanfro 3D na borda superior */}
						<polygon
							points="270,377 350,377 348,374 272,374"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						{/* Chassi do display */}
						<rect
							x="270"
							y="377"
							width="80"
							height="50"
							rx="1.5"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1.2"
						/>

						{/* Tela de alta definição com backlight sutil */}
						<rect
							x="273"
							y="380"
							width="74"
							height="44"
							rx="1"
							fill="var(--popover)"
						/>

						{/* Conteúdo da Smart TV: Interface de Dashboard e Mídia */}
						{/* Paisagem ambiente vetorial */}
						<path
							d="M 273 413 Q 290 401 310 411 T 347 409 L 347 424 L 273 424 Z"
							fill="var(--primary)"
							opacity="0.12"
						/>
						<circle cx="328" cy="391" r="5" fill="var(--warm)" opacity="0.35" />

						{/* Widget de status / relógio smart home */}
						<rect
							x="278"
							y="385"
							width="16"
							height="3"
							rx="0.6"
							fill="var(--primary)"
							opacity="0.75"
						/>

						{/* Barras de equalizador de áudio em tempo real */}
						<line
							x1="278"
							y1="419"
							x2="278"
							y2="414"
							stroke="var(--warm)"
							strokeWidth="1"
							opacity="0.9"
						/>
						<line
							x1="281"
							y1="419"
							x2="281"
							y2="411"
							stroke="var(--primary)"
							strokeWidth="1"
							opacity="0.9"
						/>
						<line
							x1="284"
							y1="419"
							x2="284"
							y2="416"
							stroke="var(--warm)"
							strokeWidth="1"
							opacity="0.8"
						/>
						<line
							x1="287"
							y1="419"
							x2="287"
							y2="413"
							stroke="var(--primary)"
							strokeWidth="1"
							opacity="0.9"
						/>
						<line
							x1="290"
							y1="419"
							x2="290"
							y2="417"
							stroke="var(--warm)"
							strokeWidth="1"
							opacity="0.75"
						/>

						{/* Barra de progresso de mídia */}
						<line
							x1="298"
							y1="419"
							x2="341"
							y2="419"
							stroke="var(--surface-highest)"
							strokeWidth="1.2"
						/>
						<line
							x1="298"
							y1="419"
							x2="320"
							y2="419"
							stroke="var(--primary)"
							strokeWidth="1.2"
							opacity="0.9"
						/>

						{/* LED de status da TV */}
						<circle
							cx="346"
							cy="424"
							r="0.8"
							className="fill-emerald-400"
							opacity="0.9"
						/>
					</g>

					{/* --- VASINHO PEQUENO DE FLOR NA BANCADA --- */}
					<g>
						{/* Sombra de contato do vasinho no tampo */}
						<ellipse
							cx="369"
							cy="438.5"
							rx="6.5"
							ry="1.2"
							fill="var(--background)"
							opacity="0.4"
						/>

						{/* Vaso cerâmico elegante */}
						<rect
							x="364"
							y="426"
							width="10"
							height="12"
							rx="2"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<ellipse
							cx="369"
							cy="426"
							rx="4.5"
							ry="1.5"
							fill="var(--surface-highest)"
							stroke="var(--border-subtle)"
							strokeWidth="0.5"
						/>
						<line
							x1="365"
							y1="428.5"
							x2="373"
							y2="428.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Caules verdes delicados */}
						<path
							d="M 369 426 Q 366 420 364 414"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="0.9"
						/>
						<path
							d="M 369 426 Q 369 418 369 411"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="0.9"
						/>
						<path
							d="M 369 426 Q 372 420 374 413"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="0.9"
						/>

						{/* Folhinhas biofílicas */}
						<path
							d="M 367 421 Q 363 421 364 418 Q 366 419 367 421"
							className="fill-emerald-400"
							opacity="0.9"
						/>
						<path
							d="M 370 419 Q 374 419 373 416 Q 371 417 370 419"
							className="fill-emerald-400"
							opacity="0.9"
						/>

						{/* Flores delicadas / botões florais */}
						<circle
							cx="369"
							cy="411"
							r="2.5"
							fill="var(--warm)"
							opacity="0.9"
						/>
						<circle cx="369" cy="411" r="1" fill="var(--primary)" />
						<circle cx="364" cy="414" r="2" fill="var(--warm)" opacity="0.85" />
						<circle cx="364" cy="414" r="0.8" fill="var(--primary)" />
						<circle cx="374" cy="413" r="2" fill="var(--warm)" opacity="0.85" />
						<circle cx="374" cy="413" r="0.8" fill="var(--primary)" />
					</g>

					{/* Smart Speaker / Hub IoT na bancada */}
					<g>
						<rect
							x="384"
							y="427"
							width="8"
							height="10"
							rx="3"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="0.7"
						/>
						<ellipse
							cx="388"
							cy="427.5"
							rx="3"
							ry="1"
							fill="var(--surface-highest)"
						/>
						<ellipse
							cx="388"
							cy="427.5"
							rx="1.8"
							ry="0.5"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="0.7"
							opacity="0.9"
						/>
					</g>

					{/* --- MICRO-ONDAS CONTEMPORÂNEO COM PERSPECTIVA 3D --- */}
					<g>
						{/* Sombra de contato do micro-ondas sobre o tampo */}
						<ellipse
							cx="432"
							cy="436.5"
							rx="27"
							ry="1.5"
							fill="var(--background)"
							opacity="0.35"
						/>

						{/* Pés de apoio do micro-ondas */}
						<rect
							x="408"
							y="435.5"
							width="4"
							height="1.5"
							rx="0.5"
							fill="var(--border)"
						/>
						<rect
							x="451"
							y="435.5"
							width="4"
							height="1.5"
							rx="0.5"
							fill="var(--border)"
						/>

						{/* Tampo superior 3D em perspectiva (combina com o ângulo do balcão) */}
						<polygon
							points="405,402 459,402 463,396 409,396"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>

						{/* Lateral direita 3D em perspectiva (profundidade lateral) */}
						<polygon
							points="459,402 463,396 463,429 459,435"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>

						{/* Gabinete frontal */}
						<rect
							x="405"
							y="402"
							width="54"
							height="33"
							rx="1.5"
							fill="var(--surface-high)"
							stroke="var(--border)"
							strokeWidth="1"
						/>

						{/* Porta de vidro escurecido espelhada */}
						<rect
							x="408"
							y="405"
							width="36"
							height="27"
							rx="1"
							fill="var(--popover)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>

						{/* Luz interior suave visível através da transparência */}
						<rect
							x="410"
							y="407"
							width="32"
							height="23"
							rx="0.5"
							fill="var(--warm)"
							opacity="0.12"
						/>

						{/* Reflexo arquitetônico sutil no vidro */}
						<polygon
							points="417,405 425,405 413,432 408,432"
							fill="var(--primary)"
							opacity="0.04"
						/>

						{/* Puxador vertical em perfil metálico contemporâneo */}
						<rect
							x="440"
							y="408"
							width="1.8"
							height="21"
							rx="0.8"
							fill="var(--warm)"
							opacity="0.9"
						/>

						{/* Painel de comando digital */}
						{/* Display LED do timer */}
						<rect
							x="446"
							y="405"
							width="10"
							height="5.5"
							rx="0.8"
							fill="var(--card)"
						/>
						{/* Dígitos luminosos do relógio digital */}
						<line
							x1="448"
							y1="407.7"
							x2="454"
							y2="407.7"
							stroke="var(--warm)"
							strokeWidth="1.2"
							opacity="0.95"
						/>

						{/* Botão rotativo (dial encoder) */}
						<circle
							cx="451"
							cy="420"
							r="2.6"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						<line
							x1="451"
							y1="418"
							x2="451"
							y2="420.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
						/>

						{/* Teclas capacitivas touch de programas rápidos */}
						<circle
							cx="449"
							cy="428"
							r="0.7"
							fill="var(--primary)"
							opacity="0.7"
						/>
						<circle
							cx="453"
							cy="428"
							r="0.7"
							fill="var(--primary)"
							opacity="0.7"
						/>
					</g>

					{/* Acessórios na ponta direita da bancada (livros e caneca de café) */}
					<g>
						<rect
							x="480"
							y="434"
							width="22"
							height="4"
							rx="0.6"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="0.5"
						/>
						<rect
							x="482"
							y="430"
							width="18"
							height="4"
							rx="0.6"
							fill="var(--warm)"
							opacity="0.85"
						/>
						<rect
							x="488"
							y="424"
							width="6"
							height="6"
							rx="1"
							fill="var(--primary)"
							opacity="0.8"
							stroke="var(--border)"
							strokeWidth="0.4"
						/>
						<path
							d="M 494 425 Q 496 427 494 429"
							fill="none"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
					</g>
				</g>

				{/* --- QUARTO MASTER (Superior Esquerdo) --- */}
				{/* Quadro de Arte Contemporânea acima da cabeceira */}
				<g className="house-layer-architecture">
					<g filter="url(#soft-contact-shadow)">
						{/* Moldura externa refinada */}
						<rect
							x="88"
							y="295"
							width="84"
							height="66"
							rx="2"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1.2"
						/>
						{/* Fundo do quadro / tela em contraste suave */}
						<rect
							x="93"
							y="300"
							width="74"
							height="56"
							rx="1"
							fill="var(--popover)"
						/>
						{/* Arte minimalista com formas orgânicas e sol/lua estilizado */}
						<circle
							cx="130"
							cy="320"
							r="12"
							fill="var(--warm)"
							opacity="0.55"
						/>
						<path
							d="M97 344 Q115 324 135 344 T163 344"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="1.2"
							opacity="0.8"
						/>
						<path
							d="M102 348 Q120 334 140 348 T163 348"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="1"
							opacity="0.5"
						/>
					</g>
				</g>

				{/* Cama contemporânea com cabeceira estofada, travesseiros, edredom e mesa de cabeceira */}
				<g className="house-layer-furniture">
					{/* Sombra de contato da cama no piso */}
					<rect
						x="70"
						y="488"
						width="122"
						height="3"
						rx="1.5"
						fill="var(--background)"
						opacity="0.4"
					/>

					{/* Cabeceira estofada elegante */}
					<rect
						x="68"
						y="390"
						width="126"
						height="52"
						rx="2.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="1.2"
					/>
					{/* Costuras verticais decorativas da cabeceira */}
					<line
						x1="110"
						y1="390"
						x2="110"
						y2="442"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>
					<line
						x1="152"
						y1="390"
						x2="152"
						y2="442"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>

					{/* Estrutura / estrado da cama com pés minimalistas */}
					<rect
						x="70"
						y="472"
						width="122"
						height="11"
						rx="1.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					<line
						x1="76"
						y1="483"
						x2="76"
						y2="490"
						stroke="var(--border)"
						strokeWidth="2"
					/>
					<line
						x1="186"
						y1="483"
						x2="186"
						y2="490"
						stroke="var(--border)"
						strokeWidth="2"
					/>

					{/* Colchão contemporâneo com cantos arredondados */}
					<rect
						x="72"
						y="442"
						width="118"
						height="30"
						rx="2.5"
						fill="var(--surface-high)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>

					{/* Travesseiros estruturados (par traseiro) */}
					<rect
						x="76"
						y="418"
						width="48"
						height="22"
						rx="4"
						fill="var(--surface-container)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>
					<rect
						x="132"
						y="418"
						width="48"
						height="22"
						rx="4"
						fill="var(--surface-container)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>

					{/* Travesseiros macios acolhedores (par frontal) */}
					<rect
						x="80"
						y="428"
						width="44"
						height="18"
						rx="3.5"
						fill="var(--primary)"
						opacity="0.9"
						stroke="var(--border)"
						strokeWidth="0.7"
					/>
					<rect
						x="136"
						y="428"
						width="44"
						height="18"
						rx="3.5"
						fill="var(--primary)"
						opacity="0.9"
						stroke="var(--border)"
						strokeWidth="0.7"
					/>

					{/* Almofada decorativa central em tom contrastante */}
					<rect
						x="115"
						y="433"
						width="30"
						height="13"
						rx="2.5"
						fill="var(--warm)"
						opacity="0.9"
						stroke="var(--border-subtle)"
						strokeWidth="0.6"
					/>

					{/* Edredom cobrindo a base do leito */}
					<rect
						x="71"
						y="448"
						width="120"
						height="26"
						rx="2"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					{/* Vira superior do lençol / edredom dobrado */}
					<rect
						x="71"
						y="445"
						width="120"
						height="6"
						rx="1"
						fill="var(--warm)"
						opacity="0.85"
					/>
					{/* Manta peseira decorativa aos pés da cama */}
					<rect
						x="156"
						y="448"
						width="35"
						height="26"
						rx="1"
						fill="var(--surface-container)"
						opacity="0.9"
						stroke="var(--border-subtle)"
						strokeWidth="0.6"
					/>

					{/* Mesa de cabeceira lateral contemporânea sob a luminária */}
					<rect
						x="196"
						y="460"
						width="26"
						height="24"
						rx="2"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					<line
						x1="202"
						y1="472"
						x2="216"
						y2="472"
						stroke="var(--border-subtle)"
						strokeWidth="1"
					/>
					<line
						x1="206"
						y1="471"
						x2="212"
						y2="471"
						stroke="var(--warm)"
						strokeWidth="1.2"
					/>
					{/* Livro na mesa de cabeceira */}
					<rect
						x="201"
						y="456"
						width="12"
						height="4"
						rx="0.5"
						fill="var(--warm)"
						opacity="0.85"
					/>
				</g>

				{/* --- LUZ INTERATIVA 1: PENDENTE DO QUARTO MASTER (EASTER EGG) --- */}
				<g className="house-layer-lights">
					{/* Cone de iluminação reativo ao clique */}
					<polygon
						points="190,285 130,490 250,490"
						fill="url(#interactive-bedroom-cone)"
						className="transition-light"
						style={{ opacity: isBedroomLampOn ? 1 : 0 }}
					/>

					{/* Fio e Cúpula do pendente reposicionado mais para cima */}
					<line
						x1="190"
						y1="205"
						x2="190"
						y2="277"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>
					<polygon
						points="182,285 198,285 190,277"
						fill="var(--primary)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>

					{/* Hotspot de clique do Pendente do Quarto (tabIndex=-1, não distrai tab do login) */}
					{/* biome-ignore lint/a11y/useSemanticElements: SVG group used as interactive vector hotspot */}
					<g
						role="button"
						tabIndex={-1}
						aria-label="Alternar luz do quarto (decorativo)"
						onClick={toggleBedroomLamp}
						className="cursor-pointer group outline-none focus:outline-none focus-visible:outline-none select-none"
					>
						{/* Área de toque expandida invisível */}
						<circle cx="190" cy="285" r="22" fill="transparent" />
						{/* Lâmpada física com indicação de estado ligado/desligado */}
						<circle
							cx="190"
							cy="287"
							r="4"
							fill={isBedroomLampOn ? "var(--warm)" : "var(--border)"}
							className="transition-light"
						/>
						<circle
							cx="190"
							cy="287"
							r="10"
							fill="var(--warm)"
							className="transition-light"
							style={{ opacity: isBedroomLampOn ? 0.35 : 0 }}
						/>
					</g>
				</g>

				{/* --- HOME OFFICE / ESTÚDIO (Superior Direito x=535 a x=776) --- */}
				{/* --- LUZ INTERATIVA 3: SPOT DE TETO DO HOME OFFICE (EASTER EGG) --- */}
				<g className="house-layer-lights">
					{/* Cone de iluminação arquitetônica sobre a área de trabalho */}
					<polygon
						points="661,221.5 671,221.5 730,490 602,490"
						fill="url(#interactive-office-cone)"
						className="transition-light"
						style={{ opacity: isOfficeLampOn ? 1 : 0 }}
					/>
					{/* Poça de luz na bancada de trabalho */}
					<ellipse
						cx="666"
						cy="425"
						rx="28"
						ry="3.5"
						fill="var(--warm)"
						className="transition-light"
						style={{ opacity: isOfficeLampOn ? 0.18 : 0 }}
					/>

					{/* Hotspot de clique e Luminária spot contemporânea de sobrepor (grudada no teto a y=205, alinhada a x=666) */}
					{/* biome-ignore lint/a11y/useSemanticElements: SVG group used as interactive vector hotspot */}
					<g
						role="button"
						tabIndex={-1}
						aria-label="Alternar luz do escritório (decorativo)"
						onClick={toggleOfficeLamp}
						className="cursor-pointer group outline-none focus:outline-none focus-visible:outline-none select-none"
					>
						{/* Área de toque expandida invisível centrada geometricamente na luminária (x=666, y=213.5) */}
						<circle
							cx="666"
							cy="213.5"
							r="18"
							fill="transparent"
							pointerEvents="all"
						/>

						{/* Base de fixação rente à laje de teto */}
						<rect
							x="658"
							y="205"
							width="16"
							height="2.5"
							rx="0.6"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.7"
						/>
						{/* Corpo cilíndrico do spot de sobrepor */}
						<rect
							x="659"
							y="207.5"
							width="14"
							height="14"
							rx="1.5"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						{/* Friso técnico em acabamento warm */}
						<line
							x1="659"
							y1="211"
							x2="673"
							y2="211"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>
						{/* Baffle / difusor inferior recuado */}
						<rect
							x="660"
							y="219"
							width="12"
							height="2.5"
							rx="0.8"
							fill="var(--popover)"
							stroke="var(--border-subtle)"
							strokeWidth="0.5"
						/>

						{/* Lente emissora LED com indicação de estado ligado/desligado */}
						<ellipse
							cx="666"
							cy="221.5"
							rx="5"
							ry="1.6"
							fill={isOfficeLampOn ? "var(--warm)" : "var(--border)"}
							className="transition-light"
						/>
						{/* Brilho imediato quando acesa */}
						<ellipse
							cx="666"
							cy="221.5"
							rx="9"
							ry="2.8"
							fill="var(--warm)"
							className="transition-light pointer-events-none"
							style={{ opacity: isOfficeLampOn ? 0.4 : 0 }}
						/>
						{/* Halo atmosférico difuso (pointer-events-none para não desviar o clique para baixo) */}
						<circle
							cx="666"
							cy="222"
							r="16"
							fill="var(--warm)"
							className="transition-light pointer-events-none"
							style={{ opacity: isOfficeLampOn ? 0.15 : 0 }}
						/>
					</g>
				</g>

				{/* 5. Hardware de trabalho: CPU gamer e Cadeira ergonômica */}
				<g className="house-layer-items">
					{/* CPU Workstation / Gabinete Gamer com Cabos no Lado Esquerdo da mesa (deslocado para a direita) */}
					<g>
						{/* Sombra de contato do gabinete no piso */}
						<ellipse
							cx="580"
							cy="489.5"
							rx="15"
							ry="1.5"
							fill="var(--background)"
							opacity="0.45"
						/>

						{/* Pés de sustentação do gabinete */}
						<rect
							x="568"
							y="488"
							width="4"
							height="2"
							rx="0.5"
							fill="var(--border)"
						/>
						<rect
							x="586"
							y="488"
							width="4"
							height="2"
							rx="0.5"
							fill="var(--border)"
						/>

						{/* Chassi principal da CPU / Gabinete */}
						<rect
							x="566"
							y="448"
							width="26"
							height="40"
							rx="1.5"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1"
						/>

						{/* Chanfro superior em perspectiva */}
						<line
							x1="566"
							y1="448"
							x2="592"
							y2="448"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.6"
						/>

						{/* Painel lateral de vidro escurecido com hardware visível */}
						<rect
							x="568"
							y="454"
							width="22"
							height="32"
							rx="1"
							fill="var(--popover)"
							stroke="var(--border-subtle)"
							strokeWidth="0.5"
						/>
						{/* Placa de vídeo (GPU) com iluminação estética interna */}
						<line
							x1="570"
							y1="467"
							x2="586"
							y2="467"
							stroke="var(--warm)"
							strokeWidth="1.2"
							opacity="0.85"
						/>
						<line
							x1="570"
							y1="470"
							x2="583"
							y2="470"
							stroke="var(--primary)"
							strokeWidth="0.8"
							opacity="0.75"
						/>

						{/* Fendas frontais de ventilação / intake */}
						<line
							x1="569"
							y1="476"
							x2="589"
							y2="476"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<line
							x1="569"
							y1="480"
							x2="589"
							y2="480"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						<line
							x1="569"
							y1="484"
							x2="589"
							y2="484"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>

						{/* Botão Power com LED de status e portas I/O superiores */}
						<circle
							cx="579"
							cy="451"
							r="1"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.4"
						/>
						<circle
							cx="579"
							cy="451"
							r="0.5"
							className="fill-emerald-400"
							opacity="0.95"
						/>
						<rect
							x="583"
							y="450.3"
							width="3"
							height="1.4"
							rx="0.3"
							fill="var(--primary)"
							opacity="0.6"
						/>

						{/* Chicote de cabos organizados sob a mesa (Cable management saindo da CPU) */}
						{/* Cabo principal trançado (Main power/loom) subindo até a calha da mesa */}
						<path
							d="M 592 454 Q 598 445 608 437"
							fill="none"
							stroke="var(--surface-highest)"
							strokeWidth="1.8"
							strokeLinecap="round"
						/>
						<path
							d="M 592 454 Q 598 445 608 437"
							fill="none"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.6"
						/>
						{/* Cabo DisplayPort conectando ao monitor */}
						<path
							d="M 592 460 Q 602 450 620 437"
							fill="none"
							stroke="var(--border)"
							strokeWidth="1.2"
							strokeLinecap="round"
						/>
						{/* Cabos USB e periféricos com curvatura fluida */}
						<path
							d="M 592 466 Q 608 458 634 437"
							fill="none"
							stroke="var(--border)"
							strokeWidth="1"
							strokeLinecap="round"
							opacity="0.8"
						/>
						{/* Cabo de alimentação para tomada no rodapé esquerdo */}
						<path
							d="M 568 482 Q 562 488 558 489"
							fill="none"
							stroke="var(--border)"
							strokeWidth="1.2"
							strokeLinecap="round"
						/>
						{/* Presilhas organizadoras de velcro nos cabos */}
						<rect
							x="599"
							y="445"
							width="2"
							height="3"
							rx="0.5"
							fill="var(--warm)"
							opacity="0.85"
						/>
						<rect
							x="612"
							y="440"
							width="2"
							height="3"
							rx="0.5"
							fill="var(--warm)"
							opacity="0.85"
						/>
					</g>

					{/* Cadeira Executiva de Design Contemporâneo em Perfil (lado direito, deslocada para a direita) */}
					<g filter="url(#soft-contact-shadow)">
						{/* Sombra de contato da cadeira no piso */}
						<ellipse
							cx="644"
							cy="489.5"
							rx="22"
							ry="2"
							fill="var(--background)"
							opacity="0.45"
						/>

						{/* Base estrela com rodízios de alta precisão (em perfil) */}
						{/* Rodízio dianteiro (esquerdo) */}
						<circle cx="624" cy="488" r="2.2" fill="var(--border)" />
						<circle cx="624" cy="488" r="1" fill="var(--primary)" />
						{/* Rodízio traseiro (direito) */}
						<circle cx="662" cy="488" r="2.2" fill="var(--border)" />
						<circle cx="662" cy="488" r="1" fill="var(--primary)" />
						{/* Rodízio central (em perspectiva) */}
						<circle cx="644" cy="489" r="1.8" fill="var(--surface-highest)" />
						{/* Hastes arqueadas da base aranha */}
						<path
							d="M 624 488 Q 634 483 644 482 Q 654 483 662 488"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="2"
							strokeLinecap="round"
							opacity="0.9"
						/>
						<line
							x1="644"
							y1="482"
							x2="644"
							y2="489"
							stroke="var(--border)"
							strokeWidth="1.8"
						/>

						{/* Pistão pneumático a gás e coluna de elevação */}
						<rect
							x="642"
							y="466"
							width="4"
							height="16"
							rx="0.8"
							fill="var(--border)"
						/>
						<rect
							x="641"
							y="471"
							width="6"
							height="7"
							rx="0.5"
							fill="var(--surface-container)"
							stroke="var(--border-subtle)"
							strokeWidth="0.5"
						/>
						{/* Mecanismo de inclinação / berço sob o assento */}
						<polygon
							points="635,463 653,463 651,467 637,467"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.8"
						/>
						{/* Alavanca pneumática com manípulo em tom warm */}
						<line
							x1="638"
							y1="465.5"
							x2="631"
							y2="467.5"
							stroke="var(--warm)"
							strokeWidth="1"
							strokeLinecap="round"
						/>
						<circle cx="630.5" cy="467.7" r="0.8" fill="var(--warm)" />

						{/* Concha escultural contínua (estilo Eames Soft Pad / Vitra Management Chair) */}
						{/* Estrutura metálica contínua do perfil da cadeira */}
						<path
							d="M 660 406 Q 656 424 654 442 Q 655 455 650 460 Q 640 461 629 461 Q 626 463 628 466 Q 642 466 652 462"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="1.2"
						/>
						{/* Filete de borda cromado/metálico ao longo da concha */}
						<path
							d="M 660 406 Q 656 424 654 442 Q 655 455 650 460 Q 640 461 629 461 Q 626 463 628 466"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Almofadas gomo acolchoadas (Horizontal Channel Cushions) */}
						{/* Gomo superior do encosto */}
						<rect
							x="652"
							y="408"
							width="7"
							height="9"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>
						<line
							x1="653"
							y1="412.5"
							x2="657"
							y2="412.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Gomo médio-superior */}
						<rect
							x="650"
							y="419"
							width="7"
							height="9"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>
						<line
							x1="651"
							y1="423.5"
							x2="655"
							y2="423.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Gomo lombar anatômico */}
						<rect
							x="649"
							y="430"
							width="7"
							height="9"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>
						<line
							x1="650"
							y1="434.5"
							x2="654"
							y2="434.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Gomo inferior do encosto */}
						<rect
							x="649"
							y="441"
							width="7"
							height="9"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>
						<line
							x1="650"
							y1="445.5"
							x2="654"
							y2="445.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Gomo da junção / assento traseiro */}
						<rect
							x="641"
							y="455"
							width="10"
							height="6.5"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>
						<line
							x1="646"
							y1="456"
							x2="646"
							y2="460.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Gomo frontal do assento (borda waterfall) */}
						<rect
							x="628"
							y="457"
							width="11"
							height="6.5"
							rx="2"
							fill="var(--surface-high)"
							stroke="var(--border-subtle)"
							strokeWidth="0.6"
						/>
						<line
							x1="633.5"
							y1="458"
							x2="633.5"
							y2="462.5"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.8"
						/>

						{/* Braço escultural em loop (Classic Triangle/Loop Designer Armrest) */}
						<path
							d="M 651 435 L 652 446 L 634 446 Q 632 446 634 451 L 642 461"
							fill="none"
							stroke="var(--primary)"
							strokeWidth="1.6"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						{/* Almofada do braço em couro macio */}
						<rect
							x="633"
							y="444.5"
							width="19"
							height="2.5"
							rx="1.2"
							fill="var(--warm)"
							stroke="var(--border)"
							strokeWidth="0.5"
						/>
					</g>
				</g>

				{/* Marcenaria: Mesa de trabalho do Home Office */}
				<g className="house-layer-furniture">
					<rect
						x="545"
						y="425"
						width="150"
						height="12"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1"
						rx="1.5"
						filter="url(#soft-contact-shadow)"
					/>
					{/* Pés estruturais da mesa de trabalho */}
					<line
						x1="552"
						y1="437"
						x2="552"
						y2="490"
						stroke="var(--border)"
						strokeWidth="1.8"
					/>
					<line
						x1="688"
						y1="437"
						x2="688"
						y2="490"
						stroke="var(--border)"
						strokeWidth="1.8"
					/>
				</g>

				{/* Periféricos, monitor ultrawide e acessórios do Home Office */}
				<g className="house-layer-items">
					{/* Monitor ultrawide com tela iluminada, base, webcam e screenbar */}
					{/* Barra de luz LED (Screenbar) sobre o monitor */}
					<rect
						x="595"
						y="371"
						width="50"
						height="2.5"
						rx="0.5"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.5"
					/>
					<line
						x1="597"
						y1="373.5"
						x2="643"
						y2="373.5"
						stroke="var(--warm)"
						strokeWidth="0.8"
						opacity="0.85"
					/>
					{/* Webcam contemporânea */}
					<rect
						x="616"
						y="367"
						width="8"
						height="4"
						rx="1"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="0.6"
					/>
					<circle cx="620" cy="369" r="1.2" fill="var(--card)" />
					<circle
						cx="620"
						cy="369"
						r="0.6"
						className="fill-emerald-400"
						opacity="0.85"
					/>

					{/* Gabinete do Monitor */}
					<rect
						x="585"
						y="375"
						width="70"
						height="38"
						fill="var(--popover)"
						stroke="var(--border)"
						strokeWidth="1"
						rx="2"
					/>
					{/* Display ultrawide */}
					<rect
						x="588"
						y="378"
						width="64"
						height="32"
						fill="var(--primary)"
						opacity="0.3"
						rx="1"
					/>
					<rect x="617" y="413" width="6" height="12" fill="var(--border)" />

					{/* Planta decorativa em vaso cerâmico na ponta esquerda da mesa */}
					<g>
						{/* Vasinho cerâmico */}
						<rect
							x="550"
							y="413"
							width="12"
							height="12"
							rx="1.5"
							fill="var(--surface-container)"
							stroke="var(--border)"
							strokeWidth="0.7"
						/>
						<line
							x1="550"
							y1="415"
							x2="562"
							y2="415"
							stroke="var(--warm)"
							strokeWidth="0.8"
							opacity="0.75"
						/>
						{/* Folhagens biofílicas (suculenta de mesa) */}
						<path
							d="M556 413 Q551 403 549 397 Q556 401 556 413"
							className="fill-emerald-400"
							opacity="0.9"
						/>
						<path
							d="M556 413 Q561 403 564 398 Q558 404 556 413"
							className="fill-emerald-400"
							opacity="0.85"
						/>
						<path
							d="M556 413 Q556 401 556 394 Q559 403 556 413"
							className="fill-emerald-400"
							opacity="0.95"
						/>
					</g>

					{/* Alto-falantes estéreo / caixas de som de mesa (speakers) */}
					{/* Alto-falante esquerdo */}
					<rect
						x="569"
						y="402"
						width="10"
						height="23"
						rx="1.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<circle
						cx="574"
						cy="409"
						r="2.8"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.6"
					/>
					<circle
						cx="574"
						cy="418"
						r="1.5"
						fill="var(--primary)"
						opacity="0.7"
					/>

					{/* Alto-falante direito */}
					<rect
						x="661"
						y="402"
						width="10"
						height="23"
						rx="1.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<circle
						cx="666"
						cy="409"
						r="2.8"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.6"
					/>
					<circle
						cx="666"
						cy="418"
						r="1.5"
						fill="var(--primary)"
						opacity="0.7"
					/>

					{/* Mousepad amplo (Desk mat) */}
					<rect
						x="588"
						y="420"
						width="62"
						height="6"
						rx="1"
						fill="var(--popover)"
						stroke="var(--border)"
						strokeWidth="0.5"
					/>
					{/* Teclado mecânico compacto sobre o mousepad */}
					<rect
						x="592"
						y="421"
						width="34"
						height="3.5"
						rx="0.6"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.5"
					/>
					<line
						x1="595"
						y1="422.5"
						x2="623"
						y2="422.5"
						stroke="var(--primary)"
						strokeWidth="0.6"
						opacity="0.5"
					/>

					{/* Mouse ergonômico óptico ao lado do teclado */}
					<rect
						x="636"
						y="420.5"
						width="7"
						height="4.5"
						rx="1.8"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="0.6"
					/>
					<line
						x1="639.5"
						y1="420.5"
						x2="639.5"
						y2="422.5"
						stroke="var(--warm)"
						strokeWidth="0.8"
					/>

					{/* Headset em suporte vertical na ponta direita da mesa */}
					<g>
						{/* Base circular do suporte */}
						<ellipse
							cx="682"
							cy="424"
							rx="6"
							ry="1.5"
							fill="var(--surface-highest)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						{/* Haste do suporte */}
						<line
							x1="682"
							y1="424"
							x2="682"
							y2="397"
							stroke="var(--border)"
							strokeWidth="1.4"
						/>
						<line
							x1="677"
							y1="397"
							x2="687"
							y2="397"
							stroke="var(--border)"
							strokeWidth="1.4"
							strokeLinecap="round"
						/>
						{/* Arco acolchoado do headset */}
						<path
							d="M676 401 C676 393 688 393 688 401"
							fill="none"
							stroke="var(--surface-highest)"
							strokeWidth="2.5"
						/>
						{/* Conchas circum-aurais (earcups) */}
						<rect
							x="674"
							y="400"
							width="4"
							height="8"
							rx="1.5"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						<rect
							x="686"
							y="400"
							width="4"
							height="8"
							rx="1.5"
							fill="var(--popover)"
							stroke="var(--border)"
							strokeWidth="0.6"
						/>
						{/* LED de status do fone */}
						<circle
							cx="688"
							cy="404"
							r="0.8"
							className="fill-emerald-400"
							opacity="0.9"
						/>
					</g>
				</g>

				{/* Armário vertical contemporâneo (mesmo traçado e linguagem visual da geladeira) */}
				<g className="house-layer-furniture" filter="url(#soft-contact-shadow)">
					{/* Gabinete principal do armário vertical */}
					<rect
						x="704"
						y="220"
						width="72"
						height="270"
						rx="3"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>

					{/* Divisão vertical das portas principais */}
					<line
						x1="740"
						y1="220"
						x2="740"
						y2="420"
						stroke="var(--border)"
						strokeWidth="1.2"
					/>

					{/* Divisão horizontal da gaveta intermediária */}
					<line
						x1="704"
						y1="420"
						x2="776"
						y2="420"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>

					{/* Divisão horizontal da gaveta inferior */}
					<line
						x1="704"
						y1="452"
						x2="776"
						y2="452"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>

					{/* Puxadores embutidos verticais das portas */}
					<line
						x1="737"
						y1="320"
						x2="737"
						y2="400"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.8"
						strokeLinecap="round"
					/>
					<line
						x1="743"
						y1="320"
						x2="743"
						y2="400"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.8"
						strokeLinecap="round"
					/>

					{/* Puxador horizontal da gaveta intermediária */}
					<line
						x1="722"
						y1="436"
						x2="758"
						y2="436"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.7"
						strokeLinecap="round"
					/>

					{/* Puxador horizontal da gaveta inferior */}
					<line
						x1="722"
						y1="468"
						x2="758"
						y2="468"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.7"
						strokeLinecap="round"
					/>

					{/* Rodapé / base inferior idêntica à da geladeira */}
					<rect
						x="707"
						y="484"
						width="66"
						height="6"
						rx="1"
						fill="var(--surface-highest)"
					/>
				</g>

				{/* --- LUZ INTERATIVA 2: LUMINÁRIA ARCO DO LIVING (EASTER EGG) --- */}
				<g className="house-layer-lights">
					{/* Efeito de luz logo abaixo da lâmpada quando ligada */}
					<g
						className="transition-light"
						style={{ opacity: isLivingLampOn ? 1 : 0 }}
					>
						{/* Feixe cônico de luz descendo diretamente sob a cúpula */}
						<polygon
							points="204,655 216,655 258,840 162,840"
							fill="url(#interactive-arc-lamp-cone)"
						/>
						{/* Poça de luz no piso centrada diretamente abaixo da lâmpada */}
						<ellipse
							cx="210"
							cy="838"
							rx="48"
							ry="8"
							fill="var(--warm)"
							opacity="0.25"
						/>
					</g>
				</g>

				{/* Vaso de Planta Escultural sob a luz da luminária arco (proporção compacta) */}
				<g className="house-layer-items" filter="url(#soft-contact-shadow)">
					{/* Sombra de contato do vaso no piso */}
					<ellipse
						cx="210"
						cy="840"
						rx="17"
						ry="3"
						fill="var(--background)"
						opacity="0.45"
					/>
					{/* Vaso cônico contemporâneo em cerâmica nobre */}
					<polygon
						points="199,840 221,840 225,798 195,798"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1.1"
					/>
					{/* Borda superior com friso metálico */}
					<rect
						x="193"
						y="795"
						width="34"
						height="3.5"
						rx="0.8"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<line
						x1="195"
						y1="797"
						x2="225"
						y2="797"
						stroke="var(--warm)"
						strokeWidth="0.8"
						opacity="0.75"
					/>

					{/* Caules esculturais */}
					<path
						d="M210 795 Q210 762 208 738"
						stroke="var(--primary)"
						strokeWidth="1.4"
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M210 780 Q200 766 190 754"
						stroke="var(--primary)"
						strokeWidth="1.1"
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M209 772 Q220 760 228 748"
						stroke="var(--primary)"
						strokeWidth="1.1"
						fill="none"
						strokeLinecap="round"
					/>

					{/* Folhagens biofílicas banhadas pela luz da luminária */}
					<path
						d="M208 738 C200 724 216 718 210 706 C204 718 218 724 208 738 Z"
						className="fill-emerald-400"
						opacity="0.95"
					/>
					<path
						d="M198 752 C184 738 192 726 184 720 C179 732 192 743 198 752 Z"
						className="fill-emerald-400"
						opacity="0.8"
					/>
					<path
						d="M220 754 C234 740 228 728 236 722 C240 734 228 745 220 754 Z"
						className="fill-emerald-400"
						opacity="0.85"
					/>
					<path
						d="M204 768 C189 759 190 748 182 745 C181 756 195 767 204 768 Z"
						className="fill-emerald-400"
						opacity="0.75"
					/>
					<path
						d="M214 772 C228 763 226 750 236 748 C234 760 223 770 214 772 Z"
						className="fill-emerald-400"
						opacity="0.85"
					/>
					<path
						d="M210 784 C198 780 202 771 193 768 C195 778 205 785 210 784 Z"
						className="fill-emerald-400"
						opacity="0.7"
					/>
					<path
						d="M211 786 C223 782 219 773 227 770 C225 780 215 787 211 786 Z"
						className="fill-emerald-400"
						opacity="0.75"
					/>
				</g>

				{/* Estrutura física e cúpula da luminária arco */}
				<g className="house-layer-lights">
					{/* Base pesada de apoio da luminária arco no piso perto da escada */}
					<ellipse
						cx="305"
						cy="840"
						rx="12"
						ry="3"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>

					{/* Haste metálica curvada do Arco (subindo perto da escada e curvando para a esquerda) */}
					<path
						d="M305 840 C305 615 210 605 210 655"
						stroke="var(--border)"
						strokeWidth="2.5"
						fill="none"
						strokeLinecap="round"
					/>

					{/* Hotspot de clique da Luminária Arco (tabIndex=-1, não distrai formulário) */}
					{/* biome-ignore lint/a11y/useSemanticElements: SVG group used as interactive vector hotspot */}
					<g
						role="button"
						tabIndex={-1}
						aria-label="Alternar luz da sala (decorativo)"
						onClick={toggleLivingLamp}
						className="cursor-pointer group outline-none focus:outline-none focus-visible:outline-none select-none"
					>
						{/* Área de toque expandida invisível */}
						<circle cx="210" cy="655" r="26" fill="transparent" />
						{/* Cúpula física */}
						<path
							d="M200 655 C200 648 220 648 220 655 Z"
							fill="var(--primary)"
							stroke="var(--border)"
							strokeWidth="1"
						/>
						{/* Ponto de luz interativo */}
						<circle
							cx="210"
							cy="658"
							r="4"
							fill={isLivingLampOn ? "var(--warm)" : "var(--border)"}
							className="transition-light"
						/>
						{/* Glow suave ao redor da lâmpada */}
						<circle
							cx="210"
							cy="658"
							r="12"
							fill="var(--warm)"
							className="transition-light"
							style={{ opacity: isLivingLampOn ? 0.45 : 0 }}
						/>
						<circle
							cx="210"
							cy="658"
							r="24"
							fill="var(--warm)"
							className="transition-light"
							style={{ opacity: isLivingLampOn ? 0.15 : 0 }}
						/>
					</g>
				</g>

				{/* --- GELADEIRA SMART FRENCH-DOOR SOB A ESCADA --- */}
				<g className="house-layer-furniture" filter="url(#soft-contact-shadow)">
					{/* Sombra de base da geladeira no piso */}
					<ellipse
						cx="474"
						cy="840"
						rx="36"
						ry="3"
						fill="var(--background)"
						opacity="0.5"
					/>
					{/* Gabinete principal em aço escovado nobre */}
					<rect
						x="440"
						y="640"
						width="68"
						height="200"
						rx="3"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>
					{/* Divisão vertical das portas superiores (French door) */}
					<line
						x1="474"
						y1="640"
						x2="474"
						y2="762"
						stroke="var(--border)"
						strokeWidth="1.2"
					/>
					{/* Divisão horizontal do gavetão freezer inferior */}
					<line
						x1="440"
						y1="762"
						x2="508"
						y2="762"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>

					{/* Puxadores embutidos verticais (portas superiores) */}
					<line
						x1="471"
						y1="685"
						x2="471"
						y2="745"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.8"
						strokeLinecap="round"
					/>
					<line
						x1="477"
						y1="685"
						x2="477"
						y2="745"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.8"
						strokeLinecap="round"
					/>
					{/* Puxador horizontal do freezer */}
					<line
						x1="456"
						y1="772"
						x2="492"
						y2="772"
						stroke="var(--primary)"
						strokeWidth="1.6"
						opacity="0.7"
						strokeLinecap="round"
					/>

					{/* Display Touchscreen Smart Hub na porta esquerda */}
					<rect
						x="447"
						y="665"
						width="20"
						height="34"
						rx="2"
						fill="var(--popover)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<rect
						x="449"
						y="667"
						width="16"
						height="30"
						rx="1"
						fill="var(--card)"
					/>
					{/* Widget UI inteligente (relógio / clima e indicador LED) */}
					<line
						x1="452"
						y1="673"
						x2="462"
						y2="673"
						stroke="var(--warm)"
						strokeWidth="1"
						opacity="0.9"
					/>
					<circle
						cx="457"
						cy="682"
						r="2"
						className="fill-emerald-400"
						opacity="0.85"
					/>
					<line
						x1="452"
						y1="690"
						x2="462"
						y2="690"
						stroke="var(--primary)"
						strokeWidth="0.8"
						opacity="0.6"
					/>

					{/* Rodapé / grade de ventilação inferior */}
					<rect
						x="443"
						y="834"
						width="62"
						height="6"
						rx="1"
						fill="var(--surface-highest)"
					/>
				</g>

				{/* --- COZINHA GOURMET, ILHA & JARDIM DE INVERNO (Térreo Direita x=530 a x=780) --- */}
				{/* Ilha de cozinha moderna com pedra escura */}
				<g className="house-layer-furniture">
					<rect
						x="540"
						y="740"
						width="140"
						height="70"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1.5"
						rx="3"
						filter="url(#soft-contact-shadow)"
					/>
					<rect
						x="535"
						y="734"
						width="150"
						height="9"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1"
						rx="1.5"
					/>
				</g>

				{/* Potes de mantimentos, fruteira e comidinhas sobre a bancada */}
				<g className="house-layer-items">
					{/* Potes herméticos com tampa em madeira */}
					<rect
						x="546"
						y="712"
						width="11"
						height="22"
						rx="1.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<rect
						x="545"
						y="709"
						width="13"
						height="3.5"
						rx="0.8"
						fill="var(--warm)"
						opacity="0.9"
					/>
					<rect
						x="560"
						y="718"
						width="10"
						height="16"
						rx="1.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<rect
						x="559"
						y="715"
						width="12"
						height="3.5"
						rx="0.8"
						fill="var(--warm)"
						opacity="0.9"
					/>

					{/* Fruteira / Bowl cerâmico com frutas frescas */}
					<path
						d="M582 734 C582 724 610 724 610 734 Z"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					<circle cx="591" cy="723" r="4.5" fill="var(--warm)" opacity="0.9" />
					<circle
						cx="601"
						cy="724"
						r="4.5"
						className="fill-emerald-400"
						opacity="0.85"
					/>
					<circle cx="596" cy="717" r="4" fill="var(--warm)" opacity="0.75" />

					{/* Tábua de corte com pão artesanal */}
					<rect
						x="620"
						y="731"
						width="24"
						height="3"
						rx="1"
						fill="var(--warm)"
						opacity="0.85"
					/>
					<path
						d="M624 731 C624 723 638 723 638 731 Z"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>

					{/* Jarra de azeite e copo */}
					<rect
						x="654"
						y="710"
						width="9"
						height="24"
						rx="1.5"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="0.8"
					/>
					<rect
						x="656.5"
						y="705"
						width="4"
						height="5"
						rx="0.8"
						fill="var(--warm)"
						opacity="0.9"
					/>
					<rect
						x="667"
						y="722"
						width="7"
						height="12"
						rx="1"
						fill="var(--surface-high)"
						stroke="var(--border)"
						strokeWidth="0.7"
					/>
				</g>

				{/* Balcão / Armário Aéreo de Cozinha suspenso (corpo amadeirado, 4 portas reflecta/grafite e perfil inferior) */}
				<g className="house-layer-furniture" filter="url(#soft-contact-shadow)">
					{/* Caixa estrutural do armário ajustada mais para a direita e mais para baixo */}
					<rect
						x="579"
						y="543"
						width="138"
						height="57"
						rx="2"
						fill="var(--surface-container)"
						stroke="var(--border)"
						strokeWidth="1.2"
					/>
					{/* Lateral direita amadeirada aparente */}
					<rect
						x="713"
						y="543"
						width="4"
						height="57"
						rx="1"
						fill="var(--warm)"
						opacity="0.9"
					/>
					{/* Moldura superior e lateral esquerda amadeirada sutil */}
					<line
						x1="579"
						y1="543"
						x2="713"
						y2="543"
						stroke="var(--warm)"
						strokeWidth="1.2"
						opacity="0.8"
					/>
					<rect
						x="579"
						y="543"
						width="2"
						height="57"
						rx="0.5"
						fill="var(--warm)"
						opacity="0.8"
					/>

					{/* 4 Portas em vidro escuro com frestas verticais */}
					{/* Porta 1 */}
					<rect
						x="582"
						y="545"
						width="31.5"
						height="49"
						rx="1"
						fill="var(--surface-high)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>
					{/* Porta 2 */}
					<rect
						x="615"
						y="545"
						width="31.5"
						height="49"
						rx="1"
						fill="var(--surface-high)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>
					{/* Porta 3 */}
					<rect
						x="648"
						y="545"
						width="31.5"
						height="49"
						rx="1"
						fill="var(--surface-high)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>
					{/* Porta 4 */}
					<rect
						x="681"
						y="545"
						width="31.5"
						height="49"
						rx="1"
						fill="var(--surface-high)"
						stroke="var(--border-subtle)"
						strokeWidth="0.8"
					/>

					{/* Reflexos sutis de vidro reflecta sobre as portas */}
					<polygon
						points="584,546 599,546 591,593 584,593"
						fill="var(--primary)"
						opacity="0.04"
					/>
					<polygon
						points="617,546 632,546 624,593 617,593"
						fill="var(--primary)"
						opacity="0.04"
					/>
					<polygon
						points="650,546 665,546 657,593 650,593"
						fill="var(--primary)"
						opacity="0.04"
					/>
					<polygon
						points="683,546 697,546 689,593 683,593"
						fill="var(--primary)"
						opacity="0.04"
					/>

					{/* Perfil puxador cava / friso inferior contínuo */}
					<rect
						x="581"
						y="595"
						width="132"
						height="4"
						rx="0.8"
						fill="var(--warm)"
						opacity="0.85"
					/>
				</g>

				{/* Pendente linear contínuo sobre a bancada */}
				<g className="house-layer-lights">
					<line
						x1="560"
						y1="490"
						x2="560"
						y2="640"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					<line
						x1="650"
						y1="490"
						x2="650"
						y2="640"
						stroke="var(--border)"
						strokeWidth="1"
					/>
					<rect
						x="545"
						y="640"
						width="130"
						height="5"
						fill="var(--primary)"
						rx="1"
					/>
					<rect
						x="550"
						y="645"
						width="120"
						height="2"
						fill="var(--warm)"
						opacity="0.9"
					/>
				</g>

				{/* Banquetas altas de design com pernas finas */}
				<g className="house-layer-items">
					<rect
						x="560"
						y="765"
						width="22"
						height="4"
						fill="var(--primary)"
						rx="1"
					/>
					<line
						x1="571"
						y1="769"
						x2="567"
						y2="840"
						stroke="var(--border)"
						strokeWidth="1.8"
					/>
					<line
						x1="571"
						y1="769"
						x2="575"
						y2="840"
						stroke="var(--border)"
						strokeWidth="1.8"
					/>

					<rect
						x="625"
						y="765"
						width="22"
						height="4"
						fill="var(--primary)"
						rx="1"
					/>
					<line
						x1="636"
						y1="769"
						x2="632"
						y2="840"
						stroke="var(--border)"
						strokeWidth="1.8"
					/>
					<line
						x1="636"
						y1="769"
						x2="640"
						y2="840"
						stroke="var(--border)"
						strokeWidth="1.8"
					/>
				</g>

				{/* Pano de vidro da sala para o jardim de inverno (extrema direita) */}
				<g className="house-layer-furniture">
					<rect
						x="710"
						y="520"
						width="65"
						height="320"
						fill="var(--surface-container)"
						opacity="0.3"
						stroke="var(--border)"
						strokeWidth="1.5"
					/>
				</g>

				{/* Vaso arquitetônico em concreto com planta escultural */}
				<g className="house-layer-items">
					<polygon
						points="725,840 755,840 750,795 730,795"
						fill="var(--surface-highest)"
						stroke="var(--border)"
						strokeWidth="1"
						filter="url(#soft-contact-shadow)"
					/>
					{/* Folhagens biofílicas elegantes */}
					<path
						d="M740 795 C720 765 715 730 730 715 C740 735 740 765 740 795 Z"
						className="fill-emerald-400"
						opacity="0.75"
					/>
					<path
						d="M740 795 C760 770 770 735 755 720 C745 740 742 768 740 795 Z"
						className="fill-emerald-400"
						opacity="0.65"
					/>
					<path
						d="M740 795 C735 755 740 730 748 710 C755 730 750 765 740 795 Z"
						className="fill-emerald-400"
						opacity="0.85"
					/>
				</g>
			</g>
		</svg>
	);
}
