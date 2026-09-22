import { useEffect, useRef, useState } from "react";
import { useReducedGraphics } from "@/core/hooks/useReducedGraphics";
import { cn } from "@/core/utils";

interface DesktopAuthBackgroundProps {
	className?: string;
}

// Halo/corona de cada corpo celeste é gradiente SVG puro (renderiza na hora);
// a <image> correspondente carrega assíncrono. Sem isso, no reload o glow
// aparece "flutuando" um frame antes do corpo em si — usado por planeta, lua
// e saturno, todos com o mesmo padrão halo+imagem+corona.
function useFadeInOnLoad() {
	const [isLoaded, setIsLoaded] = useState(false);
	return { isLoaded, onLoad: () => setIsLoaded(true) };
}

export function DesktopAuthBackground({
	className,
}: DesktopAuthBackgroundProps) {
	const { isReducedGraphics } = useReducedGraphics();
	const planetImage = useFadeInOnLoad();
	const moonImage = useFadeInOnLoad();
	const saturnImage = useFadeInOnLoad();
	// Overlay de debug (só dev, some no build de produção via tree-shaking do
	// import.meta.env.DEV): passa o mouse em qualquer ponto da tela e mostra
	// cx/cy exatos do viewBox embaixo do cursor, pra apontar posição sem
	// chute. Listener no window (não onMouseMove do próprio <svg>): o card,
	// o halo e outros divs do painel direito ficam por cima do SVG (z-index
	// maior) e roubam o hit-test — um mousemove que caiu num desses nunca
	// borbulha pro SVG, que é irmão, não ancestral, deles.
	const [coordHover, setCoordHover] = useState<{ x: number; y: number } | null>(
		null,
	);
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		function handleMove(event: MouseEvent) {
			const svg = svgRef.current;
			if (!svg) return;
			const rect = svg.getBoundingClientRect();
			if (
				event.clientX < rect.left ||
				event.clientX > rect.right ||
				event.clientY < rect.top ||
				event.clientY > rect.bottom
			) {
				setCoordHover(null);
				return;
			}
			const point = svg.createSVGPoint();
			point.x = event.clientX;
			point.y = event.clientY;
			const ctm = svg.getScreenCTM();
			if (!ctm) return;
			const svgPoint = point.matrixTransform(ctm.inverse());
			setCoordHover({ x: Math.round(svgPoint.x), y: Math.round(svgPoint.y) });
		}
		window.addEventListener("mousemove", handleMove);
		return () => window.removeEventListener("mousemove", handleMove);
	}, []);

	return (
		<svg
			ref={svgRef}
			viewBox="0 0 600 1000"
			// "xMidYMid slice" (cover): nunca estica — lua/planeta/Saturno são
			// fotos redondas, esticar vira oval (bug visual pior que cortar).
			// slice corta o excesso e mantém proporção correta sempre.
			//
			// Zona segura de crop vertical (o painel direito é lg:w-5/12 da
			// largura da tela x altura cheia — nas proporções testadas
			// (1920x1080, 1440x900, 2560x1080 ultrawide) o container é sempre
			// mais largo, proporcionalmente, que o viewBox 600x1000, então
			// slice corta em cima/embaixo e nunca nas laterais. Janela vertical
			// visível = 600 / (larguraContainer/alturaContainer), sempre
			// centrada em cy=500. Pior caso coberto (2560x1080, panel ratio
			// ~0.988): janela ≈ [196, 804]. Corpos-chave (lua/planeta/Saturno)
			// ficam plotados dentro dessa faixa com margem; nebulosa/estrelas/
			// hub-network podem cortar livre nas bordas — são decorativos, sem
			// forma geométrica que fique feia cortada.
			preserveAspectRatio="xMidYMid slice"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(
				"pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden hidden lg:block",
				isReducedGraphics && "static-graphics",
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
						0%, 100% { opacity: 0.75; }
						50% { opacity: 1.0; }
					}
					@keyframes desktopTwinkleB {
						0%, 100% { opacity: 1.0; }
						50% { opacity: 0.70; }
					}
					@keyframes desktopTwinkleC {
						0%, 100% { opacity: 0.80; }
						50% { opacity: 1.0; }
					}
					@keyframes desktopWarmthPulse {
						0%, 100% { opacity: 0.35; }
						50% { opacity: 0.65; }
					}
					@keyframes desktopNebulaBreathe {
						0%, 100% { opacity: 0.7; transform: scale(1); }
						50% { opacity: 0.95; transform: scale(1.03); }
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
					@keyframes desktopFloatA {
						0%, 100% { transform: translate(0px, 0px); }
						25% { transform: translate(3px, -2px); }
						50% { transform: translate(1px, 3px); }
						75% { transform: translate(-3px, 1px); }
					}
					@keyframes desktopFloatB {
						0%, 100% { transform: translate(0px, 0px); }
						30% { transform: translate(-2px, 3px); }
						60% { transform: translate(2px, -3px); }
						80% { transform: translate(3px, 1px); }
					}
					@keyframes desktopFloatC {
						0%, 100% { transform: translate(0px, 0px); }
						20% { transform: translate(2px, 2px); }
						45% { transform: translate(-3px, -2px); }
						70% { transform: translate(-1px, 3px); }
					}
					.desktop-float-a {
						animation: desktopFloatA 9s ease-in-out infinite;
					}
					.desktop-float-b {
						animation: desktopFloatB 12s ease-in-out infinite;
					}
					.desktop-float-c {
						animation: desktopFloatC 10.5s ease-in-out infinite;
					}
					.desktop-ambient-breath {
						animation: desktopWarmthPulse 9s ease-in-out infinite;
					}
					.desktop-nebula-pulse {
						animation: desktopNebulaBreathe 18s ease-in-out infinite;
						transform-box: fill-box;
						transform-origin: center;
					}
					@keyframes meteorStreakPrimary {
						0% {
							transform: translate(0px, 0px);
							opacity: 0;
						}
						1.5% {
							opacity: 1;
						}
						7% {
							transform: translate(-260px, 160px);
							opacity: 0.9;
						}
						10% {
							transform: translate(-330px, 205px);
							opacity: 0;
						}
						100% {
							transform: translate(-330px, 205px);
							opacity: 0;
						}
					}
					@keyframes meteorStreakSecondary {
						0%, 40% {
							transform: translate(0px, 0px);
							opacity: 0;
						}
						41.5% {
							opacity: 0.95;
						}
						47% {
							transform: translate(-230px, 175px);
							opacity: 0.85;
						}
						50% {
							transform: translate(-290px, 220px);
							opacity: 0;
						}
						100% {
							transform: translate(-290px, 220px);
							opacity: 0;
						}
					}
					@keyframes meteorStreakTertiary {
						0%, 72% {
							transform: translate(0px, 0px);
							opacity: 0;
						}
						73.5% {
							opacity: 0.85;
						}
						78% {
							transform: translate(-200px, 125px);
							opacity: 0.8;
						}
						81% {
							transform: translate(-250px, 155px);
							opacity: 0;
						}
						100% {
							transform: translate(-250px, 155px);
							opacity: 0;
						}
					}
					@keyframes meteorStreakMid {
						0%, 25% {
							transform: translate(0px, 0px);
							opacity: 0;
						}
						26.5% {
							opacity: 0.9;
						}
						32% {
							transform: translate(-230px, 145px);
							opacity: 0.85;
						}
						35% {
							transform: translate(-280px, 175px);
							opacity: 0;
						}
						100% {
							transform: translate(-280px, 175px);
							opacity: 0;
						}
					}
					@keyframes meteorStreakLower {
						0%, 55% {
							transform: translate(0px, 0px);
							opacity: 0;
						}
						56.5% {
							opacity: 0.85;
						}
						62% {
							transform: translate(-210px, 130px);
							opacity: 0.8;
						}
						65% {
							transform: translate(-260px, 160px);
							opacity: 0;
						}
						100% {
							transform: translate(-260px, 160px);
							opacity: 0;
						}
					}
					.desktop-meteor-1 {
						animation: meteorStreakPrimary 10s ease-in infinite;
						will-change: transform, opacity;
					}
					.desktop-meteor-2 {
						animation: meteorStreakSecondary 14s ease-in infinite;
						will-change: transform, opacity;
					}
					.desktop-meteor-3 {
						animation: meteorStreakTertiary 18s ease-in infinite;
						will-change: transform, opacity;
					}
					.desktop-meteor-4 {
						animation: meteorStreakMid 13s ease-in infinite;
						will-change: transform, opacity;
					}
					.desktop-meteor-5 {
						animation: meteorStreakLower 16s ease-in infinite;
						will-change: transform, opacity;
					}
					@media (prefers-reduced-motion: reduce) {
						.desktop-drift-layer-slow,
						.desktop-drift-layer-mid,
						.desktop-twinkle-a,
						.desktop-twinkle-b,
						.desktop-twinkle-c,
						.desktop-float-a,
						.desktop-float-b,
						.desktop-float-c,
						.desktop-ambient-breath,
						.desktop-nebula-pulse,
						.desktop-meteor-1,
						.desktop-meteor-2,
						.desktop-meteor-3,
						.desktop-meteor-4,
						.desktop-meteor-5 {
							animation: none !important;
							transform: none !important;
							opacity: 0.8 !important;
						}
						.desktop-meteor-1,
						.desktop-meteor-2,
						.desktop-meteor-3,
						.desktop-meteor-4,
						.desktop-meteor-5 {
							opacity: 0 !important;
						}
					}
					.static-graphics .desktop-drift-layer-slow,
					.static-graphics .desktop-drift-layer-mid,
					.static-graphics .desktop-twinkle-a,
					.static-graphics .desktop-twinkle-b,
					.static-graphics .desktop-twinkle-c,
					.static-graphics .desktop-float-a,
					.static-graphics .desktop-float-b,
					.static-graphics .desktop-float-c,
					.static-graphics .desktop-ambient-breath,
					.static-graphics .desktop-nebula-pulse,
					.static-graphics .desktop-meteor-1,
					.static-graphics .desktop-meteor-2,
					.static-graphics .desktop-meteor-3,
					.static-graphics .desktop-meteor-4,
					.static-graphics .desktop-meteor-5 {
						animation: none !important;
						transform: none !important;
						opacity: 0.8 !important;
					}
					.static-graphics .desktop-meteor-1,
					.static-graphics .desktop-meteor-2,
					.static-graphics .desktop-meteor-3,
					.static-graphics .desktop-meteor-4,
					.static-graphics .desktop-meteor-5 {
						opacity: 0 !important;
					}
				`}</style>

				{/* 1. Gradiente vertical de espaço cósmico profundo */}
				<linearGradient
					id="desktop-auth-sky-grad"
					x1="300"
					y1="0"
					x2="300"
					y2="1000"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#04060c" stopOpacity="0.99" />
					<stop offset="25%" stopColor="#080e1e" stopOpacity="0.98" />
					<stop offset="65%" stopColor="#060a16" stopOpacity="0.97" />
					<stop offset="100%" stopColor="#030408" stopOpacity="0.99" />
				</linearGradient>

				{/* 2. Transição lateral suave com a divisória da residência */}
				<linearGradient id="desktop-auth-left-wash" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor="var(--background)" stopOpacity="0.8" />
					<stop offset="16%" stopColor="var(--background)" stopOpacity="0.35" />
					<stop offset="42%" stopColor="var(--background)" stopOpacity="0.05" />
					<stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
				</linearGradient>

				{/* 3. Calor ambiente sutil da residência */}
				<radialGradient
					id="desktop-auth-residence-warmth"
					cx="0%"
					cy="36%"
					r="65%"
				>
					<stop offset="0%" stopColor="var(--warm)" stopOpacity="0.14" />
					<stop offset="40%" stopColor="var(--warm)" stopOpacity="0.04" />
					<stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
				</radialGradient>

				{/* 4. Glow cósmico volumétrico de fundo */}
				<radialGradient id="galaxy-deep-halo" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#10b981" stopOpacity="0.48" />
					<stop offset="45%" stopColor="#047857" stopOpacity="0.28" />
					<stop offset="75%" stopColor="#312e81" stopOpacity="0.16" />
					<stop offset="100%" stopColor="#09090b" stopOpacity="0" />
				</radialGradient>

				{/* 4b. Halo e atmosfera do planeta carmesim */}
				<radialGradient id="crimson-planet-halo" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#be123c" stopOpacity="0.35" />
					<stop offset="55%" stopColor="#881337" stopOpacity="0.16" />
					<stop offset="85%" stopColor="#4c0519" stopOpacity="0.04" />
					<stop offset="100%" stopColor="#000000" stopOpacity="0" />
				</radialGradient>

				<filter
					id="planet-corona-blur"
					x="-30%"
					y="-30%"
					width="160%"
					height="160%"
				>
					<feGaussianBlur stdDeviation="12" />
				</filter>

				<filter
					id="colossal-nebula-blur"
					x="-50%"
					y="-50%"
					width="200%"
					height="200%"
				>
					<feGaussianBlur stdDeviation="24" />
				</filter>

				{/* 4c. Halo da lua secundária prateada */}
				<radialGradient id="moon-lunar-halo" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.6" />
					<stop offset="50%" stopColor="#60a5fa" stopOpacity="0.28" />
					<stop offset="85%" stopColor="#1e3a8a" stopOpacity="0.08" />
					<stop offset="100%" stopColor="#000000" stopOpacity="0" />
				</radialGradient>

				{/* 4d. Filtro e gradientes para meteoros / estrelas cadentes */}
				<filter
					id="meteor-head-glow"
					x="-50%"
					y="-50%"
					width="200%"
					height="200%"
				>
					<feGaussianBlur stdDeviation="1.8" />
				</filter>
				<filter
					id="star-halo-blur"
					x="-100%"
					y="-100%"
					width="300%"
					height="300%"
				>
					<feGaussianBlur stdDeviation="4.5" />
				</filter>
				<filter
					id="star-soft-blur"
					x="-100%"
					y="-100%"
					width="300%"
					height="300%"
				>
					<feGaussianBlur stdDeviation="8" />
				</filter>
				<linearGradient
					id="meteor-tail-emerald"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="0%"
				>
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
					<stop offset="15%" stopColor="#67e8f9" stopOpacity="0.85" />
					<stop offset="45%" stopColor="#10b981" stopOpacity="0.45" />
					<stop offset="100%" stopColor="#047857" stopOpacity="0" />
				</linearGradient>
				<linearGradient
					id="meteor-tail-cosmic"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="0%"
				>
					<stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
					<stop offset="20%" stopColor="#a7f3d0" stopOpacity="0.75" />
					<stop offset="55%" stopColor="#3b82f6" stopOpacity="0.35" />
					<stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
				</linearGradient>

				{/* 4e. Halo do planeta com anéis (Saturno) dourado/âmbar */}
				<radialGradient id="saturn-golden-halo" cx="50%" cy="50%" r="50%">
					<stop offset="0%" stopColor="#fde047" stopOpacity="0.4" />
					<stop offset="35%" stopColor="#ca8a04" stopOpacity="0.2" />
					<stop offset="70%" stopColor="#854d0e" stopOpacity="0.06" />
					<stop offset="100%" stopColor="#000000" stopOpacity="0" />
				</radialGradient>

				{/* 4f. Gradiente para malha de conexão IoT / Hub Network */}
				<linearGradient
					id="hub-network-line-grad"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="100%"
				>
					<stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
					<stop offset="50%" stopColor="#06b6d4" stopOpacity="0.38" />
					<stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
				</linearGradient>

				{/* Filtro de blur para halos de estrelas */}
				<filter
					id="star-halo-blur"
					x="-50%"
					y="-50%"
					width="200%"
					height="200%"
				>
					<feGaussianBlur stdDeviation="3" />
				</filter>

				{/* 5. Malha de Grid Técnico Blueprint mantida */}
				<pattern
					id="desktop-auth-grid"
					width="30"
					height="30"
					patternUnits="userSpaceOnUse"
				>
					<path
						d="M 30 0 L 0 0 0 30"
						fill="none"
						stroke="var(--border)"
						strokeWidth="1"
						strokeOpacity="0.35"
					/>
				</pattern>

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

					{/* Novas de fundo - Topo */}
					<circle cx="70" cy="45" r="0.5" fill="#67e8f9" opacity="0.4" />
					<circle
						cx="140"
						cy="95"
						r="0.6"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="215" cy="50" r="0.5" fill="var(--warm)" opacity="0.4" />
					<circle cx="300" cy="90" r="0.6" fill="#a7f3d0" opacity="0.45" />
					<circle
						cx="395"
						cy="45"
						r="0.5"
						fill="var(--primary)"
						opacity="0.4"
					/>
					<circle cx="485" cy="105" r="0.6" fill="#fef08a" opacity="0.4" />

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

					{/* Novas de fundo - Margem esquerda */}
					<circle
						cx="15"
						cy="340"
						r="0.5"
						fill="var(--primary)"
						opacity="0.4"
					/>
					<circle cx="65" cy="560" r="0.6" fill="#a7f3d0" opacity="0.45" />
					<circle cx="20" cy="710" r="0.5" fill="var(--warm)" opacity="0.4" />

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

					{/* Novas de fundo - Margem direita */}
					<circle cx="525" cy="310" r="0.5" fill="#67e8f9" opacity="0.4" />
					<circle cx="560" cy="420" r="0.6" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="590"
						cy="540"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="535" cy="670" r="0.6" fill="#a7f3d0" opacity="0.4" />
					<circle cx="570" cy="810" r="0.5" fill="var(--warm)" opacity="0.4" />

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

					{/* Novas de fundo - Base */}
					<circle cx="80" cy="940" r="0.5" fill="#67e8f9" opacity="0.4" />
					<circle
						cx="190"
						cy="970"
						r="0.6"
						fill="var(--primary)"
						opacity="0.4"
					/>
					<circle cx="410" cy="960" r="0.5" fill="var(--warm)" opacity="0.4" />
					<circle cx="520" cy="930" r="0.6" fill="#a7f3d0" opacity="0.45" />

					<circle cx="85" cy="190" r="0.5" fill="#67e8f9" opacity="0.5" />
					<circle cx="145" cy="290" r="0.6" fill="#a7f3d0" opacity="0.55" />
					<circle
						cx="210"
						cy="220"
						r="0.4"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="275" cy="340" r="0.7" fill="#fef08a" opacity="0.5" />
					<circle
						cx="315"
						cy="450"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="390" cy="380" r="0.6" fill="#a7f3d0" opacity="0.5" />
					<circle cx="470" cy="460" r="0.5" fill="var(--warm)" opacity="0.45" />
					<circle cx="115" cy="580" r="0.6" fill="#67e8f9" opacity="0.55" />
					<circle
						cx="175"
						cy="670"
						r="0.7"
						fill="var(--primary)"
						opacity="0.5"
					/>
					<circle cx="230" cy="790" r="0.5" fill="#fef08a" opacity="0.45" />
					<circle cx="295" cy="860" r="0.6" fill="#a7f3d0" opacity="0.5" />
					<circle
						cx="380"
						cy="820"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
					<circle cx="440" cy="710" r="0.6" fill="#67e8f9" opacity="0.55" />
					<circle cx="490" cy="840" r="0.5" fill="var(--warm)" opacity="0.45" />

					{/* Novas de fundo - Campo central/profundidade */}
					<circle
						cx="190"
						cy="370"
						r="0.5"
						fill="var(--primary)"
						opacity="0.4"
					/>
					<circle cx="240" cy="480" r="0.6" fill="#67e8f9" opacity="0.45" />
					<circle cx="340" cy="600" r="0.5" fill="#a7f3d0" opacity="0.4" />
					<circle cx="420" cy="520" r="0.6" fill="var(--warm)" opacity="0.4" />
					<circle
						cx="340"
						cy="740"
						r="0.5"
						fill="var(--primary)"
						opacity="0.45"
					/>
				</g>

				{/* Conjunto 2: Estrelas nítidas com cintilação (twinkle) */}
				<g id="drift-stars-bright">
					<g className="desktop-twinkle-a">
						<circle
							cx="380"
							cy="95"
							r="3.5"
							fill="var(--primary)"
							opacity="0.15"
						/>
						<circle
							cx="380"
							cy="95"
							r="1.4"
							fill="var(--primary)"
							opacity="0.95"
						/>
					</g>
					<circle
						cx="95"
						cy="70"
						r="1.0"
						fill="var(--warm)"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="215"
						cy="130"
						r="0.9"
						fill="var(--primary)"
						className="desktop-twinkle-c"
					/>
					<circle
						cx="475"
						cy="85"
						r="1.1"
						fill="var(--warm)"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="155"
						cy="55"
						r="1.0"
						fill="#67e8f9"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="290"
						cy="60"
						r="1.1"
						fill="var(--primary)"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="45"
						cy="320"
						r="1.0"
						fill="var(--primary)"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="80"
						cy="460"
						r="1.1"
						fill="var(--warm)"
						className="desktop-twinkle-c"
					/>
					<circle
						cx="35"
						cy="600"
						r="0.9"
						fill="#a7f3d0"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="50"
						cy="740"
						r="0.9"
						fill="var(--primary)"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="75"
						cy="890"
						r="1.1"
						fill="var(--warm)"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="535"
						cy="425"
						r="1.0"
						fill="var(--primary)"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="560"
						cy="550"
						r="1.1"
						fill="var(--warm)"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="530"
						cy="690"
						r="0.8"
						fill="var(--primary)"
						className="desktop-twinkle-c"
					/>
					<circle
						cx="555"
						cy="820"
						r="1.0"
						fill="var(--warm)"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="570"
						cy="480"
						r="1.0"
						fill="#67e8f9"
						className="desktop-twinkle-c"
					/>
					<circle
						cx="520"
						cy="770"
						r="1.1"
						fill="#fef08a"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="160"
						cy="930"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-c"
					/>
					<circle
						cx="280"
						cy="960"
						r="1.1"
						fill="var(--primary)"
						className="desktop-twinkle-a"
					/>
					<circle
						cx="395"
						cy="935"
						r="0.8"
						fill="var(--warm)"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="505"
						cy="955"
						r="1.0"
						fill="var(--primary)"
						className="desktop-twinkle-c"
					/>
					<circle
						cx="220"
						cy="930"
						r="0.9"
						fill="#a7f3d0"
						className="desktop-twinkle-b"
					/>
					<circle
						cx="440"
						cy="945"
						r="1.0"
						fill="#67e8f9"
						className="desktop-twinkle-a"
					/>
				</g>
			</defs>

			{/* Fundo do céu noturno de espaço profundo */}
			<rect width="600" height="1000" fill="url(#desktop-auth-sky-grad)" />

			{/* Transição suave contínua a partir da divisória da residência */}
			<rect width="600" height="1000" fill="url(#desktop-auth-left-wash)" />

			{/* Respiração de calor ambiente emanando da residência */}
			<rect
				width="600"
				height="1000"
				fill="url(#desktop-auth-residence-warmth)"
				className="desktop-ambient-breath"
			/>

			{/* ========================================================================= */}
			{/* NEBULOSAS CÓSMICAS VOLUMÉTRICAS DE PROFUNDIDADE COM GLOW                  */}
			{/* ========================================================================= */}
			<g
				data-testid="auth-nebula"
				className="desktop-nebula-pulse"
				opacity="0.85"
			>
				{/* Glow volumétrico superior direito */}
				<ellipse
					cx="420"
					cy="180"
					rx="220"
					ry="130"
					fill="url(#galaxy-deep-halo)"
					filter="url(#colossal-nebula-blur)"
				/>
				{/* Glow volumétrico na margem esquerda */}
				<ellipse
					cx="65"
					cy="440"
					rx="95"
					ry="250"
					fill="#047857"
					opacity="0.22"
					filter="url(#colossal-nebula-blur)"
				/>
				{/* Glow volumétrico inferior */}
				<ellipse
					cx="260"
					cy="860"
					rx="260"
					ry="160"
					fill="url(#galaxy-deep-halo)"
					filter="url(#colossal-nebula-blur)"
				/>
				{/* Glow na margem direita */}
				<ellipse
					cx="555"
					cy="600"
					rx="105"
					ry="220"
					fill="#312e81"
					opacity="0.18"
					filter="url(#colossal-nebula-blur)"
				/>
			</g>

			{/* ========================================================================= */}
			{/* LUA SECUNDÁRIA (À direita abaixo da linha de senha)                        */}
			{/* Centro: (550, 535), Raio aparente: 24                                      */}
			{/* ========================================================================= */}
			<g data-testid="auth-moon">
				{/* Glow externo difuso — só aparece depois da imagem carregar */}
				<ellipse
					cx="550"
					cy="535"
					rx="55"
					ry="55"
					fill="url(#moon-lunar-halo)"
					filter="url(#colossal-nebula-blur)"
					opacity={moonImage.isLoaded ? 0.35 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
				/>
				{/* Halo interno, mais nítido, coladinho no disco */}
				<ellipse
					cx="550"
					cy="535"
					rx="30"
					ry="30"
					fill="url(#moon-lunar-halo)"
					filter="url(#planet-corona-blur)"
					opacity={moonImage.isLoaded ? 0.55 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
				/>
				{/* Imagem fotorrealista da lua */}
				<image
					href="/images/moon-cutout.png"
					x="526"
					y="511"
					width="48"
					height="48"
					preserveAspectRatio="xMidYMid meet"
					opacity={moonImage.isLoaded ? 0.8 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
					onLoad={moonImage.onLoad}
				/>
			</g>

			{/* ========================================================================= */}
			{/* PLANETA TITÃ COLOSSAL (Referência: large.jpg / sketch do usuário)         */}
			{/* Centro: (165, 500), Raio: 290 — cy=500 é o centro exato da janela de     */}
			{/* crop vertical (sempre centrada aí, ver comentário de zona segura no      */}
			{/* topo do arquivo): diâmetro 580 cabe raspando na pior janela testada      */}
			{/* (~607px, ultrawide 2560x1080). Corte horizontal do lado esquerdo (x=-125)*/}
			{/* é intencional — sangra pra fora do viewBox por design, não depende de tela.*/}
			{/* ========================================================================= */}
			<g data-testid="auth-planets">
				{/* Halo atmosférico suave atrás do planeta — só aparece depois da imagem carregar,
				    pra evitar o glow "flutuando" sem o planeta no reload (halo/corona são gradientes
				    SVG puros, renderizam na hora; a <image> carrega assíncrono). */}
				<ellipse
					cx="165"
					cy="500"
					rx="315"
					ry="315"
					fill="url(#crimson-planet-halo)"
					opacity={planetImage.isLoaded ? 0.85 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
				/>

				{/* Imagem do planeta recortado com precisão esférica */}
				<image
					href="/images/planet-crimson-cutout.png"
					x="-125"
					y="210"
					width="580"
					height="580"
					preserveAspectRatio="xMidYMid meet"
					opacity={planetImage.isLoaded ? 1 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
					onLoad={planetImage.onLoad}
				/>

				{/* Glow atmosférico suave da atmosfera iluminada à direita — mesmo tratamento de fade */}
				<g
					style={{
						opacity: planetImage.isLoaded ? 1 : 0,
						transition: "opacity 500ms ease-out",
					}}
				>
					<path
						d="M 264 228 A 290 290 0 0 1 264 772"
						fill="none"
						stroke="#fda4af"
						strokeWidth="3.5"
						opacity="0.8"
						filter="url(#planet-corona-blur)"
					/>
					<path
						d="M 264 228 A 290 290 0 0 1 264 772"
						fill="none"
						stroke="#ffffff"
						strokeWidth="1.5"
						opacity="0.9"
					/>
				</g>
			</g>

			{/* ========================================================================= */}
			{/* PLANETA COM ANÉIS (SATURNO) - Canto inferior direito do formulário        */}
			{/* Centro aproximado: (475, 735), largura: 210, altura: 110 — subido 15px    */}
			{/* em relação ao original (750) pra imagem (base sólida, sem blur) caber     */}
			{/* dentro da janela de crop vertical na pior proporção testada (2560x1080).  */}
			{/* Halo (glow difuso) pode seguir cortando um pouco embaixo — imperceptível. */}
			{/* ========================================================================= */}
			<g data-testid="auth-saturn">
				{/* Halo atmosférico dourado difuso — mesmo tratamento de fade condicionado
				    ao load da imagem que o planeta e a lua já usam */}
				<ellipse
					cx="475"
					cy="735"
					rx="130"
					ry="80"
					fill="url(#saturn-golden-halo)"
					filter="url(#colossal-nebula-blur)"
					opacity={saturnImage.isLoaded ? 0.45 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
				/>
				<ellipse
					cx="475"
					cy="735"
					rx="70"
					ry="45"
					fill="url(#saturn-golden-halo)"
					filter="url(#planet-corona-blur)"
					opacity={saturnImage.isLoaded ? 0.6 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
				/>
				{/* Imagem do planeta com anéis recortado */}
				<image
					href="/images/saturn-cutout.png"
					x="370"
					y="680"
					width="210"
					height="110"
					preserveAspectRatio="xMidYMid meet"
					opacity={saturnImage.isLoaded ? 0.92 : 0}
					style={{ transition: "opacity 500ms ease-out" }}
					onLoad={saturnImage.onLoad}
				/>
			</g>

			{/* ========================================================================= */}
			{/* ELEMENTOS DE HUB NETWORK (Topologia IoT / Mesh abaixo do language selector)*/}
			{/* Coordenadas x ~415-585, y ~118-285 - Totalmente visível abaixo do seletor   */}
			{/* ========================================================================= */}
			<g
				data-testid="auth-hub-network"
				transform="translate(490,295) scale(1.0) translate(-500,-215)"
			>
				{/* Linhas de fundo com glow difuso volumétrico */}
				<g
					stroke="#10b981"
					strokeWidth="5"
					strokeOpacity="0.45"
					strokeLinecap="round"
					filter="url(#star-halo-blur)"
				>
					<line x1="500" y1="155" x2="565" y2="170" />
					<line x1="500" y1="155" x2="440" y2="175" />
					<line x1="440" y1="175" x2="460" y2="225" />
					<line x1="500" y1="155" x2="535" y2="210" />
					<line x1="565" y1="170" x2="535" y2="210" />
					<line x1="565" y1="170" x2="575" y2="235" />
					<line x1="535" y1="210" x2="575" y2="235" />
					<line x1="440" y1="175" x2="425" y2="250" />
					<line x1="460" y1="225" x2="505" y2="265" />
					<line x1="535" y1="210" x2="505" y2="265" />
					<line x1="575" y1="235" x2="550" y2="275" />
					<line x1="505" y1="265" x2="550" y2="275" />
				</g>

				{/* Linhas vetoriais nítidas e luminosas de conexão */}
				<g strokeLinecap="round">
					<line
						x1="500"
						y1="155"
						x2="565"
						y2="170"
						stroke="#34d399"
						strokeWidth="2.2"
						strokeOpacity="0.95"
					/>
					<line
						x1="500"
						y1="155"
						x2="440"
						y2="175"
						stroke="#10b981"
						strokeWidth="2.2"
						strokeOpacity="0.9"
					/>
					<line
						x1="440"
						y1="175"
						x2="460"
						y2="225"
						stroke="#38bdf8"
						strokeWidth="1.8"
						strokeOpacity="0.85"
						strokeDasharray="5 3"
					/>
					<line
						x1="500"
						y1="155"
						x2="535"
						y2="210"
						stroke="#38bdf8"
						strokeWidth="2.0"
						strokeOpacity="0.9"
					/>
					<line
						x1="565"
						y1="170"
						x2="535"
						y2="210"
						stroke="#34d399"
						strokeWidth="2.2"
						strokeOpacity="0.95"
					/>
					<line
						x1="565"
						y1="170"
						x2="575"
						y2="235"
						stroke="#67e8f9"
						strokeWidth="1.8"
						strokeOpacity="0.85"
						strokeDasharray="4 3"
					/>
					<line
						x1="535"
						y1="210"
						x2="575"
						y2="235"
						stroke="#34d399"
						strokeWidth="2.2"
						strokeOpacity="0.95"
					/>
					<line
						x1="440"
						y1="175"
						x2="425"
						y2="250"
						stroke="#06b6d4"
						strokeWidth="1.8"
						strokeOpacity="0.85"
						strokeDasharray="5 4"
					/>
					<line
						x1="460"
						y1="225"
						x2="505"
						y2="265"
						stroke="#10b981"
						strokeWidth="2.0"
						strokeOpacity="0.9"
					/>
					<line
						x1="535"
						y1="210"
						x2="505"
						y2="265"
						stroke="#38bdf8"
						strokeWidth="2.0"
						strokeOpacity="0.95"
					/>
					<line
						x1="575"
						y1="235"
						x2="550"
						y2="275"
						stroke="#34d399"
						strokeWidth="2.0"
						strokeOpacity="0.9"
					/>
					<line
						x1="505"
						y1="265"
						x2="550"
						y2="275"
						stroke="#38bdf8"
						strokeWidth="1.8"
						strokeOpacity="0.85"
						strokeDasharray="4 3"
					/>
				</g>

				{/* Beacon circular concêntrico no Gateway Principal (500, 155) */}
				<circle
					cx="500"
					cy="155"
					r="16"
					fill="none"
					stroke="#34d399"
					strokeWidth="1.8"
					strokeOpacity="0.85"
					strokeDasharray="4 3"
					className="desktop-ambient-breath"
				/>
				<circle
					cx="500"
					cy="155"
					r="26"
					fill="none"
					stroke="#06b6d4"
					strokeWidth="1.4"
					strokeOpacity="0.65"
					strokeDasharray="5 4"
				/>
				<circle
					cx="500"
					cy="155"
					r="11"
					fill="#10b981"
					opacity="0.65"
					filter="url(#star-halo-blur)"
				/>
				<circle cx="500" cy="155" r="5.0" fill="#34d399" opacity="1.0" />
				<circle cx="500" cy="155" r="2.4" fill="#ffffff" />

				{/* Nó Sub-Gateway (535, 210) */}
				<circle
					cx="535"
					cy="210"
					r="12"
					fill="none"
					stroke="#38bdf8"
					strokeWidth="1.6"
					strokeOpacity="0.8"
					strokeDasharray="4 3"
				/>
				<circle
					cx="535"
					cy="210"
					r="9"
					fill="#06b6d4"
					opacity="0.6"
					filter="url(#star-halo-blur)"
				/>
				<circle cx="535" cy="210" r="4.2" fill="#38bdf8" opacity="1.0" />
				<circle cx="535" cy="210" r="2.0" fill="#ffffff" />

				{/* Nós periféricos (Dispositivos / Satélites IoT) com halos nítidos */}
				<g>
					{/* Nó A (440, 175) */}
					<circle
						cx="440"
						cy="175"
						r="8"
						fill="#06b6d4"
						opacity="0.55"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="440"
						cy="175"
						r="3.5"
						fill="#67e8f9"
						opacity="1.0"
						className="desktop-twinkle-c"
					/>
					<circle cx="440" cy="175" r="1.6" fill="#ffffff" />

					{/* Nó B (565, 170) */}
					<circle
						cx="565"
						cy="170"
						r="8"
						fill="#10b981"
						opacity="0.55"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="565"
						cy="170"
						r="3.5"
						fill="#a7f3d0"
						opacity="1.0"
						className="desktop-twinkle-b"
					/>
					<circle cx="565" cy="170" r="1.6" fill="#ffffff" />

					{/* Nó C (460, 225) */}
					<circle
						cx="460"
						cy="225"
						r="7"
						fill="#06b6d4"
						opacity="0.5"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="460"
						cy="225"
						r="3.2"
						fill="#a7f3d0"
						opacity="1.0"
						className="desktop-twinkle-b"
					/>
					<circle cx="460" cy="225" r="1.5" fill="#ffffff" />

					{/* Nó D (575, 235) */}
					<circle
						cx="575"
						cy="235"
						r="8"
						fill="#10b981"
						opacity="0.6"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="575"
						cy="235"
						r="3.6"
						fill="#34d399"
						opacity="1.0"
						className="desktop-twinkle-a"
					/>
					<circle cx="575" cy="235" r="1.7" fill="#ffffff" />

					{/* Nó E (425, 250) */}
					<circle
						cx="425"
						cy="250"
						r="7"
						fill="#06b6d4"
						opacity="0.5"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="425"
						cy="250"
						r="3.0"
						fill="#38bdf8"
						opacity="0.95"
						className="desktop-twinkle-c"
					/>
					<circle cx="425" cy="250" r="1.4" fill="#ffffff" />

					{/* Nó F (505, 265) */}
					<circle
						cx="505"
						cy="265"
						r="7.5"
						fill="#38bdf8"
						opacity="0.55"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="505"
						cy="265"
						r="3.2"
						fill="#67e8f9"
						opacity="1.0"
						className="desktop-twinkle-c"
					/>
					<circle cx="505" cy="265" r="1.5" fill="#ffffff" />

					{/* Nó G (550, 275) */}
					<circle
						cx="550"
						cy="275"
						r="7"
						fill="#10b981"
						opacity="0.55"
						filter="url(#star-halo-blur)"
					/>
					<circle
						cx="550"
						cy="275"
						r="3.0"
						fill="#34d399"
						opacity="1.0"
						className="desktop-twinkle-a"
					/>
					<circle cx="550" cy="275" r="1.4" fill="#ffffff" />
				</g>
			</g>

			{/* ========================================================================= */}
			{/* PONTOS ESTÁTICOS (mesmo formato de ponto redondo simples/halo+core da    */}
			{/* janela em ArchitecturalResidenceIllustration.tsx). Distribuição via grid */}
			{/* jittered: células de 56px, ~70% preenchidas, jitter interno — cobertura  */}
			{/* uniforme sem aglomerado nem buraco, evitando planeta/lua/Saturno/mesh.   */}
			{/* ========================================================================= */}
			<g data-testid="auth-static-points">
				<circle cx="72.2" cy="35.6" r="1.7" fill="#a7f3d0" opacity="0.38" />
				<g className="desktop-twinkle-a">
					<circle cx="118.3" cy="8.4" r="4.3" fill="var(--warm)" opacity="0.16" />
					<circle cx="118.3" cy="8.4" r="1.8" fill="var(--warm)" opacity="0.82" />
				</g>
				<circle cx="204.8" cy="28" r="2" fill="#34d399" opacity="0.35" />
				<g className="desktop-twinkle-a">
					<circle cx="233.7" cy="6" r="3.6" fill="#a7f3d0" opacity="0.24" />
					<circle cx="233.7" cy="6" r="1.5" fill="#a7f3d0" opacity="0.92" />
				</g>
				<circle cx="306.6" cy="28.1" r="1.4" fill="var(--warm)" opacity="0.46" />
				<circle cx="372.8" cy="8.8" r="1.8" fill="#67e8f9" opacity="0.33" />
				<g className="desktop-twinkle-a">
					<circle cx="441.2" cy="37.3" r="4.3" fill="#67e8f9" opacity="0.22" />
					<circle cx="441.2" cy="37.3" r="1.8" fill="#67e8f9" opacity="0.82" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="493.1" cy="11.6" r="4.1" fill="var(--warm)" opacity="0.20" />
					<circle cx="493.1" cy="11.6" r="1.7" fill="var(--warm)" opacity="0.83" />
				</g>
				<circle cx="581.4" cy="8.5" r="1" fill="#67e8f9" opacity="0.60" />
				<circle cx="35.9" cy="73" r="0.9" fill="#67e8f9" opacity="0.54" />
				<circle cx="67.4" cy="53.4" r="1.4" fill="var(--warm)" opacity="0.44" />
				<g className="desktop-twinkle-b">
					<circle cx="150.5" cy="78.6" r="3.1" fill="var(--warm)" opacity="0.16" />
					<circle cx="150.5" cy="78.6" r="1.3" fill="var(--warm)" opacity="0.78" />
				</g>
				<circle cx="182.3" cy="54.5" r="0.7" fill="var(--primary)" opacity="0.33" />
				<circle cx="240" cy="47.1" r="0.8" fill="var(--primary)" opacity="0.38" />
				<circle cx="311.7" cy="75" r="1.6" fill="#ffffff" opacity="0.63" />
				<circle cx="341" cy="69.5" r="2" fill="#ffffff" opacity="0.75" />
				<g className="desktop-twinkle-c">
					<circle cx="444.6" cy="78.5" r="2.6" fill="#ffffff" opacity="0.20" />
					<circle cx="444.6" cy="78.5" r="1.1" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-b">
					<circle cx="494.6" cy="67.6" r="2.2" fill="#ffffff" opacity="0.20" />
					<circle cx="494.6" cy="67.6" r="0.9" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="578.2" cy="72.5" r="2" fill="var(--primary)" opacity="0.41" />
				<circle cx="61.2" cy="101.6" r="1.5" fill="#67e8f9" opacity="0.52" />
				<g className="desktop-twinkle-c">
					<circle cx="121.5" cy="107" r="2.9" fill="var(--primary)" opacity="0.23" />
					<circle cx="121.5" cy="107" r="1.2" fill="var(--primary)" opacity="0.92" />
				</g>
				<circle cx="198" cy="92.2" r="1.1" fill="#34d399" opacity="0.32" />
				<g className="desktop-twinkle-b">
					<circle cx="240.7" cy="119" r="4.6" fill="#ffffff" opacity="0.20" />
					<circle cx="240.7" cy="119" r="1.9" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="319.1" cy="103.6" r="1.7" fill="#ffffff" opacity="0.66" />
				<circle cx="356.4" cy="121.8" r="1.2" fill="#ffffff" opacity="0.58" />
				<circle cx="436.7" cy="109" r="1.4" fill="#ffffff" opacity="0.95" />
				<circle cx="485.1" cy="114" r="1.5" fill="#ffffff" opacity="0.69" />
				<circle cx="567.4" cy="116.9" r="1.9" fill="#ffffff" opacity="0.95" />
				<circle cx="35.3" cy="139.5" r="1.7" fill="#a7f3d0" opacity="0.60" />
				<g className="desktop-twinkle-c">
					<circle cx="54.4" cy="138.3" r="3.6" fill="var(--primary)" opacity="0.16" />
					<circle cx="54.4" cy="138.3" r="1.5" fill="var(--primary)" opacity="0.84" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="130.3" cy="154.4" r="4.6" fill="#67e8f9" opacity="0.23" />
					<circle cx="130.3" cy="154.4" r="1.9" fill="#67e8f9" opacity="0.87" />
				</g>
				<circle cx="205.7" cy="158.5" r="1.2" fill="#ffffff" opacity="0.84" />
				<g className="desktop-twinkle-a">
					<circle cx="271.9" cy="160" r="3.4" fill="#ffffff" opacity="0.24" />
					<circle cx="271.9" cy="160" r="1.4" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="325.3" cy="160.6" r="1.2" fill="#ffffff" opacity="0.89" />
				<circle cx="342.9" cy="132" r="1.8" fill="#ffffff" opacity="0.85" />
				<circle cx="451.7" cy="157" r="1.4" fill="#ffffff" opacity="0.73" />
				<circle cx="491.9" cy="135" r="0.7" fill="#ffffff" opacity="0.68" />
				<circle cx="553.8" cy="155.3" r="1.9" fill="#ffffff" opacity="0.77" />
				<g className="desktop-twinkle-b">
					<circle cx="61.7" cy="191.9" r="3.6" fill="#ffffff" opacity="0.18" />
					<circle cx="61.7" cy="191.9" r="1.5" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="110.9" cy="177.8" r="1.4" fill="#34d399" opacity="0.64" />
				<circle cx="193.1" cy="175.6" r="1.1" fill="#34d399" opacity="0.49" />
				<circle cx="233.6" cy="198" r="1.5" fill="#ffffff" opacity="0.71" />
				<circle cx="309.3" cy="179.5" r="0.7" fill="#ffffff" opacity="0.81" />
				<circle cx="343.2" cy="172.4" r="1.6" fill="#ffffff" opacity="0.86" />
				<circle cx="436.1" cy="185.4" r="1.1" fill="#ffffff" opacity="0.61" />
				<g className="desktop-twinkle-a">
					<circle cx="467.9" cy="175.1" r="4.1" fill="#ffffff" opacity="0.18" />
					<circle cx="467.9" cy="175.1" r="1.7" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="573.5" cy="188.9" r="3.6" fill="#ffffff" opacity="0.18" />
					<circle cx="573.5" cy="188.9" r="1.5" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="18.4" cy="224.7" r="1.9" fill="#ffffff" opacity="0.66" />
				<g className="desktop-twinkle-b">
					<circle cx="68.3" cy="216.1" r="3.4" fill="#ffffff" opacity="0.22" />
					<circle cx="68.3" cy="216.1" r="1.4" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="342.2" cy="216.5" r="2.2" fill="#ffffff" opacity="0.16" />
					<circle cx="342.2" cy="216.5" r="0.9" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="386.7" cy="222.1" r="1.7" fill="#ffffff" opacity="0.60" />
				<g className="desktop-twinkle-c">
					<circle cx="430.5" cy="223.8" r="2.4" fill="#ffffff" opacity="0.22" />
					<circle cx="430.5" cy="223.8" r="1" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="582.6" cy="214.8" r="1.8" fill="#ffffff" opacity="0.94" />
				<circle cx="407.4" cy="303" r="1.7" fill="#ffffff" opacity="0.79" />
				<g className="desktop-twinkle-b">
					<circle cx="531.3" cy="360.8" r="2.9" fill="var(--primary)" opacity="0.19" />
					<circle cx="531.3" cy="360.8" r="1.2" fill="var(--primary)" opacity="0.88" />
				</g>
				<circle cx="467.5" cy="391.1" r="1" fill="#34d399" opacity="0.54" />
				<circle cx="508.7" cy="415.4" r="1.2" fill="#ffffff" opacity="0.58" />
				<circle cx="536.8" cy="453.1" r="0.6" fill="#ffffff" opacity="0.72" />
				<circle cx="576.8" cy="427.7" r="0.7" fill="#ffffff" opacity="0.58" />
				<circle cx="474.9" cy="493.4" r="1.4" fill="#ffffff" opacity="0.74" />
				<circle cx="539.2" cy="476.1" r="1.3" fill="#ffffff" opacity="0.75" />
				<circle cx="495.1" cy="581.6" r="1.2" fill="#ffffff" opacity="0.74" />
				<g className="desktop-twinkle-c">
					<circle cx="495.5" cy="613.3" r="4.1" fill="#ffffff" opacity="0.22" />
					<circle cx="495.5" cy="613.3" r="1.7" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="564.2" cy="602.6" r="2.6" fill="#ffffff" opacity="0.17" />
					<circle cx="564.2" cy="602.6" r="1.1" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="438.2" cy="651.8" r="1.7" fill="var(--warm)" opacity="0.46" />
				<circle cx="484.2" cy="643.7" r="1.9" fill="#ffffff" opacity="0.80" />
				<circle cx="551.9" cy="640.9" r="0.9" fill="#ffffff" opacity="0.69" />
				<g className="desktop-twinkle-b">
					<circle cx="352.4" cy="742.1" r="2.9" fill="#ffffff" opacity="0.24" />
					<circle cx="352.4" cy="742.1" r="1.2" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="233" cy="792.3" r="4.3" fill="#ffffff" opacity="0.17" />
					<circle cx="233" cy="792.3" r="1.8" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="261.2" cy="789.8" r="0.9" fill="#ffffff" opacity="0.76" />
				<circle cx="363.7" cy="776.5" r="1.8" fill="#ffffff" opacity="0.76" />
				<circle cx="568.6" cy="786.1" r="0.9" fill="#ffffff" opacity="0.78" />
				<circle cx="70.5" cy="828.4" r="1.8" fill="#ffffff" opacity="0.63" />
				<g className="desktop-twinkle-b">
					<circle cx="121.6" cy="826.1" r="4.3" fill="#ffffff" opacity="0.20" />
					<circle cx="121.6" cy="826.1" r="1.8" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="189" cy="806.2" r="2.6" fill="#ffffff" opacity="0.19" />
					<circle cx="189" cy="806.2" r="1.1" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="240.2" cy="833.2" r="1" fill="#ffffff" opacity="0.80" />
				<circle cx="309.3" cy="825.1" r="2" fill="#ffffff" opacity="0.81" />
				<circle cx="371.8" cy="823.6" r="1.6" fill="#ffffff" opacity="0.83" />
				<g className="desktop-twinkle-b">
					<circle cx="476.8" cy="826.4" r="4.8" fill="#ffffff" opacity="0.15" />
					<circle cx="476.8" cy="826.4" r="2" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="537.5" cy="814.1" r="0.7" fill="#ffffff" opacity="0.88" />
				<circle cx="19.5" cy="849.3" r="0.6" fill="#ffffff" opacity="0.59" />
				<circle cx="58.9" cy="877.2" r="1.3" fill="#ffffff" opacity="0.87" />
				<circle cx="145.5" cy="851.3" r="1" fill="#ffffff" opacity="0.80" />
				<circle cx="203.6" cy="848" r="0.6" fill="#ffffff" opacity="0.56" />
				<g className="desktop-twinkle-b">
					<circle cx="245.4" cy="863.3" r="3.6" fill="#ffffff" opacity="0.16" />
					<circle cx="245.4" cy="863.3" r="1.5" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="299.7" cy="856.3" r="4.8" fill="#ffffff" opacity="0.15" />
					<circle cx="299.7" cy="856.3" r="2" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="365.7" cy="865" r="1.8" fill="#ffffff" opacity="0.68" />
				<circle cx="426" cy="856" r="1.7" fill="#ffffff" opacity="0.81" />
				<circle cx="474.7" cy="863.9" r="1.5" fill="#ffffff" opacity="0.74" />
				<circle cx="561.9" cy="850.8" r="1.4" fill="var(--warm)" opacity="0.49" />
				<circle cx="78.6" cy="902.5" r="1.1" fill="#ffffff" opacity="0.83" />
				<circle cx="104.2" cy="900.8" r="0.7" fill="#ffffff" opacity="0.55" />
				<g className="desktop-twinkle-c">
					<circle cx="205.5" cy="914" r="3.1" fill="#ffffff" opacity="0.24" />
					<circle cx="205.5" cy="914" r="1.3" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-b">
					<circle cx="240.5" cy="915.3" r="4.6" fill="#ffffff" opacity="0.24" />
					<circle cx="240.5" cy="915.3" r="1.9" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="321.5" cy="900" r="2.4" fill="#ffffff" opacity="0.22" />
					<circle cx="321.5" cy="900" r="1" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="359.8" cy="914.7" r="2" fill="#ffffff" opacity="0.58" />
				<circle cx="443.9" cy="895.6" r="0.9" fill="#ffffff" opacity="0.72" />
				<circle cx="482.9" cy="894.7" r="0.9" fill="#ffffff" opacity="0.78" />
				<circle cx="565" cy="908.4" r="1" fill="#a7f3d0" opacity="0.47" />
				<g className="desktop-twinkle-a">
					<circle cx="12.2" cy="943.1" r="3.8" fill="#67e8f9" opacity="0.23" />
					<circle cx="12.2" cy="943.1" r="1.6" fill="#67e8f9" opacity="0.90" />
				</g>
				<g className="desktop-twinkle-b">
					<circle cx="67.2" cy="961.8" r="4.1" fill="#ffffff" opacity="0.24" />
					<circle cx="67.2" cy="961.8" r="1.7" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-b">
					<circle cx="94.8" cy="956.6" r="4.1" fill="#ffffff" opacity="0.24" />
					<circle cx="94.8" cy="956.6" r="1.7" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="181.7" cy="958.2" r="1.3" fill="#ffffff" opacity="0.85" />
				<g className="desktop-twinkle-b">
					<circle cx="225.7" cy="937" r="3.1" fill="#ffffff" opacity="0.23" />
					<circle cx="225.7" cy="937" r="1.3" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-b">
					<circle cx="307.4" cy="957.6" r="4.3" fill="#ffffff" opacity="0.24" />
					<circle cx="307.4" cy="957.6" r="1.8" fill="#ffffff" opacity="0.98" />
				</g>
				<circle cx="357" cy="948.4" r="2" fill="#ffffff" opacity="0.92" />
				<circle cx="443.2" cy="934.1" r="1.1" fill="#ffffff" opacity="0.62" />
				<circle cx="475.5" cy="954.5" r="0.9" fill="var(--warm)" opacity="0.49" />
				<circle cx="550.6" cy="928.4" r="1" fill="var(--primary)" opacity="0.45" />
				<g className="desktop-twinkle-c">
					<circle cx="24.4" cy="979.9" r="4.3" fill="var(--warm)" opacity="0.22" />
					<circle cx="24.4" cy="979.9" r="1.8" fill="var(--warm)" opacity="0.86" />
				</g>
				<circle cx="120.4" cy="979.5" r="1.4" fill="#ffffff" opacity="0.56" />
				<circle cx="173.3" cy="975.5" r="1.7" fill="#ffffff" opacity="0.92" />
				<circle cx="219.8" cy="983.7" r="1.5" fill="#ffffff" opacity="0.73" />
				<circle cx="300.1" cy="982.9" r="1.3" fill="#ffffff" opacity="0.91" />
				<circle cx="363.5" cy="971.9" r="1.8" fill="#ffffff" opacity="0.70" />
				<circle cx="446.4" cy="985.3" r="1.3" fill="#a7f3d0" opacity="0.61" />
				<g className="desktop-twinkle-a">
					<circle cx="487.1" cy="977.1" r="4.8" fill="var(--primary)" opacity="0.16" />
					<circle cx="487.1" cy="977.1" r="2" fill="var(--primary)" opacity="0.83" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="550.3" cy="976.4" r="4.3" fill="#67e8f9" opacity="0.18" />
					<circle cx="550.3" cy="976.4" r="1.8" fill="#67e8f9" opacity="0.92" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="420" cy="175" r="4.7" fill="#ffffff" opacity="0.28" />
					<circle cx="420" cy="175" r="1.8" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-a">
					<circle cx="470" cy="195" r="3.6" fill="#ffffff" opacity="0.28" />
					<circle cx="470" cy="195" r="1.4" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="520" cy="172" r="3.9" fill="#ffffff" opacity="0.28" />
					<circle cx="520" cy="172" r="1.5" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-c">
					<circle cx="560" cy="205" r="4.4" fill="#ffffff" opacity="0.28" />
					<circle cx="560" cy="205" r="1.7" fill="#ffffff" opacity="0.98" />
				</g>
				<g className="desktop-twinkle-b">
					<circle cx="440" cy="215" r="4.7" fill="#ffffff" opacity="0.28" />
					<circle cx="440" cy="215" r="1.8" fill="#ffffff" opacity="0.98" />
				</g>
			</g>

			{/* ========================================================================= */}
			{/* MALHA DE QUADRADOS (GRID TÉCNICO BLUEPRINT)                               */}
			{/* ========================================================================= */}
			<rect width="600" height="1000" fill="url(#desktop-auth-grid)" />

			{/* ========================================================================= */}
			{/* METEOROS / ESTRELAS CADENTES CÓSMICAS (Animações periódicas com cauda)    */}
			{/* ========================================================================= */}
			<g data-testid="auth-meteors">
				{/* Meteoro 1: Superior direito passando acima da lua */}
				<g transform="translate(540, 70)">
					<g className="desktop-meteor-1">
						<line
							x1="0"
							y1="0"
							x2="85"
							y2="-52"
							stroke="url(#meteor-tail-emerald)"
							strokeWidth="1.8"
							strokeLinecap="round"
						/>
						<line
							x1="0"
							y1="0"
							x2="35"
							y2="-21"
							stroke="#ffffff"
							strokeWidth="1.0"
							opacity="0.9"
							strokeLinecap="round"
						/>
						<circle
							cx="0"
							cy="0"
							r="2.5"
							fill="#a7f3d0"
							filter="url(#meteor-head-glow)"
							opacity="0.85"
						/>
						<circle cx="0" cy="0" r="1.4" fill="#ffffff" />
					</g>
				</g>

				{/* Meteoro 2: Superior centro-direito com trajetória mais inclinada */}
				<g transform="translate(460, 35)">
					<g className="desktop-meteor-2">
						<line
							x1="0"
							y1="0"
							x2="75"
							y2="-57"
							stroke="url(#meteor-tail-cosmic)"
							strokeWidth="1.6"
							strokeLinecap="round"
						/>
						<line
							x1="0"
							y1="0"
							x2="30"
							y2="-23"
							stroke="#ffffff"
							strokeWidth="0.9"
							opacity="0.85"
							strokeLinecap="round"
						/>
						<circle
							cx="0"
							cy="0"
							r="2.2"
							fill="#67e8f9"
							filter="url(#meteor-head-glow)"
							opacity="0.8"
						/>
						<circle cx="0" cy="0" r="1.2" fill="#ffffff" />
					</g>
				</g>

				{/* Meteoro 3: Discreto e distante, passando abaixo da lua */}
				<g transform="translate(570, 310)">
					<g className="desktop-meteor-3">
						<line
							x1="0"
							y1="0"
							x2="55"
							y2="-34"
							stroke="url(#meteor-tail-emerald)"
							strokeWidth="1.3"
							strokeLinecap="round"
							opacity="0.75"
						/>
						<circle
							cx="0"
							cy="0"
							r="1.8"
							fill="#6ee7b7"
							filter="url(#meteor-head-glow)"
							opacity="0.75"
						/>
						<circle cx="0" cy="0" r="1.0" fill="#ffffff" />
					</g>
				</g>

				{/* Meteoro 4: Meio da tela, passando na lateral direita do formulário */}
				<g transform="translate(560, 520)">
					<g className="desktop-meteor-4">
						<line
							x1="0"
							y1="0"
							x2="65"
							y2="-41"
							stroke="url(#meteor-tail-cosmic)"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
						<line
							x1="0"
							y1="0"
							x2="25"
							y2="-16"
							stroke="#ffffff"
							strokeWidth="0.9"
							opacity="0.9"
							strokeLinecap="round"
						/>
						<circle
							cx="0"
							cy="0"
							r="2.0"
							fill="#a7f3d0"
							filter="url(#meteor-head-glow)"
							opacity="0.8"
						/>
						<circle cx="0" cy="0" r="1.1" fill="#ffffff" />
					</g>
				</g>

				{/* Meteoro 5: Parte inferior, passando acima/ao lado de Saturno */}
				<g transform="translate(520, 810)">
					<g className="desktop-meteor-5">
						<line
							x1="0"
							y1="0"
							x2="60"
							y2="-37"
							stroke="url(#meteor-tail-emerald)"
							strokeWidth="1.4"
							strokeLinecap="round"
						/>
						<line
							x1="0"
							y1="0"
							x2="22"
							y2="-14"
							stroke="#ffffff"
							strokeWidth="0.8"
							opacity="0.85"
							strokeLinecap="round"
						/>
						<circle
							cx="0"
							cy="0"
							r="1.9"
							fill="#67e8f9"
							filter="url(#meteor-head-glow)"
							opacity="0.8"
						/>
						<circle cx="0" cy="0" r="1.0" fill="#ffffff" />
					</g>
				</g>
			</g>

			{/* ========================================================================= */}
			{/* CAMADAS DE DERIVA CONTÍNUA DAS ESTRELAS EM LOOP (ESQUERDA -> DIREITA)    */}
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

			{/* Mira + leitura de coordenada do overlay de debug (ver coordHover
			    acima) — só existe em dev, removida do bundle de produção. */}
			{import.meta.env.DEV && coordHover && (
				<g pointerEvents="none">
					<line
						x1={coordHover.x}
						y1="0"
						x2={coordHover.x}
						y2="1000"
						stroke="#f472b6"
						strokeWidth="1"
						strokeDasharray="4 3"
						opacity="0.6"
					/>
					<line
						x1="0"
						y1={coordHover.y}
						x2="600"
						y2={coordHover.y}
						stroke="#f472b6"
						strokeWidth="1"
						strokeDasharray="4 3"
						opacity="0.6"
					/>
					<circle
						cx={coordHover.x}
						cy={coordHover.y}
						r="4"
						fill="none"
						stroke="#f472b6"
						strokeWidth="1.5"
					/>
					<rect
						x={Math.min(Math.max(coordHover.x - 55, 4), 600 - 114)}
						y={Math.min(Math.max(coordHover.y - 32, 4), 1000 - 24)}
						width="110"
						height="20"
						rx="4"
						fill="#000000"
						opacity="0.75"
					/>
					<text
						x={Math.min(Math.max(coordHover.x - 55, 4), 600 - 114) + 55}
						y={Math.min(Math.max(coordHover.y - 32, 4), 1000 - 24) + 14}
						textAnchor="middle"
						fill="#f472b6"
						fontSize="12"
						fontFamily="monospace"
					>
						cx {coordHover.x} cy {coordHover.y}
					</text>
				</g>
			)}
		</svg>
	);
}

export default DesktopAuthBackground;
