import type React from "react";
import { useCallback, useState } from "react";

export interface RippleItem {
	id: number;
	x: number;
	y: number;
	size: number;
}

let nextRippleId = 0;

export function useRipple() {
	const [ripples, setRipples] = useState<RippleItem[]>([]);

	const createRipple = useCallback(
		(
			event:
				| React.PointerEvent<HTMLElement>
				| React.MouseEvent<HTMLElement>
				| React.TouchEvent<HTMLElement>,
		) => {
			// Apenas responde ao clique primário (botão esquerdo / toque)
			if ("button" in event && event.button !== 0) return;

			const element = event.currentTarget;

			let clientX: number | null = null;
			let clientY: number | null = null;

			if (
				"touches" in event &&
				event.touches &&
				event.touches.length > 0 &&
				event.touches[0]
			) {
				clientX = event.touches[0].clientX;
				clientY = event.touches[0].clientY;
			} else if ("clientX" in event && typeof event.clientX === "number") {
				clientX = event.clientX;
				clientY = event.clientY;
			}

			// `getBoundingClientRect()` força o navegador a resolver (flush)
			// qualquer layout pendente de forma síncrona — bem no meio do
			// handler de clique, junto com a navegação de rota que esse mesmo
			// clique dispara. Em cliques rápidos e sucessivos na sidebar, cada
			// novo clique acaba "pagando" o layout pendente do clique
			// anterior de forma bloqueante (layout thrashing), travando a
			// thread principal — medido no profiler como o maior self-time
			// isolado da faixa "Main" durante o bug. Adiar a leitura pra um
			// `requestAnimationFrame` tira essa medição do caminho síncrono
			// do clique, deixando o navegador assentar o layout normalmente.
			requestAnimationFrame(() => {
				const rect = element.getBoundingClientRect();
				const x = (clientX ?? rect.left + rect.width / 2) - rect.left;
				const y = (clientY ?? rect.top + rect.height / 2) - rect.top;

				// Raio suficiente para cobrir do ponto de toque até o canto mais distante (estilo MUI)
				const cornerX = Math.max(x, rect.width - x);
				const cornerY = Math.max(y, rect.height - y);
				const radius = Math.hypot(cornerX, cornerY);
				const size = radius * 2;

				const newId = ++nextRippleId;
				const newRipple: RippleItem = {
					id: newId,
					x: x - radius,
					y: y - radius,
					size,
				};

				// Mantém no máximo 2 ripples simultâneos por botão para evitar acúmulo de nós no DOM
				setRipples((prev) => [...prev.slice(-1), newRipple]);

				// Limpeza preventiva caso onAnimationEnd seja abortado por troca rápida de rota
				setTimeout(() => {
					setRipples((prev) => prev.filter((r) => r.id !== newId));
				}, 600);
			});
		},
		[],
	);

	const removeRipple = useCallback((id: number) => {
		setRipples((prev) => prev.filter((r) => r.id !== id));
	}, []);

	return { ripples, createRipple, removeRipple };
}

export interface RippleProps {
	ripples: RippleItem[];
	onClear: (id: number) => void;
	colorClass?: string;
}

/**
 * Renderizador de onda circular (estilo Material-UI / MUI Ripple).
 * Deve ser colocado dentro de um contêiner relativo com overflow-hidden.
 */
export function Ripple({
	ripples,
	onClear,
	colorClass = "bg-primary/20",
}: RippleProps) {
	if (ripples.length === 0) return null;

	return (
		<span
			className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-0 select-none"
			aria-hidden="true"
		>
			{ripples.map((ripple) => (
				<span
					key={ripple.id}
					onAnimationEnd={() => onClear(ripple.id)}
					style={{
						top: ripple.y,
						left: ripple.x,
						width: ripple.size,
						height: ripple.size,
					}}
					className={`absolute rounded-full animate-mui-ripple ${colorClass} will-change-transform`}
				/>
			))}
		</span>
	);
}
