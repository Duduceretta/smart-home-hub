import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { RegisterForm } from "../RegisterForm";

describe("RegisterForm Unit Tests", () => {
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
});
