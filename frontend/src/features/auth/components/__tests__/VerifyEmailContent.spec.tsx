import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { act, renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { useAuthStore } from "../../store/useAuthStore";
import { VerifyEmailContent } from "../VerifyEmailContent";

describe("VerifyEmailContent Integration Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
		useAuthStore.setState({ user: null, isLoading: false });
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await i18n.changeLanguage("pt-BR");
	});

	it("VerifyEmailContent_WhenVerifying_RendersVerifyingStateWithSpinner", () => {
		vi.spyOn(authApi, "verifyEmailToken").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter initialEntries={["/verify-email?oobCode=valid-code"]}>
				<VerifyEmailContent />
			</MemoryRouter>,
		);

		expect(screen.getByText("Verificando seu e-mail...")).toBeInTheDocument();
	});

	it("VerifyEmailContent_WhenVerificationSucceedsAndUserLoggedIn_RendersSuccessWithDashboardLink", async () => {
		vi.spyOn(authApi, "verifyEmailToken").mockResolvedValue();
		useAuthStore.setState({
			user: { uid: "123", email: "user@test.com", emailVerified: true } as any,
			isLoading: false,
		});

		await act(async () => {
			renderWithProviders(
				<MemoryRouter initialEntries={["/verify-email?oobCode=valid-code"]}>
					<VerifyEmailContent />
				</MemoryRouter>,
			);
		});

		expect(
			await screen.findByText("E-mail confirmado com sucesso!"),
		).toBeInTheDocument();
		const dashboardButton = screen.getByRole("button", {
			name: /Acessar Dashboard/i,
		});
		expect(dashboardButton).toBeInTheDocument();
	});

	it("VerifyEmailContent_WhenVerificationSucceedsAndUserLoggedOut_RendersSuccessWithLoginLink", async () => {
		vi.spyOn(authApi, "verifyEmailToken").mockResolvedValue();

		await act(async () => {
			renderWithProviders(
				<MemoryRouter initialEntries={["/verify-email?oobCode=valid-code"]}>
					<VerifyEmailContent />
				</MemoryRouter>,
			);
		});

		expect(
			await screen.findByText("E-mail confirmado com sucesso!"),
		).toBeInTheDocument();
		const loginButton = screen.getByRole("button", {
			name: /Ir para o Login/i,
		});
		expect(loginButton).toBeInTheDocument();
	});

	it("VerifyEmailContent_WhenTokenMissing_RendersErrorStateImmediately", async () => {
		await act(async () => {
			renderWithProviders(
				<MemoryRouter initialEntries={["/verify-email"]}>
					<VerifyEmailContent />
				</MemoryRouter>,
			);
		});

		expect(
			await screen.findByText("Link inválido ou expirado"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Código de verificação ausente na URL."),
		).toBeInTheDocument();
	});

	it("VerifyEmailContent_WhenVerificationFails_RendersErrorState", async () => {
		vi.spyOn(authApi, "verifyEmailToken").mockRejectedValue(
			new authApi.AuthError("verifyEmail.errors.invalidOrExpiredToken"),
		);

		await act(async () => {
			renderWithProviders(
				<MemoryRouter initialEntries={["/verify-email?oobCode=expired-code"]}>
					<VerifyEmailContent />
				</MemoryRouter>,
			);
		});

		expect(
			await screen.findByText("Link inválido ou expirado"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Este link de confirmação é inválido ou já expirou."),
		).toBeInTheDocument();
	});
});
