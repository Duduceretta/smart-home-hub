import { useMemo } from "react";
import { getHardwareCapabilities } from "@/core/utils/hardware";
import { useMediaQuery } from "./useMediaQuery";

export interface ReducedGraphicsState {
	/**
	 * Verdadeiro se a máquina possuir limitação de hardware OU o usuário tiver preferência
	 * por movimentos reduzidos. Ambos forçam estado estático e desligam efeitos custosos.
	 */
	isReducedGraphics: boolean;
	/**
	 * Preferência explícita do usuário no sistema operacional.
	 */
	prefersReducedMotion: boolean;
	/**
	 * Limitação detectada de hardware (software renderer / GPU ausente).
	 */
	isLowEndHardware: boolean;
}

export function useReducedGraphics(): ReducedGraphicsState {
	const prefersReducedMotion = useMediaQuery(
		"(prefers-reduced-motion: reduce)",
	);
	const hardware = useMemo(() => getHardwareCapabilities(), []);

	const isReducedGraphics = prefersReducedMotion || hardware.isLowEndHardware;

	return {
		isReducedGraphics,
		prefersReducedMotion,
		isLowEndHardware: hardware.isLowEndHardware,
	};
}
