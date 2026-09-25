import { useConnectionStatusStore } from "@/core/hooks/useConnectionStatusStore";

/**
 * Fachada somente-leitura sobre `useConnectionStatusStore` — nenhuma feature
 * deve escrever nela diretamente (só `useRealtimeListener`, dono do ciclo de
 * vida da conexão).
 */
export function useConnectionStatus() {
	const status = useConnectionStatusStore((s) => s.status);
	const latencyMs = useConnectionStatusStore((s) => s.latencyMs);
	return { status, latencyMs };
}
