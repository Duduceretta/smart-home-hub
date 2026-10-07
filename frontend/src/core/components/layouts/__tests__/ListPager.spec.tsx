import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/testing/test-utils";
import { ListPager, pageItems } from "../ListPager";

const LABELS = {
	nav: "Paginação",
	first: "Primeira página",
	previous: "Página anterior",
	next: "Próxima página",
	last: "Última página",
	goToPage: (page: number) => `Ir para a página ${page}`,
};

function renderPager(page: number, totalPages: number, onPageChange = vi.fn()) {
	render(
		<ListPager
			page={page}
			totalPages={totalPages}
			onPageChange={onPageChange}
			summary="1–10 de 27"
			labels={LABELS}
		/>,
	);

	return onPageChange;
}

describe("pageItems", () => {
	it("pageItems_UpToSevenPages_ShouldListAllOfThem", () => {
		expect(pageItems(1, 3)).toEqual([1, 2, 3]);
		expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it("pageItems_ManyPagesAtTheStart_ShouldCollapseTheEnd", () => {
		expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, "gap-end", 12]);
	});

	it("pageItems_ManyPagesInTheMiddle_ShouldCollapseBothSides", () => {
		expect(pageItems(6, 12)).toEqual([1, "gap-start", 5, 6, 7, "gap-end", 12]);
	});

	it("pageItems_ManyPagesAtTheEnd_ShouldCollapseTheStart", () => {
		expect(pageItems(12, 12)).toEqual([1, "gap-start", 9, 10, 11, 12]);
	});
});

describe("ListPager", () => {
	it("ListPager_Render_ShouldShowSummaryAndOneButtonPerPage", () => {
		renderPager(2, 3);

		expect(screen.getByText("1–10 de 27")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Ir para a página 1" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Ir para a página 3" }),
		).toBeInTheDocument();
	});

	it("ListPager_CurrentPage_ShouldBeMarkedAsCurrent", () => {
		renderPager(2, 3);

		expect(
			screen.getByRole("button", { name: "Ir para a página 2" }),
		).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("button", { name: "Ir para a página 1" }),
		).not.toHaveAttribute("aria-current");
	});

	it("ListPager_ClickOnAPage_ShouldAskForIt", async () => {
		const onPageChange = renderPager(1, 3);

		await userEvent.click(
			screen.getByRole("button", { name: "Ir para a página 3" }),
		);

		expect(onPageChange).toHaveBeenCalledWith(3);
	});

	it("ListPager_Arrows_ShouldMoveByOneAndJumpToTheEnds", async () => {
		const onPageChange = renderPager(2, 5);

		await userEvent.click(
			screen.getByRole("button", { name: "Próxima página" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Página anterior" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Primeira página" }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Última página" }),
		);

		expect(onPageChange.mock.calls.map(([page]) => page)).toEqual([3, 1, 1, 5]);
	});

	it("ListPager_FirstPage_ShouldDisableBackwardArrows", () => {
		renderPager(1, 3);

		expect(
			screen.getByRole("button", { name: "Primeira página" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Página anterior" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Próxima página" }),
		).toBeEnabled();
	});

	it("ListPager_LastPage_ShouldDisableForwardArrows", () => {
		renderPager(3, 3);

		expect(
			screen.getByRole("button", { name: "Próxima página" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Última página" }),
		).toBeDisabled();
	});

	it("ListPager_SingleOrNoPage_ShouldKeepTheCardWithArrowsDisabled", () => {
		renderPager(1, 0);

		expect(screen.getByRole("navigation", { name: "Paginação" })).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Próxima página" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Ir para a página 1" }),
		).toHaveAttribute("aria-current", "page");
	});
});
