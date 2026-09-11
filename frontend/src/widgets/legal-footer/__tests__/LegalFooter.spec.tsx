import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { LegalFooter } from "../LegalFooter";

describe("LegalFooter Unit Tests", () => {
	it("LegalFooter_CompactVariant_ShouldRenderPrivacyAndTermsLinks", () => {
		renderWithProviders(
			<MemoryRouter>
				<LegalFooter variant="compact" />
			</MemoryRouter>,
		);

		const footer = screen.getByTestId("legal-footer");
		expect(footer).toBeInTheDocument();

		const termsLink = screen.getByRole("link", { name: "Termos de Serviço" });
		expect(termsLink).toHaveAttribute("href", "/legal/terms");

		const privacyLink = screen.getByRole("link", { name: "Privacidade" });
		expect(privacyLink).toHaveAttribute("href", "/legal/privacy");
	});

	it("LegalFooter_FullVariant_ShouldRenderFullCopyrightAndLinks", () => {
		renderWithProviders(
			<MemoryRouter>
				<LegalFooter variant="full" />
			</MemoryRouter>,
		);

		const footer = screen.getByTestId("legal-footer");
		expect(footer).toBeInTheDocument();

		expect(
			screen.getByText(/Nexus Hub\. Todos os direitos reservados\./i),
		).toBeInTheDocument();

		const termsLink = screen.getByRole("link", { name: "Termos de Serviço" });
		expect(termsLink).toHaveAttribute("href", "/legal/terms");

		const privacyLink = screen.getByRole("link", {
			name: "Política de Privacidade",
		});
		expect(privacyLink).toHaveAttribute("href", "/legal/privacy");
	});
});
