import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { act, renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { RegisterForm } from "../RegisterForm";

describe("RegisterForm Unit Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await i18n.changeLanguage("pt-BR");
	});

	it("RegisterForm_Consent_ShouldRenderTermsAndPrivacyLinks", () => {
		renderWithProviders(
			<MemoryRouter>
				<RegisterForm />
			</MemoryRouter>,
		);

		const termsLink = screen.getByRole("link", { name: "Termos de Serviço" });
		expect(termsLink).toHaveAttribute("href", "/legal/terms");
		expect(termsLink).toHaveAttribute("target", "_blank");

		const privacyLink = screen.getByRole("link", {
			name: "Política de Privacidade",
		});
		expect(privacyLink).toHaveAttribute("href", "/legal/privacy");
		expect(privacyLink).toHaveAttribute("target", "_blank");
	});

	it("RegisterForm_Rendering_ShouldRenderFieldsAndBrandedPlaceholder", () => {
		renderWithProviders(
			<MemoryRouter>
				<RegisterForm />
			</MemoryRouter>,
		);

		const emailInput = screen.getByPlaceholderText("admin@nexushub.local");
		expect(emailInput).toBeInTheDocument();

		const submitButton = screen.getByRole("button", { name: "Criar Conta" });
		expect(submitButton).toBeInTheDocument();
		expect(submitButton).not.toBeDisabled();

		const googleButton = screen.getByRole("button", {
			name: "Cadastrar com Google",
		});
		expect(googleButton).toBeInTheDocument();
	});

	it("RegisterForm_SubmittingState_ShouldRenderSpinnerAndDisableButton", async () => {
		const user = userEvent.setup();
		vi.spyOn(authApi, "registerWithEmail").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter>
				<RegisterForm />
			</MemoryRouter>,
		);

		await user.type(screen.getByPlaceholderText("Seu nome"), "Test User");
		await user.type(
			screen.getByPlaceholderText("admin@nexushub.local"),
			"valid@example.com",
		);
		const passwordInputs = screen.getAllByPlaceholderText("••••••••");
		await user.type(passwordInputs[0], "StrongP@ss1");
		await user.type(passwordInputs[1], "StrongP@ss1");

		const submitButton = screen.getByRole("button", { name: "Criar Conta" });
		await user.click(submitButton);

		expect(
			await screen.findByRole("button", { name: /Criando conta\.\.\./i }),
		).toBeDisabled();
		expect(
			screen
				.getByRole("button", { name: /Criando conta\.\.\./i })
				.querySelector(".animate-spin"),
		).toBeInTheDocument();
	});

	it("RegisterForm_ErrorDisplay_ShouldTranslateErrorsWhenLanguageChanges", async () => {
		const user = userEvent.setup();

		renderWithProviders(
			<MemoryRouter>
				<RegisterForm />
			</MemoryRouter>,
		);

		const submitButton = screen.getByRole("button", { name: "Criar Conta" });
		await user.click(submitButton);

		// Errors appear in Portuguese (default locale)
		expect(
			await screen.findByText("O nome deve ter no mínimo 3 caracteres."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Digite um formato de e-mail válido."),
		).toBeInTheDocument();

		// Switch to English dynamically
		await act(async () => {
			await i18n.changeLanguage("en-US");
		});

		// Errors should update dynamically to English without resubmitting
		expect(
			screen.getByText("Name must be at least 3 characters."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Enter a valid email address."),
		).toBeInTheDocument();

		// Switch back to Portuguese
		await act(async () => {
			await i18n.changeLanguage("pt-BR");
		});

		expect(
			screen.getByText("O nome deve ter no mínimo 3 caracteres."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Digite um formato de e-mail válido."),
		).toBeInTheDocument();
	});
});
