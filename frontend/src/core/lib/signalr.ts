import {
	type HubConnection,
	HubConnectionBuilder,
	LogLevel,
} from "@microsoft/signalr";
import { auth } from "./firebase";

const BASE_API_URL: string =
	import.meta.env.VITE_API_URL || "http://localhost:5252/api";

const HUB_URL = `${BASE_API_URL.replace(/\/api$/, "")}/hubs/telemetry`;

export function createSignalRConnection(): HubConnection {
	return (
		new HubConnectionBuilder()
			.withUrl(HUB_URL, {
				accessTokenFactory: async () => {
					const currentUser = auth.currentUser;
					if (!currentUser) return "";
					return await currentUser.getIdToken();
				},
			})
			// Array fixo de delays desiste de reconectar de vez após a última
			// tentativa (dispara onclose e nunca mais tenta) — uma queda
			// silenciosa da conexão (rede instável, aba em segundo plano) matava
			// o real-time pro resto da sessão, sem sinal nenhum pro usuário: REST
			// (toggle, etc.) continua funcionando normalmente porque não depende
			// do WebSocket, só os eventos via SignalR (DeviceStatusChanged,
			// SpotifyPlaybackChanged...) paravam de chegar. Política customizada
			// nunca retorna null, então tenta pra sempre, com backoff limitado a
			// 30s depois da 5ª tentativa.
			.withAutomaticReconnect({
				nextRetryDelayInMilliseconds: (retryContext) => {
					const delays = [0, 2000, 5000, 10000, 30000];
					return delays[
						Math.min(retryContext.previousRetryCount, delays.length - 1)
					];
				},
			})
			.configureLogging(
				import.meta.env.DEV ? LogLevel.Information : LogLevel.None,
			)
			.build()
	);
}
