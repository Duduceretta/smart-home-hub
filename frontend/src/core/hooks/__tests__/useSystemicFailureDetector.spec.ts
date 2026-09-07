import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/testing/test-utils";
import { useSystemicFailureDetector } from "../useSystemicFailureDetector";

describe("useSystemicFailureDetector Unit Tests", () => {
	it("useSystemicFailureDetector_NoQueryFailing_ShouldNotBeSystemic", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: false, hasData: true, refetch: vi.fn() },
				{ isError: false, hasData: true, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(false);
		expect(result.current.failingCount).toBe(0);
	});

	it("useSystemicFailureDetector_OneQueryFailingWithoutCache_ShouldBeLocalNotSystemic", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, hasData: false, refetch: vi.fn() },
				{ isError: false, hasData: true, refetch: vi.fn() },
				{ isError: false, hasData: true, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(false);
		expect(result.current.failingCount).toBe(1);
	});

	it("useSystemicFailureDetector_TwoOrMoreQueriesFailingWithoutCache_ShouldBeSystemic", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, hasData: false, refetch: vi.fn() },
				{ isError: true, hasData: false, refetch: vi.fn() },
				{ isError: false, hasData: true, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(true);
		expect(result.current.failingCount).toBe(2);
	});

	it("useSystemicFailureDetector_TwoOrMoreQueriesFailingButWithCache_ShouldNotBeSystemic", () => {
		// Arrange — 2+ queries em isError, mas ambas com cache válido (stale,
		// já degradando graciosamente com StaleDataIndicator) — não é sintoma
		// de outage, é o caso local/stale que a seção 12.1 já resolve.
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, hasData: true, refetch: vi.fn() },
				{ isError: true, hasData: true, refetch: vi.fn() },
				{ isError: false, hasData: true, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(false);
		expect(result.current.failingCount).toBe(0);
	});

	it("useSystemicFailureDetector_MixOfCachedAndUncachedFailures_ShouldOnlyCountUncached", () => {
		// Arrange — 1 falha sem cache + 1 falha com cache (stale) — só 1
		// falha "de verdade" pro cálculo, continua LOCAL
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, hasData: false, refetch: vi.fn() },
				{ isError: true, hasData: true, refetch: vi.fn() },
				{ isError: false, hasData: true, refetch: vi.fn() },
			]),
		);

		// Assert
		expect(result.current.isSystemic).toBe(false);
		expect(result.current.failingCount).toBe(1);
	});

	it("useSystemicFailureDetector_RetryAll_ShouldRefetchEveryErroringQueryRegardlessOfCache", () => {
		// Arrange — retryAll dispara pra toda query em erro (com ou sem
		// cache) quando acionado, não só as que contam pro isSystemic
		const refetchUncached = vi.fn();
		const refetchStale = vi.fn();
		const refetchHealthy = vi.fn();
		const { result } = renderHook(() =>
			useSystemicFailureDetector([
				{ isError: true, hasData: false, refetch: refetchUncached },
				{ isError: true, hasData: true, refetch: refetchStale },
				{ isError: false, hasData: true, refetch: refetchHealthy },
			]),
		);

		// Act
		result.current.retryAll();

		// Assert
		expect(refetchUncached).toHaveBeenCalledTimes(1);
		expect(refetchStale).toHaveBeenCalledTimes(1);
		expect(refetchHealthy).not.toHaveBeenCalled();
	});
});
