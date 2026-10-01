import { beforeEach, describe, expect, it } from "vitest";
import { createSceneMock } from "@/testing/mocks/scenes.mock";
import { useScenesUIStore } from "../scenes-ui.store";

describe("useScenesUIStore", () => {
	beforeEach(() => {
		useScenesUIStore.setState({
			isEditorOpen: false,
			editingScene: null,
			seed: null,
		});
	});

	it("openCreateEditor_WithoutSeed_ShouldOpenAnEmptyCreateEditor", () => {
		useScenesUIStore.getState().openCreateEditor();

		const state = useScenesUIStore.getState();
		expect(state.isEditorOpen).toBe(true);
		expect(state.editingScene).toBeNull();
		expect(state.seed).toBeNull();
	});

	it("openCreateEditor_WithSuggestionSeed_ShouldKeepItToPrefillTheForm", () => {
		useScenesUIStore
			.getState()
			.openCreateEditor({ name: "Boa Noite", icon: "moon" });

		const state = useScenesUIStore.getState();
		expect(state.isEditorOpen).toBe(true);
		expect(state.editingScene).toBeNull();
		expect(state.seed).toEqual({ name: "Boa Noite", icon: "moon" });
	});

	it("openEditEditor_ShouldOpenTheEditorOnTheGivenScene", () => {
		const scene = createSceneMock();

		useScenesUIStore.getState().openEditEditor(scene);

		const state = useScenesUIStore.getState();
		expect(state.isEditorOpen).toBe(true);
		expect(state.editingScene).toEqual(scene);
		expect(state.seed).toBeNull();
	});

	it("openCreateEditor_AfterEditing_ShouldDropThePreviousScene", () => {
		useScenesUIStore.getState().openEditEditor(createSceneMock());

		useScenesUIStore.getState().openCreateEditor();

		expect(useScenesUIStore.getState().editingScene).toBeNull();
	});

	it("closeEditor_ShouldResetEverything", () => {
		useScenesUIStore
			.getState()
			.openCreateEditor({ name: "Boa Noite", icon: "moon" });

		useScenesUIStore.getState().closeEditor();

		expect(useScenesUIStore.getState()).toMatchObject({
			isEditorOpen: false,
			editingScene: null,
			seed: null,
		});
	});
});
