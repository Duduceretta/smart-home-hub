import { useEffect, useRef, useState } from "react";

/**
 * Local UI state for a continuous device control (brightness, color,
 * color temperature, ...) that mirrors a value read from the API but is
 * driven optimistically by direct user interaction (drag, click) between
 * commits.
 *
 * Sincroniza com `remoteValue` sempre que ele muda de verdade (GET
 * inicial, refetch, ou uma futura atualização via SignalR de outra
 * origem — ex: automação) — mesmo padrão já usado pro volume de TV em
 * `DeviceCard.tsx`.
 *
 * A dependência do efeito de sincronização é só `remoteValue` —
 * DELIBERADAMENTE não inclui `isInteracting`. Achado com um bug real na
 * primeira versão do brilho: se `isInteracting` estivesse nas deps,
 * soltar o controle (isInteracting: true -> false) re-rodava o efeito
 * contra o `remoteValue` ainda desatualizado (o refetch é assíncrono) e
 * "puxava" o valor recém-ajustado de volta pro antigo por um instante.
 * `isInteracting` é lido via ref dentro do efeito só pra decidir se ele
 * deve agir, nunca como gatilho de re-execução.
 */
export function useSyncedDeviceControl<T>(remoteValue: T | null, fallback: T) {
	const [value, setValue] = useState<T>(remoteValue ?? fallback);
	const [isInteracting, setIsInteracting] = useState(false);
	const lastCommittedRef = useRef<T>(remoteValue ?? fallback);

	const isInteractingRef = useRef(isInteracting);
	useEffect(() => {
		isInteractingRef.current = isInteracting;
	}, [isInteracting]);

	useEffect(() => {
		if (isInteractingRef.current) return;
		const remote = remoteValue ?? fallback;
		setValue(remote);
		lastCommittedRef.current = remote;
	}, [remoteValue, fallback]);

	return {
		value,
		setValue,
		isInteracting,
		setIsInteracting,
		lastCommittedRef,
	};
}
