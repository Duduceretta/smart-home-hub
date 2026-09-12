import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { act, renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { ForgotPasswordForm } from "../ForgotPasswordForm";

describe("ForgotPasswordForm Unit Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await i18n.changeLanguage("pt-BR");
	});

	it("ForgotPasswordForm_Rendering_ShouldRenderFieldsAndPlaceholder", () => {
		renderWithProviders(
			<MemoryRouter>
				<ForgotPasswordForm />
			</MemoryRouter>,
		);

		const emailInput = screen.getByPlaceholderText("admin@nexushub.local");
		expect(emailInput).toBeInTheDocument();

		const submitButton = screen.getByRole("button", {
			name: "Enviar link de recuperação",
		});
		expect(submitButton).toBeInTheDocument();
		expect(submitButton).not.toBeDisabled();

		const backLink = screen.getByRole("link", {
			name: "Lembrei minha senha",
		});
		expect(backLink).toBeInTheDocument();
		expect(backLink).toHaveAttribute("href", "/login");
	});

	it("ForgotPasswordForm_SubmittingState_ShouldRenderSpinnerAndDisableButton", async () => {
		const user = userEvent.setup();
		vi.spyOn(authApi, "resetPassword").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter>
				<ForgotPasswordForm />
			</MemoryRouter>,
		);

		const emailInput = screen.getByPlaceholderText("admin@nexushub.local");
		const submitButton = screen.getByRole("button", {
			name: "Enviar link de recuperação",
		});

		await user.type(emailInput, "admin@nexushub.local");
		await user.click(submitButton);

		expect(
			screen.getByRole("button", { name: /enviando/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
		expect(document.querySelector(".animate-spin")).toBeInTheDocument();
	});

	it("ForgotPasswordForm_Success_ShouldRenderSuccessMessageAndBackLink", async () => {
		const user = userEvent.setup();
		vi.spyOn(authApi, "resetPassword").mockResolvedValue(undefined);

		renderWithProviders(
			<MemoryRouter>
				<ForgotPasswordForm />
			</MemoryRouter>,
		);

		const emailInput = screen.getByPlaceholderText("admin@nexushub.local");
		const submitButton = screen.getByRole("button", {
			name: "Enviar link de recuperação",
		});

		await user.type(emailInput, "admin@nexushub.local");
		await user.click(submitButton);

		expect(
			await screen.findByText(
				"Se o e-mail estiver cadastrado em nosso sistema, você receberá um link de recuperação em breve.",
			),
		).toBeInTheDocument();

		const backToLoginLink = screen.getByRole("link", {
			name: "Voltar para o login",
		});
		expect(backToLoginLink).toBeInTheDocument();
		expect(backToLoginLink).toHaveAttribute("href", "/login");
	});

	it("ForgotPasswordForm_ValidationError_ShouldTranslateDynamicallyOnLanguageSwitch", async () => {
		const user = userEvent.setup();

		renderWithProviders(
			<MemoryRouter>
				<ForgotPasswordForm />
			</MemoryRouter>,
		);

		const submitButton = screen.getByRole("button", {
			name: "Enviar link de recuperação",
		});

		// Submete com campo vazio
		await user.click(submitButton);

		expect(
			await screen.findByText("Digite um formato de e-mail válido."),
		).toBeInTheDocument();

		// Alterna para inglês
		await act(async () => {
			await i18n.changeLanguage("en-US");
		});

		expect(
			screen.getByText("Enter a valid email address."),
		).toBeInTheDocument();

		// Alterna de volta para português
		await act(async () => {
			await i18n.changeLanguage("pt-BR");
		});

		expect(
			screen.getByText("Digite um formato de e-mail válido."),
		).toBeInTheDocument();
	});
});
