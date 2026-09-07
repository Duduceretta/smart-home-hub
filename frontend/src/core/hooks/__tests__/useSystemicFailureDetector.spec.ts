import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/testing/test-utils";
import { useSystemicFailureDetector } from "../useSystemicFailureDetector";

describe("useSystemicFailureDetector Unit Tests", () => {
	it("useSystemicFailureDetector_NoQueryFailing_ShouldNotBeSystemic", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: false, refetch: vi.fn() },
				{ isError: false, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(false);
		expect(result.current.failingCount).toBe(0);
	});

	it("useSystemicFailureDetector_OneQueryFailing_ShouldBeLocalNotSystemic", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, refetch: vi.fn() },
				{ isError: false, refetch: vi.fn() },
				{ isError: false, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(false);
		expect(result.current.failingCount).toBe(1);
	});

	it("useSystemicFailureDetector_TwoOrMoreQueriesFailing_ShouldBeSystemic", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, refetch: vi.fn() },
				{ isError: true, refetch: vi.fn() },
				{ isError: false, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(true);
		expect(result.current.failingCount).toBe(2);
	});

	it("useSystemicFailureDetector_RetryAll_ShouldRefetchOnlyFailingQueries", () => {
		// Arrange
		const refetchFailing1 = vi.fn();
		const refetchFailing2 = vi.fn();
		const refetchHealthy = vi.fn();
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, refetch: refetchFailing1 },
				{ isError: true, refetch: refetchFailing2 },
				{ isError: false, refetch: refetchHealthy },
			]),
		);

		// Act
		result.current.retryAll();

		// Assert
		expect(refetchFailing1).toHaveBeenCalledTimes(1);
		expect(refetchFailing2).toHaveBeenCalledTimes(1);
		expect(refetchHealthy).not.toHaveBeenCalled();
	});
});
