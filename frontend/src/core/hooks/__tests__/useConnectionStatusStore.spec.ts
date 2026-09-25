import { beforeEach, describe, expect, it } from "vitest";
import { useConnectionStatusStore } from "../useConnectionStatusStore";

describe("useConnectionStatusStore", () => {
	beforeEach(() => {
		useConnectionStatusStore.setState({ status: "reconnecting", latencyMs: null });
	});

	it("ConnectionStatusStore_InitialState_ShouldDefaultToReconnectingWithNoLatency", () => {
		// Antes do primeiro connection.start() resolver, "reconnecting" é mais
		// honesto que "connected" (ainda não confirmado) ou "disconnected"
		// (pisca vermelho toda vez que a página carrega, falso negativo).
		useConnectionStatusStore.setState(
			useConnectionStatusStore.getInitialState(),
		);
		const state = useConnectionStatusStore.getState();
		expect(state.status).toBe("reconnecting");
		expect(state.latencyMs).toBeNull();
	});

	it("ConnectionStatusStore_SetStatus_ShouldUpdateStatusOnly", () => {
		useConnectionStatusStore.getState().setLatencyMs(42);
		useConnectionStatusStore.getState().setStatus("connected");

		const state = useConnectionStatusStore.getState();
		expect(state.status).toBe("connected");
		// setStatus nunca mexe em latencyMs sozinho — quem decide limpar é o
		// chamador (useRealtimeListener), conforme o caso.
		expect(state.latencyMs).toBe(42);
	});

	it("ConnectionStatusStore_SetLatencyMs_ShouldAcceptNullToClear", () => {
		useConnectionStatusStore.getState().setLatencyMs(15);
		expect(useConnectionStatusStore.getState().latencyMs).toBe(15);

		useConnectionStatusStore.getState().setLatencyMs(null);
		expect(useConnectionStatusStore.getState().latencyMs).toBeNull();
	});
});
