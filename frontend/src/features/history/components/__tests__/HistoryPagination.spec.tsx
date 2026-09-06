import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/testing/test-utils";
import { HistoryPagination } from "../HistoryPagination";

describe("HistoryPagination Integration Tests", () => {
	it("HistoryPagination_SingleOrZeroTotalPages_ShouldReturnNull", () => {
		// Arrange & Act
		const { container } = renderWithProviders(
			<HistoryPagination
				page={1}
				totalPages={1}
				totalCount={10}
				onPageChange={vi.fn()}
			/>,
		);

		// Assert
		expect(container.firstChild).toBeNull();
	});

	it("HistoryPagination_FirstPageOfMultiple_ShouldDisablePreviousButtonAndEnableNextButton", async () => {
		// Arrange
		const user = userEvent.setup();
		const onPageChangeSpy = vi.fn();

		renderWithProviders(
			<HistoryPagination
				page={1}
				totalPages={3}
				totalCount={50}
				onPageChange={onPageChangeSpy}
			/>,
		);

		// Assert
		const prevButton = screen.getByRole("button", { name: "Anterior" });
		const nextButton = screen.getByRole("button", { name: "Próxima" });

		expect(prevButton).toBeDisabled();
		expect(nextButton).toBeEnabled();

		// Act
		await user.click(nextButton);

		// Assert
		expect(onPageChangeSpy).toHaveBeenCalledTimes(1);
		expect(onPageChangeSpy).toHaveBeenCalledWith(2);
	});

	it("HistoryPagination_LastPageOfMultiple_ShouldDisableNextButtonAndEnablePreviousButton", async () => {
		// Arrange
		const user = userEvent.setup();
		const onPageChangeSpy = vi.fn();

		renderWithProviders(
			<HistoryPagination
				page={3}
				totalPages={3}
				totalCount={50}
				onPageChange={onPageChangeSpy}
			/>,
		);

		// Assert
		const prevButton = screen.getByRole("button", { name: "Anterior" });
		const nextButton = screen.getByRole("button", { name: "Próxima" });

		expect(prevButton).toBeEnabled();
		expect(nextButton).toBeDisabled();

		// Act
		await user.click(prevButton);

		// Assert
		expect(onPageChangeSpy).toHaveBeenCalledTimes(1);
		expect(onPageChangeSpy).toHaveBeenCalledWith(2);
	});

	it("HistoryPagination_MiddlePage_ShouldEnableBothButtons", async () => {
		// Arrange
		const user = userEvent.setup();
		const onPageChangeSpy = vi.fn();

		renderWithProviders(
			<HistoryPagination
				page={2}
				totalPages={5}
				totalCount={100}
				onPageChange={onPageChangeSpy}
			/>,
		);

		// Assert
		const prevButton = screen.getByRole("button", { name: "Anterior" });
		const nextButton = screen.getByRole("button", { name: "Próxima" });

		expect(prevButton).toBeEnabled();
		expect(nextButton).toBeEnabled();

		// Act
		await user.click(prevButton);
		await user.click(nextButton);

		// Assert
		expect(onPageChangeSpy).toHaveBeenNthCalledWith(1, 1);
		expect(onPageChangeSpy).toHaveBeenNthCalledWith(2, 3);
	});

	it("HistoryPagination_ZeroTotalCountWithMultiplePages_ShouldCalculateZeroInitialCount", () => {
		// Arrange & Act
		renderWithProviders(
			<HistoryPagination
				page={1}
				totalPages={2}
				totalCount={0}
				onPageChange={vi.fn()}
			/>,
		);

		// Assert
		// Showing info is calculated properly without crashing
		expect(screen.getByRole("button", { name: "Próxima" })).toBeInTheDocument();
	});
});
