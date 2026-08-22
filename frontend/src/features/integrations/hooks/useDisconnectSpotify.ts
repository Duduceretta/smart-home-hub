import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { disconnectSpotifyRequest } from "../api/integrations.api";
import { integrationsKeys } from "./integrations.keys";

export function useDisconnectSpotify() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError>({
		mutationFn: disconnectSpotifyRequest,

		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: integrationsKeys.spotifyStatus(),
			});
			queryClient.invalidateQueries({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
			toast.success("Conta do Spotify desconectada.");
		},

		onError: (error) => {
			Logger.error("Falha ao desconectar a conta do Spotify", error);
			toast.error("Não foi possível desconectar do Spotify", {
				description: error.message,
			});
		},
	});
}
