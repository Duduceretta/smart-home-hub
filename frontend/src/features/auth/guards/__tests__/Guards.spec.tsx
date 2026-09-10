import type { User } from "firebase/auth";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { useAuthStore } from "../../store/useAuthStore";
import { ProtectedRoute } from "../ProtectedRoute";
import { PublicRoute } from "../PublicRoute";

function TestLoginPage() {
	const location = useLocation();
	const from = (
		location.state as {
			from?: { pathname: string };
		}
	)?.from?.pathname;

	return (
		<div>
			<h1>Login Page</h1>
			<p data-testid="from-path">{from ?? "none"}</p>
		</div>
	);
}

function TestProtectedPage() {
	return <h1>Protected Dashboard</h1>;
}

function TestSettingsPage() {
	return <h1>Protected Settings</h1>;
}

describe("Route Guards Integration Tests", () => {
	beforeEach(() => {
		useAuthStore.setState({ user: null, isLoading: false });
	});

	it("ProtectedRoute_WhenLoading_ShouldRenderSpinnerAndLoadingText", () => {
		// Arrange
		useAuthStore.setState({ user: null, isLoading: true });

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Routes>
					<Route element={<ProtectedRoute />}>
						<Route path="/dashboard" element={<TestProtectedPage />} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText(/Verificando credenciais/i)).toBeInTheDocument();
	});

	it("ProtectedRoute_WhenUnauthenticated_ShouldRedirectToLoginAndPreserveLocationState", () => {
		// Arrange
		useAuthStore.setState({ user: null, isLoading: false });

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/settings"]}>
				<Routes>
					<Route path="/login" element={<TestLoginPage />} />
					<Route element={<ProtectedRoute />}>
						<Route path="/settings" element={<TestSettingsPage />} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Login Page" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("from-path")).toHaveTextContent("/settings");
	});

	it("ProtectedRoute_WhenAuthenticated_ShouldRenderProtectedOutlet", () => {
		// Arrange
		const fakeUser = { uid: "user-123" } as User;
		useAuthStore.setState({ user: fakeUser, isLoading: false });

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Routes>
					<Route path="/login" element={<TestLoginPage />} />
					<Route element={<ProtectedRoute />}>
						<Route path="/dashboard" element={<TestProtectedPage />} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Protected Dashboard" }),
		).toBeInTheDocument();
	});

	it("PublicRoute_WhenAuthenticatedWithFromState_ShouldRedirectToPreservedRoute", () => {
		// Arrange
		const fakeUser = { uid: "user-123" } as User;
		useAuthStore.setState({ user: fakeUser, isLoading: false });

		// Act
		renderWithProviders(
			<MemoryRouter
				initialEntries={[
					{ pathname: "/login", state: { from: { pathname: "/settings" } } },
				]}
			>
				<Routes>
					<Route path="/settings" element={<TestSettingsPage />} />
					<Route path="/dashboard" element={<TestProtectedPage />} />
					<Route element={<PublicRoute />}>
						<Route path="/login" element={<TestLoginPage />} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Protected Settings" }),
		).toBeInTheDocument();
	});

	it("PublicRoute_WhenAuthenticatedWithoutFromState_ShouldRedirectToDashboard", () => {
		// Arrange
		const fakeUser = { uid: "user-123" } as User;
		useAuthStore.setState({ user: fakeUser, isLoading: false });

		// Act
		renderWithProviders(
			<MemoryRouter initialEntries={["/login"]}>
				<Routes>
					<Route path="/dashboard" element={<TestProtectedPage />} />
					<Route element={<PublicRoute />}>
						<Route path="/login" element={<TestLoginPage />} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Protected Dashboard" }),
		).toBeInTheDocument();
	});
});
