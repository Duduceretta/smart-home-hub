import { describe, expect, it, vi } from "vitest";
import type { AutomationView } from "@/features/automations/types/automations.types";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { AutomationListPanel } from "../AutomationListPanel";

function createMockAutomation(id: string): AutomationView {
	return {
		id,
		name: `Automação ${id}`,
		isActive: true,
		isDraft: false,
		triggerKind: "schedule",
		triggerSummary: "Todos os dias às 08:00",
		conditionSummary: null,
		actionSummaries: ["Ação 1"],
		rulePayload: "{}",
		createdAt: "2026-08-01T12:00:00Z",
		updatedAt: "2026-08-10T15:30:00Z",
		lastExecutedAt: null,
		hasFailedToday: false,
	};
}

describe("AutomationListPanel Integration Tests", () => {
	it("AutomationListPanel_WhenLoadingMore_RendersSkeletonRowAndNoHardcodedPortugueseText", () => {
		const automations = [createMockAutomation("1"), createMockAutomation("2")];

		renderWithProviders(
			<AutomationListPanel
				automations={automations}
				selectedId="1"
				onSelect={vi.fn()}
				viewMode="list"
				onViewModeChange={vi.fn()}
				onToggle={vi.fn()}
				onCreate={vi.fn()}
				query=""
				onQueryChange={vi.fn()}
				onLoadMore={vi.fn()}
				hasMore={true}
				isLoadingMore={true}
				resetKey="initial"
			/>,
		);

		const statusElement = screen.getByRole("status");
		expect(statusElement).toBeInTheDocument();
		expect(statusElement).toHaveAttribute("aria-busy", "true");

		expect(screen.queryByText("Carregando mais...")).not.toBeInTheDocument();
	});
});
