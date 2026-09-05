import { HubConnectionState } from "@microsoft/signalr";
import { useCallback, useEffect, useRef } from "react";
import { getActiveHubConnection } from "@/core/lib/signalr";
import { Logger } from "@/core/logger/app.logger";

/**
 * Throttle de invocação de método do Hub SignalR durante uma interação
 * contínua (arraste de slider de brilho/cor/temperatura de cor) — no máximo
 * 1 invocação a cada `delayMs` (padrão 90ms, dentro da faixa 80-100ms
 * pedida), sempre carregando os argumentos mais recentes (nunca uma fila
 * dos intermediários).
 *
 * Complementar, não redundante, com a coalescência last-value-wins de 75ms
 * já existente no driver Tuya (`TuyaLightCommandCoalescer`, backend): este
 * throttle reduz o volume de invocações ANTES de chegar no backend; o
 * driver funde o que ainda sobra do lado do hardware. Os dois níveis
 * resolvem a mesma rajada em pontos diferentes do pipeline, sem competir.
 *
 * Fire-and-forget deliberado: uma falha de frame intermediário (Device.Busy,
 * conexão momentaneamente fora do ar) nunca deve interromper o arraste nem
 * mostrar erro pro usuário — o commit final via REST no
 * `onPointerUp`/`onChangeEnd` continua sendo a única fonte de verdade sobre
 * sucesso real (ver `useSyncedDeviceControl`).
 */
export function useThrottledHubInvoke<TArgs extends unknown[]>(
	methodName: string,
	delayMs = 90,
) {
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const pendingArgsRef = useRef<TArgs | null>(null);

	useEffect(() => {
		return () => {
			clearTimeout(timeoutRef.current);
		};
	}, []);

	return useCallback(
		(...args: TArgs) => {
			pendingArgsRef.current = args;
			if (timeoutRef.current) return;

			timeoutRef.current = setTimeout(() => {
				timeoutRef.current = undefined;
				const latestArgs = pendingArgsRef.current;
				pendingArgsRef.current = null;
				if (!latestArgs) return;

				const connection = getActiveHubConnection();
				if (!connection || connection.state !== HubConnectionState.Connected)
					return;

				connection.invoke(methodName, ...latestArgs).catch((error: unknown) => {
					Logger.warn(
						`Falha ao invocar preview "${methodName}" via SignalR durante arraste`,
						error,
					);
				});
			}, delayMs);
		},
		[methodName, delayMs],
	);
}
