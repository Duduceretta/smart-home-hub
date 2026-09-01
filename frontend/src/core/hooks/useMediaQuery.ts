import { useEffect, useState } from "react";

/**
 * Espelha o resultado de uma media query (`window.matchMedia`) como estado
 * React, atualizado em tempo real conforme a viewport muda. Usado tanto para
 * decisões de layout puramente visuais (reduzir ticks de um gráfico) quanto
 * para decisões de comportamento que o CSS sozinho não resolve (ex: só
 * auto-selecionar o primeiro item de uma lista master-detail em telas largas
 * o bastante pra mostrar lista + detalhe ao mesmo tempo).
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(
		() => typeof window !== "undefined" && window.matchMedia(query).matches,
	);

	useEffect(() => {
		const mediaQueryList = window.matchMedia(query);
		const handleChange = () => setMatches(mediaQueryList.matches);

		handleChange();
		mediaQueryList.addEventListener("change", handleChange);
		return () => mediaQueryList.removeEventListener("change", handleChange);
	}, [query]);

	return matches;
}
