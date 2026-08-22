import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { setSpotifyVolumeRequest } from "../api/integrations.api";
import { integrationsKeys } from "./integrations.keys";

export function useSetSpotifyVolume() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, number>({
		mutationFn: setSpotifyVolumeRequest,

		onError: (error) => {
			Logger.error("Falha ao ajustar o volume do Spotify", error);
			toast.error("Não foi possível ajustar o volume do Spotify", {
				description: error.message,
			});
		},

		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: integrationsKeys.spotifyPlayback(),
			});
		},
	});
}
