import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth.api";
import { useResetPasswordForm } from "../useResetPasswordForm";

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: vi.fn(),
	};
});

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe("useResetPasswordForm Hook Unit Tests", () => {
	const mockNavigate = vi.fn();

	beforeEach(() => {
		vi.mocked(useNavigate).mockReturnValue(mockNavigate);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	const createWrapper =
		(initialEntry: string) =>
		({ children }: { children: ReactNode }) => (
			<MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
		);

	it("useResetPasswordForm_MissingOobCode_ShouldSetTokenErrorAndNotVerify", async () => {
		const verifySpy = vi.spyOn(authApi, "verifyResetToken");

		const { result } = renderHook(() => useResetPasswordForm(), {
			wrapper: createWrapper("/reset-password"),
		});

		expect(result.current.isVerifying).toBe(false);
		expect(result.current.tokenError).toBe(
			"resetPassword.errors.invalidOrExpiredToken",
		);
		expect(verifySpy).not.toHaveBeenCalled();
	});

	it("useResetPasswordForm_WrongMode_ShouldRejectAndNotVerify", async () => {
		const verifySpy = vi.spyOn(authApi, "verifyResetToken");

		const { result } = renderHook(() => useResetPasswordForm(), {
			wrapper: createWrapper(
				"/reset-password?oobCode=sample-code&mode=verifyEmail",
			),
		});

		expect(result.current.isVerifying).toBe(false);
		expect(result.current.tokenError).toBe(
			"resetPassword.errors.invalidOrExpiredToken",
		);
		expect(verifySpy).not.toHaveBeenCalled();
	});

	it("useResetPasswordForm_ValidCodeAndMode_ShouldVerifyTokenAndSetEmail", async () => {
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");

		const { result } = renderHook(() => useResetPasswordForm(), {
			wrapper: createWrapper(
				"/reset-password?oobCode=valid-code&mode=resetPassword",
			),
		});

		// Aguarda resolução assíncrona do checkCode
		await vi.waitFor(() => {
			expect(result.current.isVerifying).toBe(false);
		});

		expect(result.current.email).toBe("user@example.com");
		expect(result.current.tokenError).toBeNull();
	});

	it("useResetPasswordForm_VerifyTokenFails_ShouldSetTokenError", async () => {
		vi.spyOn(authApi, "verifyResetToken").mockRejectedValue(
			new authApi.AuthError(
				"resetPassword.errors.invalidOrExpiredToken",
				"auth/expired-action-code",
			),
		);

		const { result } = renderHook(() => useResetPasswordForm(), {
			wrapper: createWrapper("/reset-password?oobCode=expired-code"),
		});

		await vi.waitFor(() => {
			expect(result.current.isVerifying).toBe(false);
		});

		expect(result.current.tokenError).toBe(
			"resetPassword.errors.invalidOrExpiredToken",
		);
	});

	it("useResetPasswordForm_SubmitNewPassword_Success_ShouldShowToastAndNavigate", async () => {
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");
		const submitSpy = vi
			.spyOn(authApi, "submitNewPassword")
			.mockResolvedValue(undefined);

		const { result } = renderHook(() => useResetPasswordForm(), {
			wrapper: createWrapper(
				"/reset-password?oobCode=valid-code&mode=resetPassword",
			),
		});

		await vi.waitFor(() => {
			expect(result.current.isVerifying).toBe(false);
		});

		act(() => {
			result.current.setValue("password", "StrongPass1@");
			result.current.setValue("confirmPassword", "StrongPass1@");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(submitSpy).toHaveBeenCalledWith("valid-code", "StrongPass1@");
		expect(toast.success).toHaveBeenCalled();
		expect(mockNavigate).toHaveBeenCalledWith("/login");
	});

	it("useResetPasswordForm_SubmitNewPassword_AuthError_ShouldSetRootError", async () => {
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");
		vi.spyOn(authApi, "submitNewPassword").mockRejectedValue(
			new authApi.AuthError(
				"resetPassword.errors.expiredActionCode",
				"auth/expired-action-code",
			),
		);

		const { result } = renderHook(() => useResetPasswordForm(), {
			wrapper: createWrapper(
				"/reset-password?oobCode=valid-code&mode=resetPassword",
			),
		});

		await vi.waitFor(() => {
			expect(result.current.isVerifying).toBe(false);
		});

		act(() => {
			result.current.setValue("password", "StrongPass1@");
			result.current.setValue("confirmPassword", "StrongPass1@");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.root?.message).toBe(
			"resetPassword.errors.expiredActionCode",
		);
	});
});
