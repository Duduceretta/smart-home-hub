import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { isRouteActive, NAV_SECTIONS } from "../nav.types";
import { MobileNavigationDrawer, Sidebar } from "../Sidebar";

function LocationProbe() {
	return <output data-testid="location">{useLocation().pathname}</output>;
}

describe("Scenes navigation", () => {
	it("NavSections_ShouldListScenesRightBeforeAutomations", () => {
		const section = NAV_SECTIONS.find((entry) => entry.id === "automation");
		const ids = section?.items.map((item) => item.id);

		expect(ids?.slice(0, 2)).toEqual(["scenes", "automations"]);
		expect(section?.items[0]).toMatchObject({
			name: "Cenas",
			path: "/scenes",
		});
	});

	it("isRouteActive_ScenesRoute_ShouldMatchOnlyItself", () => {
		expect(isRouteActive("/scenes", "/scenes")).toBe(true);
		expect(isRouteActive("/automations", "/scenes")).toBe(false);
	});

	it("Sidebar_OnTheScenesRoute_ShouldHighlightTheScenesItem", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/scenes"]}>
				<Sidebar />
			</MemoryRouter>,
		);

		expect(screen.getByRole("button", { name: /^cenas$/i })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(
			screen.getByRole("button", { name: /^automações$/i }),
		).not.toHaveAttribute("aria-current");
	});

	it("Sidebar_ClickingScenes_ShouldNavigateToTheScenesRoute", async () => {
		const user = userEvent.setup();
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Sidebar />
				<LocationProbe />
			</MemoryRouter>,
		);

		await user.click(screen.getByRole("button", { name: /^cenas$/i }));

		expect(screen.getByTestId("location")).toHaveTextContent("/scenes");
	});

	it("MobileNavigationDrawer_ShouldListScenes", () => {
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<MobileNavigationDrawer isOpen={true} onClose={vi.fn()} />
			</MemoryRouter>,
		);

		expect(
			screen.getByRole("button", { name: /^cenas$/i }),
		).toBeInTheDocument();
	});
});
