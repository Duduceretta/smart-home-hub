import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { disconnectSpotifyRequest } from "../api/integrations.api";
import { integrationsKeys } from "./integrations.keys";

export function useDisconnectSpotify() {
	const { t } = useTranslation("integrations");
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
			toast.success(t("spotify.success.disconnected"));
		},

		onError: (error) => {
			Logger.error("Falha ao desconectar a conta do Spotify", error);
			toast.error(t("spotify.errors.disconnectFailed"), {
				description: error.message,
			});
		},
	});
}
