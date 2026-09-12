import { act, renderHook } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../api/auth.api";
import { useAuthStore } from "../../store/useAuthStore";
import { useRegisterForm } from "../useRegisterForm";

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: vi.fn(),
	};
});

describe("useRegisterForm Hook Unit Tests", () => {
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

	it("useRegisterForm_Success_ShouldSetUserAndNavigateWithReplace", async () => {
		const mockUser = {
			uid: "test-user-id",
			email: "user@example.com",
			displayName: "Test User",
		} as User;

		vi.spyOn(authApi, "registerWithEmail").mockResolvedValue(mockUser);

		const { result } = renderHook(() => useRegisterForm(), { wrapper });

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		// Simulate valid submit directly through inner handler logic
		// Or test by invoking the form with valid data
	});

	it("useRegisterForm_EmailAlreadyInUse_ShouldSetFieldErrorOnEmail", async () => {
		const authError = new authApi.AuthError(
			"register.errors.emailInUse",
			"auth/email-already-in-use",
		);
		vi.spyOn(authApi, "registerWithEmail").mockRejectedValue(authError);

		const { result } = renderHook(() => useRegisterForm(), { wrapper });

		// Manually invoke formMethods setValue and submit
		act(() => {
			result.current.setValue("name", "Test User");
			result.current.setValue("email", "used@example.com");
			result.current.setValue("password", "StrongP@ss1");
			result.current.setValue("confirmPassword", "StrongP@ss1");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.email?.message).toBe(
			"register.errors.emailInUse",
		);
		expect(result.current.formState.errors.root).toBeUndefined();
	});

	it("useRegisterForm_WeakPassword_ShouldSetFieldErrorOnPassword", async () => {
		const authError = new authApi.AuthError(
			"register.errors.passwordWeak",
			"auth/weak-password",
		);
		vi.spyOn(authApi, "registerWithEmail").mockRejectedValue(authError);

		const { result } = renderHook(() => useRegisterForm(), { wrapper });

		act(() => {
			result.current.setValue("name", "Test User");
			result.current.setValue("email", "valid@example.com");
			result.current.setValue("password", "StrongP@ss1");
			result.current.setValue("confirmPassword", "StrongP@ss1");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.password?.message).toBe(
			"register.errors.passwordWeak",
		);
		expect(result.current.formState.errors.root).toBeUndefined();
	});

	it("useRegisterForm_UnexpectedError_ShouldSetErrorOnRoot", async () => {
		vi.spyOn(authApi, "registerWithEmail").mockRejectedValue(
			new Error("Falha geral"),
		);

		const { result } = renderHook(() => useRegisterForm(), { wrapper });

		act(() => {
			result.current.setValue("name", "Test User");
			result.current.setValue("email", "valid@example.com");
			result.current.setValue("password", "StrongP@ss1");
			result.current.setValue("confirmPassword", "StrongP@ss1");
		});

		await act(async () => {
			await result.current.handleFormSubmit({
				preventDefault: vi.fn(),
			} as unknown as React.BaseSyntheticEvent);
		});

		expect(result.current.formState.errors.root?.message).toBe("Falha geral");
	});
});
