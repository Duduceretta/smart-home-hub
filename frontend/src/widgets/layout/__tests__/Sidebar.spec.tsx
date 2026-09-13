import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
} from "@/testing/test-utils";
import { MobileNavigationDrawer, Sidebar } from "../Sidebar";

describe("Sidebar Component", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("Sidebar_Rendering_ShouldRenderNexusHubBrandingAndSections", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		// Assert brand
		expect(screen.getAllByLabelText("Nexus Hub").length).toBeGreaterThan(0);

		// Assert sections
		expect(screen.getByText("Principal")).toBeInTheDocument();
		expect(screen.getByText("Automação")).toBeInTheDocument();
		expect(screen.getByText("Sistema")).toBeInTheDocument();

		// Assert items
		expect(
			screen.getByRole("link", { name: /dashboard/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /dispositivos/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /ambientes/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /grupos/i })).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /automações/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /histórico/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /configurações/i }),
		).toBeInTheDocument();
	});

	it("Sidebar_ActiveRoute_ShouldSetAriaCurrentPageOnActiveItem", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/devices"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const activeLink = screen.getByRole("link", { name: /dispositivos/i });
		expect(activeLink).toHaveAttribute("aria-current", "page");
		expect(activeLink.className).toContain("bg-primary/10");

		const inactiveLink = screen.getByRole("link", { name: /dashboard/i });
		expect(inactiveLink).not.toHaveAttribute("aria-current");
		expect(inactiveLink.className).not.toContain("bg-primary/10");
	});

	it("Sidebar_NavItem_PointerDown_ShouldSpawnMuiRippleWave", async () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const link = screen.getByRole("link", { name: /dispositivos/i });
		expect(link.querySelector(".animate-mui-ripple")).not.toBeInTheDocument();

		// Pressiona o botão simulando toque/clique. A leitura de
		// `getBoundingClientRect()` é adiada pra um `requestAnimationFrame`
		// (evita forçar layout síncrono no clique — ver Ripple.tsx), então o
		// span da onda só aparece depois do frame seguinte.
		await act(async () => {
			fireEvent.pointerDown(link, {
				clientX: 50,
				clientY: 20,
			});
			await new Promise((resolve) => requestAnimationFrame(resolve));
		});

		expect(link.querySelector(".animate-mui-ripple")).toBeInTheDocument();
	});

	it("Sidebar_CollapseToggle_ShouldToggleCollapseAndPersistInLocalStorage", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const toggleButton = screen.getByRole("button", {
			name: /recolher barra lateral/i,
		});
		expect(toggleButton).toHaveAttribute("aria-expanded", "true");

		// Click logo to collapse
		await user.click(toggleButton);

		const expandButton = screen.getByRole("button", {
			name: /expandir barra lateral/i,
		});
		expect(expandButton).toHaveAttribute("aria-expanded", "false");
		expect(localStorage.getItem("nexus_sidebar_collapsed")).toBe("true");

		// Click to expand again
		await user.click(expandButton);
		const restoredButton = screen.getByRole("button", {
			name: /recolher barra lateral/i,
		});
		expect(restoredButton).toHaveAttribute("aria-expanded", "true");
		expect(localStorage.getItem("nexus_sidebar_collapsed")).toBe("false");
	});

	it("Sidebar_Footer_ShouldRenderAddAndLogoutActions", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		expect(
			screen.getByRole("button", { name: /adicionar/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /sair|logout/i }),
		).toBeInTheDocument();
	});

	it("Sidebar_AddDeviceButton_ShouldHaveAriaLabelAndBeClickable", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const addButton = screen.getByRole("button", {
			name: /adicionar dispositivos/i,
		});
		expect(addButton).toBeInTheDocument();
		await user.click(addButton);
	});

	it("Sidebar_WhenCollapsed_ShouldRenderCompactOnlineDevicesBadge", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const toggleButton = screen.getByRole("button", {
			name: /recolher barra lateral/i,
		});
		await user.click(toggleButton);

		// When collapsed, the compact badge with aria-label must be present
		expect(screen.getByLabelText(/dispositivos online/i)).toBeInTheDocument();
	});

	it("Sidebar_ResizeBorderHandle_ShouldToggleCollapseOnClick", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const borderHandle = screen.getByRole("button", {
			name: /recolher painel lateral pela borda/i,
		});
		expect(borderHandle).toBeInTheDocument();

		await user.click(borderHandle);
		expect(localStorage.getItem("nexus_sidebar_collapsed")).toBe("true");

		const expandBorderHandle = screen.getByRole("button", {
			name: /expandir painel lateral pela borda/i,
		});
		await user.click(expandBorderHandle);
		expect(localStorage.getItem("nexus_sidebar_collapsed")).toBe("false");
	});

	it("Sidebar_InteractiveElements_ShouldHaveActiveFeedbackClasses", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		const toggleButton = screen.getByRole("button", {
			name: /recolher barra lateral/i,
		});
		expect(toggleButton.className).toContain("active:scale-[0.98]");

		const addButton = screen.getByRole("button", {
			name: /adicionar dispositivos/i,
		});
		expect(addButton.className).toContain("active:scale-[0.97]");

		const navLinks = screen.getAllByRole("link");
		expect(navLinks.length).toBeGreaterThan(0);
		for (const link of navLinks) {
			expect(link.className).toContain("active:scale-[0.98]");
		}
	});
});

describe("MobileNavigationDrawer Component", () => {
	it("MobileNavigationDrawer_WhenOpen_ShouldRenderDialogWithBrandSectionsAndCloseButton", async () => {
		const onClose = vi.fn();
		const user = userEvent.setup();

		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<MobileNavigationDrawer isOpen={true} onClose={onClose} />
			</MemoryRouter>,
		);

		const dialog = screen.getByRole("dialog", {
			name: /menu de navegação principal/i,
		});
		expect(dialog).toBeInTheDocument();

		// Assert sections exist inside drawer
		expect(screen.getByText("Principal")).toBeInTheDocument();
		expect(screen.getByText("Automação")).toBeInTheDocument();
		expect(screen.getByText("Sistema")).toBeInTheDocument();

		// Assert close button works
		const closeButton = screen.getByRole("button", {
			name: /fechar menu de navegação/i,
		});
		expect(closeButton).toBeInTheDocument();
		await user.click(closeButton);
		expect(onClose).toHaveBeenCalled();
	});

	it("MobileNavigationDrawer_WhenClosed_ShouldNotRenderContent", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<MobileNavigationDrawer isOpen={false} onClose={vi.fn()} />
			</MemoryRouter>,
		);

		expect(
			screen.queryByRole("dialog", { name: /menu de navegação principal/i }),
		).not.toBeInTheDocument();
	});

	it("MobileNavigationDrawer_LinksAndButtons_ShouldHaveActiveFeedbackClasses", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<MobileNavigationDrawer isOpen={true} onClose={vi.fn()} />
			</MemoryRouter>,
		);

		const closeButton = screen.getByRole("button", {
			name: /fechar menu de navegação/i,
		});
		expect(closeButton.className).toContain("active:scale-90");

		const navLinks = screen.getAllByRole("link");
		expect(navLinks.length).toBeGreaterThan(0);
		for (const link of navLinks) {
			expect(link.className).toContain("active:scale-[0.98]");
		}
	});

	it("MobileNavigationDrawer_ActiveRoute_ShouldHighlightCorrectItem", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/devices"]}>
				<MobileNavigationDrawer isOpen={true} onClose={vi.fn()} />
			</MemoryRouter>,
		);

		const activeLink = screen.getByRole("link", { name: /dispositivos/i });
		expect(activeLink).toHaveAttribute("aria-current", "page");
		expect(activeLink.className).toContain("bg-primary/10");

		const inactiveLink = screen.getByRole("link", { name: /dashboard/i });
		expect(inactiveLink).not.toHaveAttribute("aria-current");
		expect(inactiveLink.className).not.toContain("bg-primary/10");
	});

	it("MobileNavigationDrawer_TouchHoldAndContextMenu_ShouldNotCrash", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<MobileNavigationDrawer isOpen={true} onClose={vi.fn()} />
			</MemoryRouter>,
		);

		const dialog = screen.getByRole("dialog", {
			name: /menu de navegação principal/i,
		});
		const link = screen.getByRole("link", { name: /dispositivos/i });

		// Simula toque e segurar (long press)
		expect(() => {
			act(() => {
				fireEvent.pointerDown(link, {
					clientX: 50,
					clientY: 20,
				});
				fireEvent.contextMenu(link);
			});

			dialog.dispatchEvent(
				new TouchEvent("touchstart", {
					bubbles: true,
					touches: [{ clientX: 50, clientY: 50 } as unknown as Touch],
				}),
			);
			dialog.dispatchEvent(
				new TouchEvent("touchend", {
					bubbles: true,
					changedTouches: [{ clientX: 50, clientY: 50 } as unknown as Touch],
				}),
			);
		}).not.toThrow();
	});
});
