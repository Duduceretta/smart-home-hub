import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useUrlPagination } from "../useUrlPagination";

function renderPagination(
	initialUrl: string,
	filterKeys: readonly string[] = ["q", "room"],
) {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
	);

	return renderHook(
		() => ({
			pagination: useUrlPagination(filterKeys),
			search: useLocation().search,
		}),
		{ wrapper },
	);
}

describe("useUrlPagination", () => {
	it("useUrlPagination_NoParams_ShouldStartOnFirstPageWithEmptyFilters", () => {
		const { result } = renderPagination("/scenes");

		expect(result.current.pagination.page).toBe(1);
		expect(result.current.pagination.filters).toEqual({ q: "", room: "" });
	});

	it("useUrlPagination_UrlHasPageAndFilters_ShouldReadThem", () => {
		const { result } = renderPagination("/scenes?page=3&q=luz&room=Sala");

		expect(result.current.pagination.page).toBe(3);
		expect(result.current.pagination.filters).toEqual({
			q: "luz",
			room: "Sala",
		});
	});

	it.each([["0"], ["-2"], ["abc"], ["1.5"], [""]])(
		"useUrlPagination_InvalidPageParam_ShouldFallBackToFirstPage (%s)",
		(value) => {
			const { result } = renderPagination(`/scenes?page=${value}`);

			expect(result.current.pagination.page).toBe(1);
		},
	);

	it("useUrlPagination_SetPage_ShouldWriteItToTheUrl", () => {
		const { result } = renderPagination("/scenes");

		act(() => result.current.pagination.setPage(4));

		expect(result.current.pagination.page).toBe(4);
		expect(result.current.search).toBe("?page=4");
	});

	it("useUrlPagination_SetPageToFirst_ShouldRemoveTheParam", () => {
		const { result } = renderPagination("/scenes?page=2");

		act(() => result.current.pagination.setPage(1));

		expect(result.current.search).toBe("");
	});

	it("useUrlPagination_SetFilter_ShouldResetToFirstPage", () => {
		const { result } = renderPagination("/scenes?page=3&q=luz");

		act(() => result.current.pagination.setFilter("q", "sala"));

		expect(result.current.pagination.page).toBe(1);
		expect(result.current.pagination.filters.q).toBe("sala");
		expect(result.current.search).toBe("?q=sala");
	});

	it.each([[null], [""]])(
		"useUrlPagination_ClearFilter_ShouldRemoveItFromTheUrl (%s)",
		(empty) => {
			const { result } = renderPagination("/scenes?room=Sala");

			act(() => result.current.pagination.setFilter("room", empty));

			expect(result.current.pagination.filters.room).toBe("");
			expect(result.current.search).toBe("");
		},
	);

	it("useUrlPagination_ChangingPageOrFilter_ShouldKeepOtherParams", () => {
		const { result } = renderPagination("/scenes?scene=abc");

		act(() => result.current.pagination.setPage(2));
		act(() => result.current.pagination.setFilter("q", "luz"));

		expect(new URLSearchParams(result.current.search).get("scene")).toBe("abc");
		expect(new URLSearchParams(result.current.search).get("q")).toBe("luz");
	});

	it("useUrlPagination_SetFilterWithSameValue_ShouldKeepTheCurrentPage", () => {
		const { result } = renderPagination("/scenes?page=3&q=luz");

		act(() => result.current.pagination.setFilter("q", "luz"));

		expect(result.current.pagination.page).toBe(3);
	});
});
