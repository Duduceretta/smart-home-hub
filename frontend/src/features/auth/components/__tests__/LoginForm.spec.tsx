import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { act, renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { LoginForm } from "../LoginForm";

describe("LoginForm Unit Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await i18n.changeLanguage("pt-BR");
	});

	it("LoginForm_Rendering_ShouldRenderFieldsPlaceholderAndAccessibleForgotPasswordLink", () => {
		renderWithProviders(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>,
		);

		const emailInput = screen.getByPlaceholderText("admin@nexushub.local");
		expect(emailInput).toBeInTheDocument();

		const passwordInput = screen.getByPlaceholderText("••••••••");
		expect(passwordInput).toBeInTheDocument();

		const forgotPasswordLink = screen.getByRole("link", {
			name: "Esqueceu a senha?",
		});
		expect(forgotPasswordLink).toBeInTheDocument();
		expect(forgotPasswordLink).toHaveAttribute("href", "/forgot-password");
		expect(forgotPasswordLink).not.toHaveAttribute("tabindex", "-1");

		const submitButton = screen.getByRole("button", { name: "Iniciar Sessão" });
		expect(submitButton).toBeInTheDocument();
		expect(submitButton).not.toBeDisabled();

		const googleButton = screen.getByRole("button", {
			name: "Continuar com Google",
		});
		expect(googleButton).toBeInTheDocument();
	});

	it("LoginForm_SubmittingState_ShouldRenderSpinnerAndDisableButton", async () => {
		const user = userEvent.setup();
		vi.spyOn(authApi, "loginWithEmail").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>,
		);

		await user.type(
			screen.getByPlaceholderText("admin@nexushub.local"),
			"valid@example.com",
		);
		await user.type(screen.getByPlaceholderText("••••••••"), "MySecretPass123");

		const submitButton = screen.getByRole("button", { name: "Iniciar Sessão" });
		await user.click(submitButton);

		expect(
			await screen.findByRole("button", { name: /Autenticando\.\.\./i }),
		).toBeDisabled();
		expect(
			screen
				.getByRole("button", { name: /Autenticando\.\.\./i })
				.querySelector(".animate-spin"),
		).toBeInTheDocument();
	});

	it("LoginForm_ErrorDisplay_ShouldTranslateErrorsWhenLanguageChanges", async () => {
		const user = userEvent.setup();

		renderWithProviders(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>,
		);

		const submitButton = screen.getByRole("button", { name: "Iniciar Sessão" });
		await user.click(submitButton);

		// Errors appear in Portuguese (default locale)
		expect(
			await screen.findByText("Digite um formato de e-mail válido."),
		).toBeInTheDocument();
		expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();

		// Switch dynamically to en-US
		await act(async () => {
			await i18n.changeLanguage("en-US");
		});

		// Errors update reactively without resubmitting
		expect(
			screen.getByText("Enter a valid email address."),
		).toBeInTheDocument();
		expect(screen.getByText("Password is required.")).toBeInTheDocument();

		// Switch back to pt-BR
		await act(async () => {
			await i18n.changeLanguage("pt-BR");
		});

		expect(
			screen.getByText("Digite um formato de e-mail válido."),
		).toBeInTheDocument();
		expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();
	});
});
