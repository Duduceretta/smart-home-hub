import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/core/i18n";
import { renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { useAuthStore } from "../../store/useAuthStore";
import { EmailVerificationBanner } from "../EmailVerificationBanner";

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("EmailVerificationBanner Component Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
		sessionStorage.clear();
		useAuthStore.setState({ user: null, isLoading: false });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		sessionStorage.clear();
	});

	it("EmailVerificationBanner_WhenNoUser_RendersNothing", () => {
		useAuthStore.setState({ user: null, isLoading: false });

		const { container } = renderWithProviders(<EmailVerificationBanner />);
		expect(container.firstChild).toBeNull();
	});

	it("EmailVerificationBanner_WhenUserAlreadyVerified_RendersNothing", () => {
		useAuthStore.setState({
			user: {
				uid: "123",
				email: "verified@test.com",
				emailVerified: true,
			} as any,
			isLoading: false,
		});

		const { container } = renderWithProviders(<EmailVerificationBanner />);
		expect(container.firstChild).toBeNull();
	});

	it("EmailVerificationBanner_WhenUserNotVerified_RendersBannerWithUserInfo", () => {
		useAuthStore.setState({
			user: {
				uid: "123",
				email: "unverified@test.com",
				emailVerified: false,
			} as any,
			isLoading: false,
		});

		renderWithProviders(<EmailVerificationBanner />);

		expect(
			screen.getByText("Confirme seu endereço de e-mail"),
		).toBeInTheDocument();
		expect(screen.getByText(/unverified@test.com/)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Reenviar e-mail/i }),
		).toBeInTheDocument();
	});

	it("EmailVerificationBanner_WhenDismissClicked_HidesBannerAndPersistsSessionStorage", async () => {
		const user = userEvent.setup();
		useAuthStore.setState({
			user: {
				uid: "123",
				email: "unverified@test.com",
				emailVerified: false,
			} as any,
			isLoading: false,
		});

		const { container } = renderWithProviders(<EmailVerificationBanner />);

		const dismissBtn = screen.getByRole("button", {
			name: /Fechar aviso de confirmação de e-mail/i,
		});
		await user.click(dismissBtn);

		expect(container.firstChild).toBeNull();
		expect(sessionStorage.getItem("dismissed_email_verification_banner")).toBe(
			"true",
		);
	});

	it("EmailVerificationBanner_WhenResendClicked_CallsApiAndStartsCooldown", async () => {
		const user = userEvent.setup();
		const sendVerificationEmailSpy = vi
			.spyOn(authApi, "sendVerificationEmail")
			.mockResolvedValue();

		useAuthStore.setState({
			user: {
				uid: "123",
				email: "unverified@test.com",
				emailVerified: false,
			} as any,
			isLoading: false,
		});

		renderWithProviders(<EmailVerificationBanner />);

		const resendBtn = screen.getByRole("button", { name: /Reenviar e-mail/i });
		await user.click(resendBtn);

		expect(sendVerificationEmailSpy).toHaveBeenCalledWith(
			"unverified@test.com",
		);
		expect(toast.success).toHaveBeenCalled();
		expect(screen.getByText(/Reenviar em 60s/i)).toBeInTheDocument();
		expect(resendBtn).toBeDisabled();
	});
});
