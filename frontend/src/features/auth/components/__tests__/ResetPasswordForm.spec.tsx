import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { act, renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { ResetPasswordForm } from "../ResetPasswordForm";

describe("ResetPasswordForm Integration Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await i18n.changeLanguage("pt-BR");
	});

	it("ResetPasswordForm_WhenVerifyingToken_RendersSkeletonWithRoleStatusAndAriaBusy", () => {
		vi.spyOn(authApi, "verifyResetToken").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter
				initialEntries={[
					"/reset-password?oobCode=valid-code&mode=resetPassword",
				]}
			>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		const statusContainer = screen.getByRole("status");
		expect(statusContainer).toBeInTheDocument();
		expect(statusContainer).toHaveAttribute("aria-busy", "true");
		expect(
			screen.getByText("Validando token de recuperação..."),
		).toBeInTheDocument();
	});

	it("ResetPasswordForm_WhenTokenResolved_RendersPasswordFormFields", async () => {
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");

		renderWithProviders(
			<MemoryRouter
				initialEntries={[
					"/reset-password?oobCode=valid-code&mode=resetPassword",
				]}
			>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("button", { name: /Salvar nova senha/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Nova Senha", { selector: "label" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Confirmar Nova Senha", { selector: "label" }),
		).toBeInTheDocument();
		expect(screen.getByText("user@example.com")).toBeInTheDocument();
	});

	it("ResetPasswordForm_WhenTokenInvalidOrWrongMode_RendersPolishedInvalidState", async () => {
		renderWithProviders(
			<MemoryRouter
				initialEntries={["/reset-password?oobCode=code&mode=verifyEmail"]}
			>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		expect(
			await screen.findByText("Link inválido ou expirado"),
		).toBeInTheDocument();

		const requestNewLink = screen.getByRole("link", {
			name: "Solicitar novo link",
		});
		expect(requestNewLink).toBeInTheDocument();
		expect(requestNewLink).toHaveAttribute("href", "/forgot-password");
	});

	it("ResetPasswordForm_SubmittingState_ShouldRenderSpinnerAndDisableButton", async () => {
		const user = userEvent.setup();
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");
		vi.spyOn(authApi, "submitNewPassword").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter
				initialEntries={[
					"/reset-password?oobCode=valid-code&mode=resetPassword",
				]}
			>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		const passwordInput = await screen.findByLabelText("Nova Senha");
		const confirmInput = screen.getByLabelText("Confirmar Nova Senha");
		const submitButton = screen.getByRole("button", {
			name: "Salvar nova senha",
		});

		await user.type(passwordInput, "StrongPass1@");
		await user.type(confirmInput, "StrongPass1@");
		await user.click(submitButton);

		expect(
			screen.getByRole("button", { name: /redefinindo/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /redefinindo/i })).toBeDisabled();
		expect(document.querySelector(".animate-spin")).toBeInTheDocument();
	});

	it("ResetPasswordForm_ValidationError_ShouldTranslateDynamicallyOnLanguageSwitch", async () => {
		const user = userEvent.setup();
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");

		renderWithProviders(
			<MemoryRouter
				initialEntries={[
					"/reset-password?oobCode=valid-code&mode=resetPassword",
				]}
			>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		const submitButton = await screen.findByRole("button", {
			name: "Salvar nova senha",
		});

		// Submete vazio
		await user.click(submitButton);

		expect(
			await screen.findByText("A senha deve ter no mínimo 8 caracteres."),
		).toBeInTheDocument();

		// Alterna para inglês
		await act(async () => {
			await i18n.changeLanguage("en-US");
		});

		expect(
			screen.getByText("Password must be at least 8 characters."),
		).toBeInTheDocument();

		// Alterna de volta para português
		await act(async () => {
			await i18n.changeLanguage("pt-BR");
		});

		expect(
			screen.getByText("A senha deve ter no mínimo 8 caracteres."),
		).toBeInTheDocument();
	});
});
