import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { getSpotifyLoginUrlRequest } from "../api/integrations.api";

/**
 * Só a navegação final (`window.location.href`) sai do app — a chamada que
 * busca a URL é autenticada normalmente via apiClient, e o backend já amarra
 * o `state` do OAuth ao usuário logado antes de devolver a URL.
 */
export function useConnectSpotify() {
	const { t } = useTranslation("integrations");

	return useMutation<{ authorizeUrl: string }, AppError>({
		mutationFn: getSpotifyLoginUrlRequest,

		onSuccess: (data) => {
			window.location.href = data.authorizeUrl;
		},

		onError: (error) => {
			Logger.error("Falha ao iniciar conexão com o Spotify", error);
			toast.error(t("spotify.errors.connectFailed"), {
				description: error.message,
			});
		},
	});
}
