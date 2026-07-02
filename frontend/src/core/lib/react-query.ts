import { QueryCache, QueryClient } from "@tanstack/react-query";
import { Logger } from "../logger/app.logger";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (query.meta?.errorMessage) {
				Logger.error(query.meta.errorMessage as string, error);
			} else {
				Logger.error(
					"Falha em requisição de background (TanStack Query)",
					error,
				);
			}
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 2,
			staleTime: 1000 * 60 * 5,
		},
	},
});
