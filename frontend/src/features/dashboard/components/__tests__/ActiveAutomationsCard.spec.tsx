import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { ActiveAutomationsCard } from "../ActiveAutomationsCard";

describe("ActiveAutomationsCard Integration Tests", () => {
	it("ActiveAutomationsCard_Rendered_ShouldShowHonestEmptyState", () => {
		// Act
		renderWithProviders(<ActiveAutomationsCard />);

		// Assert
		expect(
			screen.getByText("Nenhuma automação configurada ainda"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Rotinas e automações vão aparecer aqui assim que essa feature estiver disponível.",
			),
		).toBeInTheDocument();
	});
});
