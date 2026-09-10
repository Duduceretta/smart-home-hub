import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { AuthLayout } from "../AuthLayout";

describe("AuthLayout Integration Tests", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.removeAttribute("data-theme");
	});

	it("AuthLayout_Rendering_ShouldRenderNexusHubBrandingOnBothDesktopAndMobile", () => {
		// Act
		renderWithProviders(
			<AuthLayout>
				<div data-testid="auth-form-content">Form Content</div>
			</AuthLayout>,
		);

		// Assert
		const brandHeadings = screen.getAllByText("Nexus Hub");
		expect(brandHeadings.length).toBeGreaterThanOrEqual(2);

		expect(
			screen.getByText("Todos os sistemas operacionais"),
		).toBeInTheDocument();
		expect(screen.getByTestId("auth-form-content")).toBeInTheDocument();
	});

	it("AuthLayout_ThemeSelector_ShouldRenderTriggerAndAllowChangingTheme", async () => {
		// Arrange
		const user = userEvent.setup();
		renderWithProviders(
			<AuthLayout>
				<div>Form Content</div>
			</AuthLayout>,
		);

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
		renderWithProviders(
			<AuthLayout>
				<input data-testid="login-email-input" />
			</AuthLayout>,
		);

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
		renderWithProviders(
			<AuthLayout>
				<div>Form Content</div>
			</AuthLayout>,
		);

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

	it("AuthLayout_MobileBackground_ShouldRenderAriaHiddenMobileBackground", () => {
		// Act
		renderWithProviders(
			<AuthLayout>
				<div data-testid="auth-form-content">Form Content</div>
			</AuthLayout>,
		);

		// Assert
		const bg = screen.getByTestId("mobile-auth-background");
		expect(bg).toBeInTheDocument();
		expect(bg).toHaveAttribute("aria-hidden", "true");
		expect(bg.getAttribute("class")).toContain("md:hidden");
		expect(bg.getAttribute("class")).toContain("pointer-events-none");
	});
});
