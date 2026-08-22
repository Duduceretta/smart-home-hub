import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { toggleSpotifyPlaybackRequest } from "../api/integrations.api";
import type { SpotifyPlaybackState } from "../types/integrations.types";
import { integrationsKeys } from "./integrations.keys";

interface ToggleSpotifyContext {
	previousPlayback?: SpotifyPlaybackState | null;
}

export function useToggleSpotifyPlayback() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, void, ToggleSpotifyContext>({
		mutationFn: toggleSpotifyPlaybackRequest,

		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: integrationsKeys.spotifyPlayback(),
			});

			const previousPlayback =
				queryClient.getQueryData<SpotifyPlaybackState | null>(
					integrationsKeys.spotifyPlayback(),
				);

			if (previousPlayback) {
				queryClient.setQueryData<SpotifyPlaybackState>(
					integrationsKeys.spotifyPlayback(),
					{ ...previousPlayback, isPlaying: !previousPlayback.isPlaying },
				);
			}

			return { previousPlayback };
		},

		onError: (error, _variables, context) => {
			if (context?.previousPlayback) {
				queryClient.setQueryData(
					integrationsKeys.spotifyPlayback(),
					context.previousPlayback,
				);
			}
			Logger.error("Falha ao alternar reprodução do Spotify", error);
			toast.error("Não foi possível alternar a reprodução do Spotify", {
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
