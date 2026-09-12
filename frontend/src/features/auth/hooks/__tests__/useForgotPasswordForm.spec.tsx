import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth.api";
import { useForgotPasswordForm } from "../useForgotPasswordForm";

describe("useForgotPasswordForm Hook Unit Tests", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<MemoryRouter>{children}</MemoryRouter>
	);

	it("useForgotPasswordForm_Success_ShouldCallResetPasswordAndSetIsSuccess", async () => {
		const resetSpy = vi
			.spyOn(authApi, "resetPassword")
			.mockResolvedValue(undefined);

		const { result } = renderHook(() => useForgotPasswordForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "admin@nexushub.local");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(resetSpy).toHaveBeenCalledWith("admin@nexushub.local");
		expect(result.current.isSuccess).toBe(true);
		expect(result.current.formState.errors.root).toBeUndefined();
	});

	it("useForgotPasswordForm_AuthError_ShouldSetRootError", async () => {
		vi.spyOn(authApi, "resetPassword").mockRejectedValue(
			new authApi.AuthError(
				"forgotPassword.errors.tooManyRequests",
				"auth/too-many-requests",
			),
		);

		const { result } = renderHook(() => useForgotPasswordForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "admin@nexushub.local");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.isSuccess).toBe(false);
		expect(result.current.formState.errors.root?.message).toBe(
			"forgotPassword.errors.tooManyRequests",
		);
	});

	it("useForgotPasswordForm_GenericError_ShouldSetRootError", async () => {
		vi.spyOn(authApi, "resetPassword").mockRejectedValue(
			new Error("forgotPassword.errors.generic"),
		);

		const { result } = renderHook(() => useForgotPasswordForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "admin@nexushub.local");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.isSuccess).toBe(false);
		expect(result.current.formState.errors.root?.message).toBe(
			"forgotPassword.errors.generic",
		);
	});
});
