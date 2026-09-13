import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import i18n from "@/core/i18n";
import { useAuthErrorTranslator } from "../useAuthErrorTranslator";

describe("useAuthErrorTranslator Hook", () => {
	it("useAuthErrorTranslator_WhenKeyIsEmptyOrNull_ShouldReturnUndefined", () => {
		const { result } = renderHook(() => useAuthErrorTranslator());
		const translateError = result.current;

		expect(translateError(undefined)).toBeUndefined();
		expect(translateError(null)).toBeUndefined();
		expect(translateError("")).toBeUndefined();
	});

	it("useAuthErrorTranslator_WhenKnownKeyProvided_ShouldTranslateAccordingToLocale", async () => {
		await act(async () => {
			await i18n.changeLanguage("pt-BR");
		});

		const { result } = renderHook(() => useAuthErrorTranslator());

		expect(result.current("login.errors.invalidCredentials")).toBe(
			"E-mail ou senha incorretos.",
		);

		await act(async () => {
			await i18n.changeLanguage("en-US");
		});

		expect(result.current("login.errors.invalidCredentials")).toBe(
			"Incorrect email or password.",
		);

		await act(async () => {
			await i18n.changeLanguage("pt-BR");
		});
	});
});
