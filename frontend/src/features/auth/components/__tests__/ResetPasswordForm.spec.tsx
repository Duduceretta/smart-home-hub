import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import * as authApi from "../../api/auth.api";
import { ResetPasswordForm } from "../ResetPasswordForm";

describe("ResetPasswordForm Integration Tests", () => {
	it("ResetPasswordForm_WhenVerifyingToken_RendersSkeletonWithRoleStatusAndAriaBusy", () => {
		// Mock verifyResetToken never resolving
		vi.spyOn(authApi, "verifyResetToken").mockImplementation(
			() => new Promise(() => {}),
		);

		renderWithProviders(
			<MemoryRouter initialEntries={["/reset-password?oobCode=valid-code"]}>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		const statusContainer = screen.getByRole("status");
		expect(statusContainer).toBeInTheDocument();
		expect(statusContainer).toHaveAttribute("aria-busy", "true");
		expect(
			screen.getByText("Validando token de recuperação..."),
		).toBeInTheDocument();
	});

	it("ResetPasswordForm_WhenTokenResolved_RendersPasswordFormFields", async () => {
		vi.spyOn(authApi, "verifyResetToken").mockResolvedValue("user@example.com");

		renderWithProviders(
			<MemoryRouter initialEntries={["/reset-password?oobCode=valid-code"]}>
				<ResetPasswordForm />
			</MemoryRouter>,
		);

		expect(
			await screen.findByRole("button", { name: /Salvar nova senha/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Nova Senha", { selector: "label" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Confirmar Nova Senha", { selector: "label" }),
		).toBeInTheDocument();
	});
});
