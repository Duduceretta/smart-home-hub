import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../hooks/useAuthStore";

const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockGetIdToken = vi.fn().mockResolvedValue("fake-id-token-xyz");

vi.mock("../../lib/firebase", () => ({
	auth: {
		currentUser: null as { getIdToken: () => Promise<string> } | null,
		signOut: () => mockSignOut(),
	},
}));

vi.mock("../../logger/app.logger", () => ({
	Logger: {
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

import { auth } from "../../lib/firebase";
import { apiClient, setUnauthorizedRedirectHandler } from "../api.client";

describe("apiClient Interceptors Unit Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setUnauthorizedRedirectHandler(null);
		useAuthStore.setState({ user: null, isLoading: false });
		(
			auth as { currentUser: { getIdToken: () => Promise<string> } | null }
		).currentUser = null;
	});

	it("requestInterceptor_WhenUserIsLoggedIn_ShouldInjectAuthorizationBearerHeader", async () => {
		// Arrange
		(
			auth as { currentUser: { getIdToken: () => Promise<string> } | null }
		).currentUser = {
			getIdToken: mockGetIdToken,
		};

		// Act
		// biome-ignore lint/suspicious/noExplicitAny: accessing internal Axios interceptor handlers for direct unit testing
		const requestHandler = (apiClient.interceptors.request as any).handlers[0]
			.fulfilled;
		const initialConfig = { headers: {} as Record<string, string> };

		const resultConfig = await requestHandler(initialConfig);

		// Assert
		expect(mockGetIdToken).toHaveBeenCalled();
		expect(resultConfig.headers.Authorization).toBe("Bearer fake-id-token-xyz");
	});

	it("responseInterceptor_On401Unauthorized_ShouldSignOutResetStoreAndRedirectToLogin", async () => {
		// Arrange
		const fakeUser = { uid: "test-user-401", email: "user@test.local" } as User;
		useAuthStore.setState({ user: fakeUser, isLoading: false });

		const redirectSpy = vi.fn();
		setUnauthorizedRedirectHandler(redirectSpy);

		// biome-ignore lint/suspicious/noExplicitAny: accessing internal Axios interceptor handlers for direct unit testing
		const errorHandler = (apiClient.interceptors.response as any).handlers[0]
			.rejected;

		const axios401Error = {
			isAxiosError: true,
			response: {
				status: 401,
				data: { message: "Unauthorized" },
			},
		};

		// Act & Assert
		await expect(errorHandler(axios401Error)).rejects.toEqual(axios401Error);

		expect(mockSignOut).toHaveBeenCalledTimes(1);
		expect(useAuthStore.getState().user).toBeNull();
		expect(useAuthStore.getState().isLoading).toBe(false);
		expect(redirectSpy).toHaveBeenCalledWith("/login");
	});

	it("responseInterceptor_OnNon401Error_ShouldNotSignOutOrRedirect", async () => {
		// Arrange
		const fakeUser = { uid: "test-user-500", email: "user@test.local" } as User;
		useAuthStore.setState({ user: fakeUser, isLoading: false });

		const redirectSpy = vi.fn();
		setUnauthorizedRedirectHandler(redirectSpy);

		// biome-ignore lint/suspicious/noExplicitAny: accessing internal Axios interceptor handlers for direct unit testing
		const errorHandler = (apiClient.interceptors.response as any).handlers[0]
			.rejected;

		const axios500Error = {
			isAxiosError: true,
			response: {
				status: 500,
				data: { message: "Internal Server Error" },
			},
		};

		// Act & Assert
		await expect(errorHandler(axios500Error)).rejects.toEqual(axios500Error);

		expect(mockSignOut).not.toHaveBeenCalled();
		expect(useAuthStore.getState().user).toBe(fakeUser);
		expect(redirectSpy).not.toHaveBeenCalled();
	});
});
