import { cn } from "@/core/utils";

interface DesktopAuthBackgroundProps {
	className?: string;
}

export function DesktopAuthBackground({
	className,
}: DesktopAuthBackgroundProps) {
	return (
		<svg
			viewBox="0 0 600 1000"
			preserveAspectRatio="xMidYMid slice"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(
				"pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden hidden lg:block",
				className,
			)}
			aria-hidden="true"
			data-testid="desktop-auth-background"
		>
			<defs>
				<style>{`
					@keyframes desktopStarDriftSlow {
						0% { transform: translateX(0px); }
						100% { transform: translateX(600px); }
					}
					@keyframes desktopStarDriftMid {
						0% { transform: translateX(0px); }
						100% { transform: translateX(600px); }
					}
					@keyframes desktopTwinkleA {
						0%, 100% { opacity: 0.3; }
						50% { opacity: 0.95; }
					}
					@keyframes desktopTwinkleB {
						0%, 100% { opacity: 0.9; }
						50% { opacity: 0.25; }
					}
					@keyframes desktopTwinkleC {
						0%, 100% { opacity: 0.35; }
						50% { opacity: 0.85; }
					}
					@keyframes desktopWarmthPulse {
						0%, 100% { opacity: 0.35; }
						50% { opacity: 0.65; }
					}
					.desktop-drift-layer-slow {
						animation: desktopStarDriftSlow 75s linear infinite;
						will-change: transform;
					}
					.desktop-drift-layer-mid {
						animation: desktopStarDriftMid 45s linear infinite;
						will-change: transform;
					}
					.desktop-twinkle-a {
						animation: desktopTwinkleA 5.5s ease-in-out infinite;
					}
					.desktop-twinkle-b {
						animation: desktopTwinkleB 6.8s ease-in-out infinite;
					}
					.desktop-twinkle-c {
						animation: desktopTwinkleC 6.0s ease-in-out infinite;
					}
					.desktop-ambient-breath {
						animation: desktopWarmthPulse 9s ease-in-out infinite;
					}
					@media (prefers-reduced-motion: reduce) {
						.desktop-drift-layer-slow,
						.desktop-drift-layer-mid,
						.desktop-twinkle-a,
						.desktop-twinkle-b,
						.desktop-twinkle-c,
						.desktop-ambient-breath {
							animation: none !important;
							transform: none !important;
							opacity: 0.6 !important;
						}
					}
				`}</style>

				{/* 1. Gradiente vertical atmosférico profundo idêntico ao vão da janela (window-night-sky) */}
				<linearGradient
					id="desktop-auth-sky-grad"
					x1="300"
					y1="0"
					x2="300"
					y2="1000"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="var(--background)" stopOpacity="0.98" />
					<stop offset="55%" stopColor="var(--card)" stopOpacity="0.95" />
					<stop offset="100%" stopColor="var(--popover)" stopOpacity="0.8" />
				</linearGradient>

				{/* 2. Transição suave na divisória da residência à esquerda */}
				<linearGradient id="desktop-auth-left-wash" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor="var(--card)" stopOpacity="0.25" />
					<stop offset="25%" stopColor="var(--background)" stopOpacity="0.1" />
					<stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
				</linearGradient>

				{/* 3. Glow ambiente quente sutil derivado da iluminação da casa */}
				<radialGradient
					id="desktop-auth-residence-warmth"
					cx="0%"
					cy="36%"
					r="65%"
				>
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.15" />
					<stop offset="40%" stopColor="var(--warm)" stopOpacity="0.04" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</radialGradient>

				{/* 4. Brilho cósmico esmaecido sem bordas duras */}
				<radialGradient
					id="desktop-auth-center-nebula"
					cx="50%"
					cy="24%"
					r="45%"
				>
					<stop offset="0%" stopColor="var(--primary)" stopOpacity="0.02" />
					<stop offset="60%" stopColor="var(--primary)" stopOpacity="0.006" />
					<stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
				</radialGradient>

				{/* ========================================================================= */}
				{/* CONJUNTOS DE ESTRELAS REUTILIZÁVEIS PARA LOOP CONTÍNUO (ESQUERDA -> DIREITA) */}
				{/* ========================================================================= */}

				{/* Conjunto 1: Estrelas de fundo menores e distantes */}
				<g id="drift-stars-faint">
					<circle
						cx="40"
						cy="80"
						r="0.6"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="110" cy="140" r="0.7" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="180"
						cy="65"
						r="0.5"
						fill="var(--primary)"
						opacity="0.4"
					/>
					<circle
						cx="260"
						cy="115"
						r="0.6"
						fill="var(--primary)"
						opacity="0.5"
					/>
					<circle cx="340" cy="75" r="0.7" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="430"
						cy="130"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="520" cy="60" r="0.6" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="575"
						cy="125"
						r="0.7"
						fill="var(--primary)"
						opacity="0.45"
					/>

					<circle cx="35" cy="240" r="0.6" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="70"
						cy="380"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="25" cy="510" r="0.7" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="55"
						cy="660"
						r="0.6"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="30" cy="820" r="0.5" fill="var(--warm)" opacity="0.4" />

					<circle
						cx="540"
						cy="225"
						r="0.7"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="580" cy="350" r="0.6" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="530"
						cy="490"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="570" cy="630" r="0.7" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="545"
						cy="765"
						r="0.6"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="585" cy="880" r="0.5" fill="var(--warm)" opacity="0.4" />

					<circle
						cx="130"
						cy="920"
						r="0.6"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="240" cy="950" r="0.7" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="350"
						cy="925"
						r="0.5"
						fill="var(--primary)"
						opacity="0.4"
					/>
					<circle
						cx="460"
						cy="960"
						r="0.6"
						fill="var(--primary)"
						opacity="0.45"
					/>
				</g>

				{/* Conjunto 2: Estrelas nítidas com cintilação (twinkle) */}
				<g id="drift-stars-bright">
					{/* Estrela Polar em destaque com brilho sutil cruzado */}
					<g className="desktop-twinkle-a">
						<circle
							cx="380"
							cy="95"
							r="4.0"
							fill="var(--primary)"
							opacity="0.16"
						/>
						<circle
							cx="380"
							cy="95"
							r="1.4"
							fill="var(--primary)"
							opacity="0.95"
						/>
						<line
							x1="376"
							y1="95"
							x2="384"
							y2="95"
							stroke="var(--primary)"
							strokeWidth="0.6"
							opacity="0.75"
						/>
						<line
							x1="380"
							y1="91"
							x2="380"
							y2="99"
							stroke="var(--primary)"
							strokeWidth="0.6"
							opacity="0.75"
						/>
					</g>

					{/* Topo / Acima do formulário */}
					<circle
						cx="85"
						cy="65"
						r="1.1"
						fill="var(--primary)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-1.2s" }}
					/>
					<circle
						cx="155"
						cy="110"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-3.1s" }}
					/>
					<circle
						cx="225"
						cy="50"
						r="0.9"
						fill="var(--primary)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-2.4s" }}
					/>
					<circle
						cx="305"
						cy="95"
						r="1.2"
						fill="var(--primary)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-4.0s" }}
					/>
					<circle
						cx="470"
						cy="60"
						r="0.9"
						fill="var(--warm)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-1.7s" }}
					/>
					<circle
						cx="535"
						cy="105"
						r="1.1"
						fill="var(--primary)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-4.8s" }}
					/>

					{/* Margem Esquerda (surgindo da residência) */}
					<circle
						cx="45"
						cy="185"
						r="3.0"
						fill="var(--primary)"
						opacity="0.12"
					/>
					<circle
						cx="45"
						cy="185"
						r="1.2"
						fill="var(--warm)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-2.0s" }}
					/>
					<circle
						cx="60"
						cy="310"
						r="0.8"
						fill="var(--primary)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-4.4s" }}
					/>
					<circle
						cx="40"
						cy="450"
						r="0.9"
						fill="var(--warm)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-1.1s" }}
					/>
					<circle
						cx="55"
						cy="590"
						r="1.0"
						fill="var(--primary)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-3.6s" }}
					/>
					<circle
						cx="45"
						cy="730"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-0.7s" }}
					/>

					{/* Margem Direita (percorrendo rumo à borda da tela) */}
					<circle
						cx="545"
						cy="200"
						r="3.0"
						fill="var(--primary)"
						opacity="0.14"
					/>
					<circle
						cx="545"
						cy="200"
						r="1.2"
						fill="var(--primary)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-0.9s" }}
					/>
					<circle
						cx="565"
						cy="315"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-4.2s" }}
					/>
					<circle
						cx="535"
						cy="425"
						r="1.0"
						fill="var(--primary)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-2.7s" }}
					/>
					<circle
						cx="560"
						cy="550"
						r="1.1"
						fill="var(--warm)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-5.3s" }}
					/>
					<circle
						cx="530"
						cy="690"
						r="0.8"
						fill="var(--primary)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-0.3s" }}
					/>
					<circle
						cx="555"
						cy="820"
						r="1.0"
						fill="var(--warm)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-3.3s" }}
					/>

					{/* Rodapé / Abaixo do formulário */}
					<circle
						cx="160"
						cy="930"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-1.4s" }}
					/>
					<circle
						cx="280"
						cy="960"
						r="1.1"
						fill="var(--primary)"
						className="desktop-twinkle-a"
						style={{ animationDelay: "-4.1s" }}
					/>
					<circle
						cx="395"
						cy="935"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-b"
						style={{ animationDelay: "-2.5s" }}
					/>
					<circle
						cx="505"
						cy="955"
						r="1.0"
						fill="var(--primary)"
						className="desktop-twinkle-c"
						style={{ animationDelay: "-0.4s" }}
					/>
				</g>
			</defs>

			{/* Fundo do céu noturno com profundidade atmosférica escura idêntica à janela */}
			<rect width="600" height="1000" fill="url(#desktop-auth-sky-grad)" />

			{/* Transição suave contínua a partir da borda esquerda (residência) */}
			<rect width="600" height="1000" fill="url(#desktop-auth-left-wash)" />

			{/* Respiração de calor ambiente sutil emanando da residência */}
			<rect
				width="600"
				height="1000"
				fill="url(#desktop-auth-residence-warmth)"
				className="desktop-ambient-breath"
			/>

			{/* Nebulosa cósmica difusa central */}
			<rect width="600" height="1000" fill="url(#desktop-auth-center-nebula)" />

			{/* ========================================================================= */}
			{/* CAMADAS DE DERIVA CONTÍNUA DAS ESTRELAS (LOOP INFINITO ESQUERDA -> DIREITA) */}
			{/* ========================================================================= */}

			{/* Camada 1: Estrelas de fundo lentas (paralaxe distante - ciclo 75s) */}
			<g className="desktop-drift-layer-slow">
				<use href="#drift-stars-faint" x="0" y="0" />
				<use href="#drift-stars-faint" x="-600" y="0" />
			</g>

			{/* Camada 2: Estrelas nítidas em deriva contínua (paralaxe média - ciclo 45s) */}
			<g className="desktop-drift-layer-mid">
				<use href="#drift-stars-bright" x="0" y="0" />
				<use href="#drift-stars-bright" x="-600" y="0" />
			</g>
		</svg>
	);
}
