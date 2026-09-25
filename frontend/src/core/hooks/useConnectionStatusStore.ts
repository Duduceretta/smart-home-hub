import { create } from "zustand";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface ConnectionStatusState {
	status: ConnectionStatus;
	latencyMs: number | null;
	setStatus: (status: ConnectionStatus) => void;
	setLatencyMs: (latencyMs: number | null) => void;
}

/**
 * Status real da conexão SignalR com o hub + latência de round-trip (medida
 * via `Ping` no `TelemetryHub`, não ping ICMP de rede local — o browser não
 * tem acesso a isso). Escrito exclusivamente por `useRealtimeListener`
 * (único dono do ciclo de vida da conexão); lido por qualquer feature via
 * `core/hooks/useConnectionStatus.ts`.
 *
 * Estado inicial "reconnecting": antes do primeiro `connection.start()`
 * resolver não é nem "connected" (ainda não confirmado) nem "disconnected"
 * (piscaria vermelho a cada carregamento de página) — "tentando conectar"
 * é o mais honesto dos 3 rótulos existentes.
 */
export const useConnectionStatusStore = create<ConnectionStatusState>(
	(set) => ({
		status: "reconnecting",
		latencyMs: null,
		setStatus: (status) => set({ status }),
		setLatencyMs: (latencyMs) => set({ latencyMs }),
	}),
);
