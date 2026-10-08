import { beforeEach, describe, expect, it } from "vitest";
import { useScenesUIStore } from "../scenes-ui.store";

describe("useScenesUIStore", () => {
	beforeEach(() => {
		useScenesUIStore.setState({ viewMode: "list" });
	});

	it("viewMode_Default_ShouldBeTheList", () => {
		expect(useScenesUIStore.getInitialState().viewMode).toBe("list");
	});

	it("setViewMode_ShouldSwitchBetweenListAndCards", () => {
		useScenesUIStore.getState().setViewMode("cards");
		expect(useScenesUIStore.getState().viewMode).toBe("cards");

		useScenesUIStore.getState().setViewMode("list");
		expect(useScenesUIStore.getState().viewMode).toBe("list");
	});
});
