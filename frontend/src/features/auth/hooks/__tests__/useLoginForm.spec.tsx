import { act, renderHook } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth.api";
import { useAuthStore } from "../../store/useAuthStore";
import { useLoginForm } from "../useLoginForm";

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: vi.fn(),
	};
});

describe("useLoginForm Hook Unit Tests", () => {
	const mockNavigate = vi.fn();

	beforeEach(() => {
		vi.mocked(useNavigate).mockReturnValue(mockNavigate);
		useAuthStore.setState({ user: null, isLoading: false });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<MemoryRouter>{children}</MemoryRouter>
	);

	it("useLoginForm_Success_ShouldSetUserAndNavigateWithReplace", async () => {
		const mockUser = {
			uid: "login-user-id",
			email: "valid@example.com",
		} as User;

		vi.spyOn(authApi, "loginWithEmail").mockResolvedValue(mockUser);

		const { result } = renderHook(() => useLoginForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "valid@example.com");
			result.current.setValue("password", "StrongPass1");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(useAuthStore.getState().user).toEqual(mockUser);
		expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
	});

	it("useLoginForm_InvalidCredentials_ShouldSetRootError", async () => {
		const authError = new authApi.AuthError(
			"login.errors.invalidCredentials",
			"auth/invalid-credential",
		);
		vi.spyOn(authApi, "loginWithEmail").mockRejectedValue(authError);

		const { result } = renderHook(() => useLoginForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "valid@example.com");
			result.current.setValue("password", "WrongPass1");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.root?.message).toBe(
			"login.errors.invalidCredentials",
		);
		expect(result.current.formState.errors.email).toBeUndefined();
	});

	it("useLoginForm_InvalidEmail_ShouldSetFieldErrorOnEmail", async () => {
		const authError = new authApi.AuthError(
			"login.errors.emailInvalid",
			"auth/invalid-email",
		);
		vi.spyOn(authApi, "loginWithEmail").mockRejectedValue(authError);

		const { result } = renderHook(() => useLoginForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "malformed-email@domain.com");
			result.current.setValue("password", "ValidPass1");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.email?.message).toBe(
			"login.errors.emailInvalid",
		);
		expect(result.current.formState.errors.root).toBeUndefined();
	});

	it("useLoginForm_UserDisabled_ShouldSetRootError", async () => {
		const authError = new authApi.AuthError(
			"login.errors.userDisabled",
			"auth/user-disabled",
		);
		vi.spyOn(authApi, "loginWithEmail").mockRejectedValue(authError);

		const { result } = renderHook(() => useLoginForm(), { wrapper });

		act(() => {
			result.current.setValue("email", "blocked@example.com");
			result.current.setValue("password", "Pass1234");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.root?.message).toBe(
			"login.errors.userDisabled",
		);
	});
});
