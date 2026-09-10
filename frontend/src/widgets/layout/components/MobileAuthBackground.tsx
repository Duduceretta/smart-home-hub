import { cn } from "@/core/utils";

interface MobileAuthBackgroundProps {
	className?: string;
}

export function MobileAuthBackground({ className }: MobileAuthBackgroundProps) {
	return (
		<svg
			viewBox="0 0 400 800"
			preserveAspectRatio="xMidYMid slice"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(
				"pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden md:hidden",
				className,
			)}
			aria-hidden="true"
			data-testid="mobile-auth-background"
		>
			<defs>
				<style>{`
					@keyframes mobileTwinkleA {
						0%, 100% { opacity: 0.3; transform: scale(0.85); }
						50% { opacity: 0.95; transform: scale(1.15); }
					}
					@keyframes mobileTwinkleB {
						0%, 100% { opacity: 0.9; transform: scale(1.1); }
						50% { opacity: 0.25; transform: scale(0.8); }
					}
					@keyframes mobileTwinkleC {
						0%, 100% { opacity: 0.35; }
						50% { opacity: 0.85; }
					}
					@keyframes mobileWarmthBreath {
						0%, 100% { opacity: 0.45; }
						50% { opacity: 0.75; }
					}
					.mobile-twinkle-a {
						animation: mobileTwinkleA 5.5s ease-in-out infinite;
						transform-box: fill-box;
						transform-origin: center;
					}
					.mobile-twinkle-b {
						animation: mobileTwinkleB 7s ease-in-out infinite;
						transform-box: fill-box;
						transform-origin: center;
					}
					.mobile-twinkle-c {
						animation: mobileTwinkleC 6.2s ease-in-out infinite;
						transform-box: fill-box;
						transform-origin: center;
					}
					.mobile-ambient-breath {
						animation: mobileWarmthBreath 8s ease-in-out infinite;
					}
					@media (prefers-reduced-motion: reduce) {
						.mobile-twinkle-a,
						.mobile-twinkle-b,
						.mobile-twinkle-c,
						.mobile-ambient-breath {
							animation: none !important;
							opacity: 0.6 !important;
							transform: none !important;
						}
					}
				`}</style>

				{/* 1. Gradiente vertical atmosférico (céu noturno do mezanino) */}
				<linearGradient
					id="mobile-auth-sky-grad"
					x1="200"
					y1="0"
					x2="200"
					y2="800"
					gradientUnits="userSpaceOnUse"
				>
					<stop
						offset="0%"
						stopColor="var(--surface-highest)"
						stopOpacity="0.22"
					/>
					<stop offset="35%" stopColor="var(--popover)" stopOpacity="0.25" />
					<stop offset="70%" stopColor="var(--card)" stopOpacity="0.35" />
					<stop
						offset="100%"
						stopColor="var(--background)"
						stopOpacity="0.85"
					/>
				</linearGradient>

				{/* 2. Glow ambiente suave e acolhedor derivado da residência */}
				<radialGradient
					id="mobile-auth-ambient-warmth"
					cx="50%"
					cy="28%"
					r="60%"
				>
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.25" />
					<stop offset="50%" stopColor="var(--warm)" stopOpacity="0.07" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</radialGradient>
			</defs>

			{/* Fundo do céu noturno com profundidade */}
			<rect width="400" height="800" fill="url(#mobile-auth-sky-grad)" />

			{/* Respiração de calor ambiente */}
			<rect
				width="400"
				height="800"
				fill="url(#mobile-auth-ambient-warmth)"
				className="mobile-ambient-breath"
			/>

			{/* Poeira estelar / nebulosa cósmica sutil */}
			<ellipse
				cx="200"
				cy="190"
				rx="160"
				ry="95"
				fill="var(--primary)"
				opacity="0.02"
			/>
			<ellipse
				cx="200"
				cy="640"
				rx="140"
				ry="80"
				fill="var(--warm)"
				opacity="0.015"
			/>

			{/* --- CAMPO DE ESTRELAS DISTRIBUÍDO NO ENTORNO DO CARD --- */}

			{/* Estrela Polar central em destaque com brilho cruzado (topo) */}
			<g className="mobile-twinkle-a">
				<circle cx="200" cy="75" r="4.5" fill="var(--primary)" opacity="0.18" />
				<circle cx="200" cy="75" r="1.5" fill="var(--primary)" opacity="0.95" />
				<line
					x1="196"
					y1="75"
					x2="204"
					y2="75"
					stroke="var(--primary)"
					strokeWidth="0.6"
					opacity="0.75"
				/>
				<line
					x1="200"
					y1="71"
					x2="200"
					y2="79"
					stroke="var(--primary)"
					strokeWidth="0.6"
					opacity="0.75"
				/>
			</g>

			{/* Quadrante Superior Esquerdo */}
			<circle
				cx="60"
				cy="60"
				r="1.1"
				fill="var(--primary)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-1.2s" }}
			/>
			<circle
				cx="115"
				cy="95"
				r="0.7"
				fill="var(--warm)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-3.4s" }}
			/>
			<circle
				cx="160"
				cy="45"
				r="0.9"
				fill="var(--primary)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-2.1s" }}
			/>
			<circle cx="35" cy="130" r="3.2" fill="var(--primary)" opacity="0.12" />
			<circle
				cx="35"
				cy="130"
				r="1.3"
				fill="var(--warm)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-0.8s" }}
			/>
			<circle
				cx="85"
				cy="175"
				r="0.6"
				fill="var(--primary)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-4.5s" }}
			/>
			<circle
				cx="140"
				cy="150"
				r="0.8"
				fill="var(--warm)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-1.7s" }}
			/>

			{/* Quadrante Superior Direito */}
			<circle
				cx="255"
				cy="55"
				r="0.8"
				fill="var(--warm)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-2.8s" }}
			/>
			<circle cx="295" cy="90" r="3" fill="var(--primary)" opacity="0.15" />
			<circle
				cx="295"
				cy="90"
				r="1.2"
				fill="var(--primary)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-3.9s" }}
			/>
			<circle
				cx="345"
				cy="65"
				r="0.7"
				fill="var(--warm)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-5.1s" }}
			/>
			<circle
				cx="270"
				cy="160"
				r="0.9"
				fill="var(--primary)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-1.5s" }}
			/>
			<circle
				cx="320"
				cy="140"
				r="0.7"
				fill="var(--warm)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-4.1s" }}
			/>
			<circle
				cx="365"
				cy="180"
				r="1.1"
				fill="var(--primary)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-0.5s" }}
			/>

			{/* Laterais Médias (Periferia do Card de Formulário) */}
			<circle
				cx="25"
				cy="260"
				r="0.8"
				fill="var(--primary)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-2.6s" }}
			/>
			<circle
				cx="55"
				cy="330"
				r="1.0"
				fill="var(--warm)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-4.8s" }}
			/>
			<circle
				cx="30"
				cy="420"
				r="0.7"
				fill="var(--primary)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-1.1s" }}
			/>
			<circle
				cx="375"
				cy="270"
				r="0.9"
				fill="var(--warm)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-3.2s" }}
			/>
			<circle cx="350" cy="350" r="3" fill="var(--primary)" opacity="0.12" />
			<circle
				cx="350"
				cy="350"
				r="1.2"
				fill="var(--primary)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-0.9s" }}
			/>
			<circle
				cx="370"
				cy="440"
				r="0.8"
				fill="var(--warm)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-5.3s" }}
			/>

			{/* Quadrante Inferior e Rodapé */}
			<circle
				cx="40"
				cy="530"
				r="1.1"
				fill="var(--primary)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-2.3s" }}
			/>
			<circle
				cx="65"
				cy="620"
				r="0.7"
				fill="var(--warm)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-4.2s" }}
			/>
			<circle
				cx="35"
				cy="710"
				r="0.9"
				fill="var(--primary)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-1.8s" }}
			/>
			<circle
				cx="360"
				cy="520"
				r="0.7"
				fill="var(--warm)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-3.7s" }}
			/>
			<circle
				cx="340"
				cy="610"
				r="1.0"
				fill="var(--primary)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-5.6s" }}
			/>
			<circle
				cx="365"
				cy="700"
				r="0.8"
				fill="var(--warm)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-0.3s" }}
			/>
			<circle
				cx="110"
				cy="740"
				r="0.8"
				fill="var(--primary)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-2.9s" }}
			/>
			<circle
				cx="175"
				cy="765"
				r="1.2"
				fill="var(--warm)"
				className="mobile-twinkle-b"
				style={{ animationDelay: "-4.7s" }}
			/>
			<circle
				cx="235"
				cy="750"
				r="0.7"
				fill="var(--primary)"
				className="mobile-twinkle-c"
				style={{ animationDelay: "-1.4s" }}
			/>
			<circle
				cx="290"
				cy="760"
				r="0.9"
				fill="var(--warm)"
				className="mobile-twinkle-a"
				style={{ animationDelay: "-3.5s" }}
			/>
		</svg>
	);
}
