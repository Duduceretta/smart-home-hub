import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	_resetHardwareCapabilitiesCache,
	_setMockHardwareCapabilities,
	detectHardwareCapabilities,
	getHardwareCapabilities,
} from "../hardware";

describe("Hardware Capabilities Detection Unit Tests", () => {
	beforeEach(() => {
		_resetHardwareCapabilitiesCache();
	});

	afterEach(() => {
		_resetHardwareCapabilitiesCache();
		vi.restoreAllMocks();
	});

	it("detectHardwareCapabilities_StandardHardware_ShouldReturnFalseForSoftwareRenderer", () => {
		const caps = detectHardwareCapabilities();
		expect(caps).toHaveProperty("isSoftwareRenderer");
		expect(caps).toHaveProperty("isLowEndHardware");
		expect(caps).toHaveProperty("renderer");
		expect(caps).toHaveProperty("hardwareConcurrency");
	});

	it("detectHardwareCapabilities_LowConcurrency_ShouldDetectLowConcurrencyCorrectly", () => {
		const originalConcurrency = navigator.hardwareConcurrency;
		Object.defineProperty(navigator, "hardwareConcurrency", {
			value: 2,
			configurable: true,
		});

		const caps = detectHardwareCapabilities();
		expect(caps.isLowConcurrency).toBe(true);
		expect(caps.hardwareConcurrency).toBe(2);

		Object.defineProperty(navigator, "hardwareConcurrency", {
			value: originalConcurrency,
			configurable: true,
		});
	});

	it("getHardwareCapabilities_ShouldCacheResult", () => {
		const first = getHardwareCapabilities();
		const second = getHardwareCapabilities();
		expect(first).toBe(second);
	});

	it("_setMockHardwareCapabilities_ShouldOverrideResult", () => {
		_setMockHardwareCapabilities({
			isSoftwareRenderer: true,
			isLowConcurrency: false,
			isLowEndHardware: true,
			renderer: "Google SwiftShader",
			hardwareConcurrency: 8,
		});

		const caps = getHardwareCapabilities();
		expect(caps.isSoftwareRenderer).toBe(true);
		expect(caps.isLowEndHardware).toBe(true);
		expect(caps.renderer).toBe("Google SwiftShader");
	});

	it("detectHardwareCapabilities_SwiftShaderRenderer_ShouldBeFlaggedAsSoftwareRenderer", () => {
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				if (tagName.toLowerCase() === "canvas") {
					return {
						getContext: (type: string) => {
							if (type === "webgl" || type === "experimental-webgl") {
								return {
									getExtension: (ext: string) => {
										if (ext === "WEBGL_debug_renderer_info") {
											return { UNMASKED_RENDERER_WEBGL: 37446 };
										}
										return null;
									},
									getParameter: (param: number) => {
										if (param === 37446) {
											return "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)";
										}
										return "";
									},
								};
							}
							return null;
						},
					} as unknown as HTMLElement;
				}
				return originalCreateElement(tagName);
			},
		);

		const caps = detectHardwareCapabilities();
		expect(caps.isSoftwareRenderer).toBe(true);
		expect(caps.isLowEndHardware).toBe(true);
		expect(caps.renderer).toContain("SwiftShader");
	});

	it("detectHardwareCapabilities_NvidiaRenderer_ShouldNotBeFlaggedAsSoftwareRenderer", () => {
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				if (tagName.toLowerCase() === "canvas") {
					return {
						getContext: (type: string) => {
							if (type === "webgl" || type === "experimental-webgl") {
								return {
									getExtension: (ext: string) => {
										if (ext === "WEBGL_debug_renderer_info") {
											return { UNMASKED_RENDERER_WEBGL: 37446 };
										}
										return null;
									},
									getParameter: (param: number) => {
										if (param === 37446) {
											return "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)";
										}
										return "";
									},
								};
							}
							return null;
						},
					} as unknown as HTMLElement;
				}
				return originalCreateElement(tagName);
			},
		);

		const caps = detectHardwareCapabilities();
		expect(caps.isSoftwareRenderer).toBe(false);
		expect(caps.isLowEndHardware).toBe(false);
	});
});
