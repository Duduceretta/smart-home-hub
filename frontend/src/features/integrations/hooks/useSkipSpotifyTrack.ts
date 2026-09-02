import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import {
	skipToNextSpotifyTrackRequest,
	skipToPreviousSpotifyTrackRequest,
} from "../api/integrations.api";
import { integrationsKeys } from "./integrations.keys";

export function useSkipToNextSpotifyTrack() {
	const { t } = useTranslation("integrations");
	const queryClient = useQueryClient();

	return useMutation<void, AppError, void>({
		mutationFn: skipToNextSpotifyTrackRequest,

		onError: (error) => {
			Logger.error("Falha ao pular para a próxima faixa do Spotify", error);
			toast.error(t("spotify.errors.skipNextFailed"), {
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

export function useSkipToPreviousSpotifyTrack() {
	const { t } = useTranslation("integrations");
	const queryClient = useQueryClient();

	return useMutation<void, AppError, void>({
		mutationFn: skipToPreviousSpotifyTrackRequest,

		onError: (error) => {
			Logger.error("Falha ao voltar para a faixa anterior do Spotify", error);
			toast.error(t("spotify.errors.skipPreviousFailed"), {
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
