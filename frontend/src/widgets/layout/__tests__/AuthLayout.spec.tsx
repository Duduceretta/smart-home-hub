import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthIllustrationUIStore } from "@/features/auth/store/auth-illustration-ui.store";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { AuthLayout } from "../AuthLayout";

function renderAuthLayout(children: React.ReactNode) {
	return renderWithProviders(
		<MemoryRouter>
			<AuthLayout>{children}</AuthLayout>
		</MemoryRouter>,
	);
}

describe("AuthLayout Integration Tests", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
		useAuthIllustrationUIStore.getState().resetLamps();
	});

	it("AuthLayout_Rendering_ShouldRenderNexusHubBrandingOnBothDesktopAndMobile", () => {
		// Act
		renderAuthLayout(<div data-testid="auth-form-content">Form Content</div>);

		// Assert
		const brandHeadings = screen.getAllByText("Nexus Hub");
		expect(brandHeadings.length).toBeGreaterThanOrEqual(2);

		expect(
			screen.getByText("Todos os sistemas operacionais"),
		).toBeInTheDocument();
		expect(screen.getByTestId("auth-form-content")).toBeInTheDocument();
	});

	it("AuthLayout_LegalFooter_ShouldRenderLegalFooterWithTermsAndPrivacyLinks", () => {
		// Act
		renderAuthLayout(<div data-testid="auth-form-content">Form Content</div>);

		// Assert
		const footer = screen.getByTestId("legal-footer");
		expect(footer).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Termos de Serviço" }),
		).toHaveAttribute("href", "/legal/terms");
		expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute(
			"href",
			"/legal/privacy",
		);
	});

	it("AuthLayout_ThemeSelector_ShouldRenderTriggerAndAllowChangingTheme", async () => {
		// Arrange
		const user = userEvent.setup();
		renderAuthLayout(<div>Form Content</div>);

		// Act - click theme selector dropdown trigger
		const themeTrigger = screen.getByRole("button", {
			name: /selecionar tema|tema/i,
		});
		expect(themeTrigger).toBeInTheDocument();
		await user.click(themeTrigger);

		// Assert - check options visible
		const indigoOption = await screen.findByRole("menuitemradio", {
			name: "Indigo",
		});
		expect(indigoOption).toBeInTheDocument();

		// Act - select Indigo
		await user.click(indigoOption);

		// Assert
		expect(document.documentElement.getAttribute("data-theme")).toBe("indigo");
	});

	it("AuthLayout_InteractiveLights_ShouldBeExcludedFromTabOrder", () => {
		// Act
		renderAuthLayout(<input data-testid="login-email-input" />);

		// Assert - verify lights have tabIndex -1
		const livingLamp = screen.getByRole("button", {
			name: "Alternar luz da sala (decorativo)",
		});
		const bedroomLamp = screen.getByRole("button", {
			name: "Alternar luz do quarto (decorativo)",
		});

		expect(livingLamp).toHaveAttribute("tabindex", "-1");
		expect(bedroomLamp).toHaveAttribute("tabindex", "-1");
	});

	it("AuthLayout_InteractiveLights_ClickShouldToggleLightingState", async () => {
		// Arrange
		const user = userEvent.setup();
		renderAuthLayout(<div>Form Content</div>);

		const livingLamp = screen.getByRole("button", {
			name: "Alternar luz da sala (decorativo)",
		});

		// Act - toggle living lamp
		await user.click(livingLamp);

		// Lamp still exists and stays clickable
		expect(livingLamp).toBeInTheDocument();

		// Act - toggle again to restore
		await user.click(livingLamp);
		expect(livingLamp).toBeInTheDocument();
	});

	it("AuthLayout_InteractiveLights_ShouldPersistStateAcrossRouteNavigation", async () => {
		// Arrange
		const user = userEvent.setup();
		expect(useAuthIllustrationUIStore.getState().isOfficeLampOn).toBe(true);

		// Act 1 - Render register page and turn off office lamp
		const { unmount } = renderAuthLayout(<div>Cadastro</div>);
		const officeLamp = screen.getByRole("button", {
			name: "Alternar luz do escritório (decorativo)",
		});

		await user.click(officeLamp);
		expect(useAuthIllustrationUIStore.getState().isOfficeLampOn).toBe(false);

		// Act 2 - Navigate to login page (unmount previous page, mount new page)
		unmount();
		renderAuthLayout(<div>Login</div>);

		// Assert - Office lamp remains off
		expect(useAuthIllustrationUIStore.getState().isOfficeLampOn).toBe(false);

		// Act 3 - Toggle bedroom lamp off on login page
		const bedroomLamp = screen.getByRole("button", {
			name: "Alternar luz do quarto (decorativo)",
		});
		await user.click(bedroomLamp);
		expect(useAuthIllustrationUIStore.getState().isBedroomLampOn).toBe(false);
	});

	it("AuthLayout_MobileBackground_ShouldRenderAriaHiddenMobileBackground", () => {
		// Act
		renderAuthLayout(<div data-testid="auth-form-content">Form Content</div>);

		// Assert
		const bg = screen.getByTestId("mobile-auth-background");
		expect(bg).toBeInTheDocument();
		expect(bg).toHaveAttribute("aria-hidden", "true");
		expect(bg.getAttribute("class")).toContain("lg:hidden");
		expect(bg.getAttribute("class")).toContain("pointer-events-none");
	});

	it("AuthLayout_DesktopBackground_ShouldRenderAriaHiddenDesktopBackground", () => {
		// Act
		renderAuthLayout(<div data-testid="auth-form-content">Form Content</div>);

		// Assert
		const bg = screen.getByTestId("desktop-auth-background");
		expect(bg).toBeInTheDocument();
		expect(bg).toHaveAttribute("aria-hidden", "true");
		expect(bg.getAttribute("class")).toContain("hidden lg:block");
		expect(bg.getAttribute("class")).toContain("pointer-events-none");
	});

	it("AuthLayout_ResponsiveBreakpoints_ShouldUseLgBreakpointForTwoColumnLayout", () => {
		// Act
		renderAuthLayout(<div data-testid="auth-form-content">Form Content</div>);

		// Assert - Illustration panel must be hidden below lg and flex on lg+
		const illustrationContainer = screen.getByTestId(
			"auth-illustration-container",
		);
		const leftSection = illustrationContainer.closest("section");
		expect(leftSection).not.toBeNull();
		expect(leftSection?.className).toContain("hidden");
		expect(leftSection?.className).toContain("lg:flex");
		expect(leftSection?.className).toContain("lg:w-7/12");

		// Assert - Mobile brand header must be hidden on lg+
		const brandHeadings = screen.getAllByText("Nexus Hub");
		const mobileBrandContainer = brandHeadings[1]?.closest("div");
		expect(mobileBrandContainer?.className).toContain("lg:hidden");
	});
});
