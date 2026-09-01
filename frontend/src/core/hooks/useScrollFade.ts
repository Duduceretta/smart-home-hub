import { useEffect, useRef, useState } from "react";

const EDGE_TOLERANCE_PX = 2;

/**
 * Rastreia a posição de scroll de um container horizontal pra saber se cada
 * fade de borda (esquerdo/direito) deve aparecer — usado em fileiras de
 * pills com overflow-x-auto (ScenesBar, DeviceTypeFilterChips). Atualiza via
 * rAF no onScroll (throttle leve pra não gerar re-render por frame durante o
 * arrasto) e calcula o estado inicial no mount, pra fileiras que já nascem
 * sem conteúdo suficiente pra rolar não mostrarem fade nenhum.
 */
export function useScrollFade<T extends HTMLElement>() {
	const ref = useRef<T>(null);
	const [showLeftFade, setShowLeftFade] = useState(false);
	const [showRightFade, setShowRightFade] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		let rafId: number | null = null;

		const updateFadeState = () => {
			rafId = null;
			setShowLeftFade(el.scrollLeft > 0);
			setShowRightFade(
				el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE_PX,
			);
		};

		const handleScroll = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(updateFadeState);
		};

		updateFadeState();
		el.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			el.removeEventListener("scroll", handleScroll);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, []);

	return { ref, showLeftFade, showRightFade };
}
