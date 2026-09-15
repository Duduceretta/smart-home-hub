export interface HardwareCapabilities {
	isSoftwareRenderer: boolean;
	isLowConcurrency: boolean;
	isLowEndHardware: boolean;
	renderer: string;
	hardwareConcurrency: number;
}

const SOFTWARE_RENDERER_REGEX =
	/SwiftShader|llvmpipe|softpipe|Microsoft Basic Render Driver|Apple Software Renderer|Software Rasterizer|Lavapipe/i;

let cachedCapabilities: HardwareCapabilities | null = null;

export function detectHardwareCapabilities(): HardwareCapabilities {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return {
			isSoftwareRenderer: false,
			isLowConcurrency: false,
			isLowEndHardware: false,
			renderer: "",
			hardwareConcurrency: 4,
		};
	}

	let renderer = "";
	let isSoftwareRenderer = false;

	try {
		const canvas = document.createElement("canvas");
		const gl = (canvas.getContext("webgl") ||
			canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

		if (gl) {
			const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
			if (debugInfo) {
				renderer =
					(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as
						| string
						| null) ?? "";
			} else {
				renderer = (gl.getParameter(gl.RENDERER) as string | null) ?? "";
			}
			isSoftwareRenderer = SOFTWARE_RENDERER_REGEX.test(renderer ?? "");
		}
	} catch {
		isSoftwareRenderer = false;
		renderer = "";
	}

	const concurrency =
		typeof navigator !== "undefined" &&
		typeof navigator.hardwareConcurrency === "number"
			? navigator.hardwareConcurrency
			: 4;

	const isLowConcurrency = concurrency <= 2;
	// Condição de degradação gráfica: renderização por software detectada via WebGL
	const isLowEndHardware = isSoftwareRenderer;

	return {
		isSoftwareRenderer,
		isLowConcurrency,
		isLowEndHardware,
		renderer,
		hardwareConcurrency: concurrency,
	};
}

export function getHardwareCapabilities(): HardwareCapabilities {
	if (!cachedCapabilities) {
		cachedCapabilities = detectHardwareCapabilities();
	}
	return cachedCapabilities;
}

/**
 * Função de conveniência para testes e benchmarks.
 */
export function _setMockHardwareCapabilities(
	caps: HardwareCapabilities | null,
): void {
	cachedCapabilities = caps;
}

/**
 * Função de conveniência para resetar o cache durante testes unitários.
 */
export function _resetHardwareCapabilitiesCache(): void {
	cachedCapabilities = null;
}
