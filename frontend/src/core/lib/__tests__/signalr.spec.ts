import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const mockBuildResult = {
		on: vi.fn(),
		off: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
	};
	const mockWithUrl = vi.fn();
	const mockWithAutomaticReconnect = vi.fn();
	const mockConfigureLogging = vi.fn();
	const mockBuild = vi.fn();
	const holder: {
		accessTokenFactory?: () => Promise<string>;
		retryPolicy?: {
			nextRetryDelayInMilliseconds: (context: {
				previousRetryCount: number;
			}) => number | null;
		};
	} = {};

	class MockBuilder {
		withUrl(
			url: string,
			options: { accessTokenFactory?: () => Promise<string> },
		) {
			holder.accessTokenFactory = options?.accessTokenFactory;
			mockWithUrl(url, options);
			return this;
		}
		withAutomaticReconnect(policy: {
			nextRetryDelayInMilliseconds: (context: {
				previousRetryCount: number;
			}) => number | null;
		}) {
			holder.retryPolicy = policy;
			mockWithAutomaticReconnect(policy);
			return this;
		}
		configureLogging(level: unknown) {
			mockConfigureLogging(level);
			return this;
		}
		build() {
			mockBuild();
			return mockBuildResult;
		}
	}

	return {
		MockBuilder,
		mockBuildResult,
		mockWithUrl,
		mockWithAutomaticReconnect,
		mockConfigureLogging,
		mockBuild,
		holder,
	};
});

vi.mock("@microsoft/signalr", () => ({
	HubConnectionBuilder: mocks.MockBuilder,
	LogLevel: {
		Information: 1,
		None: 6,
	},
}));

const mockGetIdToken = vi.fn().mockResolvedValue("test-token-123");

vi.mock("../firebase", () => ({
	auth: {
		currentUser: null as { getIdToken: () => Promise<string> } | null,
	},
}));

import { auth } from "../firebase";
import {
	createSignalRConnection,
	getActiveHubConnection,
	setActiveHubConnection,
} from "../signalr";

describe("signalr core library Unit Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActiveHubConnection(null);
		mocks.holder.accessTokenFactory = undefined;
		mocks.holder.retryPolicy = undefined;
		(
			auth as { currentUser: { getIdToken: () => Promise<string> } | null }
		).currentUser = null;
	});

	it("activeConnection_StateManagement_ShouldSetAndGetConnection", () => {
		// Arrange
		expect(getActiveHubConnection()).toBeNull();

		// Act
		// @ts-expect-error test mock instance
		setActiveHubConnection(mocks.mockBuildResult);

		// Assert
		expect(getActiveHubConnection()).toBe(mocks.mockBuildResult);

		// Cleanup
		setActiveHubConnection(null);
		expect(getActiveHubConnection()).toBeNull();
	});

	it("createSignalRConnection_Configuration_ShouldBuildWithExpectedHubUrlAndPolicies", () => {
		// Act
		const connection = createSignalRConnection();

		// Assert
		expect(connection).toBe(mocks.mockBuildResult);
		expect(mocks.mockWithUrl).toHaveBeenCalledWith(
			expect.stringContaining("/hubs/telemetry"),
			expect.objectContaining({ accessTokenFactory: expect.any(Function) }),
		);
		expect(mocks.mockWithAutomaticReconnect).toHaveBeenCalledWith(
			expect.objectContaining({
				nextRetryDelayInMilliseconds: expect.any(Function),
			}),
		);
		expect(mocks.mockConfigureLogging).toHaveBeenCalled();
		expect(mocks.mockBuild).toHaveBeenCalled();
	});

	it("accessTokenFactory_WhenUserIsLoggedOut_ShouldReturnEmptyString", async () => {
		// Arrange
		(
			auth as { currentUser: { getIdToken: () => Promise<string> } | null }
		).currentUser = null;
		createSignalRConnection();

		// Act
		const token = await mocks.holder.accessTokenFactory?.();

		// Assert
		expect(token).toBe("");
	});

	it("accessTokenFactory_WhenUserIsLoggedIn_ShouldReturnIdToken", async () => {
		// Arrange
		(
			auth as { currentUser: { getIdToken: () => Promise<string> } | null }
		).currentUser = {
			getIdToken: mockGetIdToken,
		};
		createSignalRConnection();

		// Act
		const token = await mocks.holder.accessTokenFactory?.();

		// Assert
		expect(token).toBe("test-token-123");
		expect(mockGetIdToken).toHaveBeenCalled();
	});

	it("automaticReconnectPolicy_ExponentialDelays_ShouldReturnExpectedDelays", () => {
		// Arrange
		createSignalRConnection();
		const delays = [0, 2000, 5000, 10000, 30000];

		// Act & Assert
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 0,
			}),
		).toBe(delays[0]);
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 1,
			}),
		).toBe(delays[1]);
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 2,
			}),
		).toBe(delays[2]);
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 3,
			}),
		).toBe(delays[3]);
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 4,
			}),
		).toBe(delays[4]);
		// Any retry beyond the list caps at 30s instead of giving up (returning null)
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 5,
			}),
		).toBe(30000);
		expect(
			mocks.holder.retryPolicy?.nextRetryDelayInMilliseconds({
				previousRetryCount: 99,
			}),
		).toBe(30000);
	});
});
