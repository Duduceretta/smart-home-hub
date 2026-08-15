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
	return new HubConnectionBuilder()
		.withUrl(HUB_URL, {
			accessTokenFactory: async () => {
				const currentUser = auth.currentUser;
				if (!currentUser) return "";
				return await currentUser.getIdToken();
			},
		})
		.withAutomaticReconnect([0, 2000, 10000, 30000])
		.configureLogging(
			import.meta.env.DEV ? LogLevel.Information : LogLevel.None,
		)
		.build();
}
