import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/core/i18n";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { PrivacyPage } from "../privacy/PrivacyPage";
import { TermsPage } from "../terms/TermsPage";

describe("Legal Pages Integration Tests", () => {
	beforeEach(async () => {
		await i18n.changeLanguage("pt-BR");
	});

	describe("PrivacyPage", () => {
		it("PrivacyPage_Render_ShouldDisplayAllRequiredLGPDSectionsAndContactPlaceholder", () => {
			renderWithProviders(
				<MemoryRouter>
					<PrivacyPage />
				</MemoryRouter>,
			);

			// Document heading
			expect(
				screen.getByRole("heading", {
					name: "Política de Privacidade",
					level: 1,
				}),
			).toBeInTheDocument();

			// Domain and controller identification
			expect(
				screen.getAllByText(/nexushub\.page/i).length,
			).toBeGreaterThanOrEqual(1);
			expect(screen.getAllByText(/Eduardo/i).length).toBeGreaterThanOrEqual(1);

			// Explicit contact email
			const contactLinks = screen.getAllByRole("link", {
				name: /duduceretta@gmail\.com/i,
			});
			expect(contactLinks.length).toBeGreaterThanOrEqual(1);
			expect(contactLinks[0]).toHaveAttribute(
				"href",
				"mailto:duduceretta@gmail.com",
			);

			// Key LGPD sections
			expect(
				screen.getByRole("heading", {
					name: /1\. Identificação do Controlador e Responsável/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /2\. Dados Pessoais e Informações Coletadas/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /3\. Finalidade e Base Legal do Tratamento \(LGPD\)/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /4\. Compartilhamento de Dados com Terceiros/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /5\. Prazos de Retenção e Descarte/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /6\. Direitos do Titular de Dados \(Art\. 18 da LGPD\)/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /7\. Cookies e Armazenamento no Navegador/i,
					level: 2,
				}),
			).toBeInTheDocument();

			// Table of contents navigation exists
			const tocNav = screen.getByRole("navigation", {
				name: "Índice do documento",
			});
			expect(tocNav).toBeInTheDocument();

			// Counterpart link to Terms of Service
			const termsLink = screen.getByRole("link", {
				name: /Acesse também os Termos de Serviço do Nexus Hub →/i,
			});
			expect(termsLink).toHaveAttribute("href", "/legal/terms");
		});
	});

	describe("TermsPage", () => {
		it("TermsPage_Render_ShouldDisplayAllRequiredTermsSectionsAndContactPlaceholder", () => {
			renderWithProviders(
				<MemoryRouter>
					<TermsPage />
				</MemoryRouter>,
			);

			// Document heading
			expect(
				screen.getByRole("heading", { name: "Termos de Serviço", level: 1 }),
			).toBeInTheDocument();

			// Local-First and TCC nature
			expect(screen.getByText(/Local-First/i)).toBeInTheDocument();
			expect(
				screen.getByText(/Trabalho de Conclusão de Curso/i),
			).toBeInTheDocument();

			// Explicit contact email
			const contactLinks = screen.getAllByRole("link", {
				name: /duduceretta@gmail\.com/i,
			});
			expect(contactLinks.length).toBeGreaterThanOrEqual(1);
			expect(contactLinks[0]).toHaveAttribute(
				"href",
				"mailto:duduceretta@gmail.com",
			);

			// Key Terms sections
			expect(
				screen.getByRole("heading", {
					name: /1\. Natureza da Plataforma e Estágio Atual/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /3\. Responsabilidades do Usuário e Credenciais/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /4\. Uso com Dispositivos Físicos e Segurança Elétrica/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /5\. Dependência de Serviços e APIs de Terceiros/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /6\. Isenção de Garantias e Limitação de Responsabilidade/i,
					level: 2,
				}),
			).toBeInTheDocument();

			// Counterpart link to Privacy Policy
			const privacyLink = screen.getByRole("link", {
				name: /Consulte também nossa Política de Privacidade \(LGPD\) →/i,
			});
			expect(privacyLink).toHaveAttribute("href", "/legal/privacy");
		});

		it("LegalLayout_BackButton_ShouldBeClickable", async () => {
			const user = userEvent.setup();
			renderWithProviders(
				<MemoryRouter>
					<TermsPage />
				</MemoryRouter>,
			);

			const backButton = screen.getByRole("button", {
				name: "Voltar para a página anterior",
			});
			expect(backButton).toBeInTheDocument();
			await user.click(backButton);
		});

		it("LegalLayout_BackButton_Hover_ShouldShowTooltip", async () => {
			const user = userEvent.setup();
			renderWithProviders(
				<MemoryRouter>
					<TermsPage />
				</MemoryRouter>,
			);

			const backButton = screen.getByRole("button", {
				name: "Voltar para a página anterior",
			});
			await user.hover(backButton);

			const tooltip = await screen.findByRole("tooltip", {
				name: "Voltar para a página anterior",
			});
			expect(tooltip).toBeInTheDocument();
		});

		it("LegalLayout_LanguageSelector_ShouldBeRenderedInHeader", () => {
			renderWithProviders(
				<MemoryRouter>
					<TermsPage />
				</MemoryRouter>,
			);

			const langButton = screen.getByRole("button", {
				name: /selecionar idioma|idioma/i,
			});
			expect(langButton).toBeInTheDocument();
			expect(langButton).toHaveTextContent("Português");
		});

		it("LegalLayout_Brand_ShouldRenderNexusHubWordmarkAndNotHouseIcon", () => {
			renderWithProviders(
				<MemoryRouter>
					<TermsPage />
				</MemoryRouter>,
			);

			// Must render brand wordmark
			const brandLogo = screen.getByRole("img", { name: "Nexus Hub" });
			expect(brandLogo).toBeInTheDocument();

			// House icon text node must not exist
			expect(screen.queryByTestId("lucide-home")).not.toBeInTheDocument();
		});

		it("TermsPage_LanguageChangedToEnglish_ShouldRenderEnglishSectionsAndTOC", async () => {
			await i18n.changeLanguage("en-US");
			renderWithProviders(
				<MemoryRouter>
					<TermsPage />
				</MemoryRouter>,
			);

			// Document heading
			expect(
				screen.getByRole("heading", { name: "Terms of Service", level: 1 }),
			).toBeInTheDocument();

			// Subtitle & last updated
			expect(
				screen.getByText(/Terms and guidelines for using/i),
			).toBeInTheDocument();
			expect(screen.getByText(/September 10, 2026/i)).toBeInTheDocument();

			// Key sections in English
			expect(
				screen.getByRole("heading", {
					name: /1\. Nature of the Platform and Current Stage/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /2\. Acceptance of Terms/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /3\. User Responsibilities and Credentials/i,
					level: 2,
				}),
			).toBeInTheDocument();

			// Counterpart link to Privacy Policy in English
			const privacyLink = screen.getByRole("link", {
				name: /Also check out our Privacy Policy \(LGPD\) →/i,
			});
			expect(privacyLink).toHaveAttribute("href", "/legal/privacy");
		});

		it("PrivacyPage_LanguageChangedToEnglish_ShouldRenderEnglishSectionsAndTOC", async () => {
			await i18n.changeLanguage("en-US");
			renderWithProviders(
				<MemoryRouter>
					<PrivacyPage />
				</MemoryRouter>,
			);

			// Document heading
			expect(
				screen.getByRole("heading", { name: "Privacy Policy", level: 1 }),
			).toBeInTheDocument();

			// Subtitle & last updated
			expect(
				screen.getByText(/How Nexus Hub collects, uses, stores/i),
			).toBeInTheDocument();
			expect(screen.getByText(/September 10, 2026/i)).toBeInTheDocument();

			// Key LGPD sections in English
			expect(
				screen.getByRole("heading", {
					name: /1\. Data Controller Identification/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /2\. Personal Data and Information Collected/i,
					level: 2,
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", {
					name: /3\. Purposes and Legal Grounds \(LGPD\)/i,
					level: 2,
				}),
			).toBeInTheDocument();

			// Counterpart link to Terms of Service in English
			const termsLink = screen.getByRole("link", {
				name: /Also access the Nexus Hub Terms of Service →/i,
			});
			expect(termsLink).toHaveAttribute("href", "/legal/terms");
		});
	});
});
