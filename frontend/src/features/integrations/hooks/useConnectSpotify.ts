import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { getSpotifyLoginUrlRequest } from "../api/integrations.api";

/**
 * Validação preventiva contra Open Redirect: garante que a URL de destino
 * use protocolo seguro e pertença exclusivamente ao domínio oficial do
 * Spotify OAuth ou à origem local do frontend configurada para desenvolvimento/testes.
 */
export function isAllowedSpotifyAuthorizeUrl(rawUrl: string): boolean {
	try {
		const parsed = new URL(rawUrl);

		// Domínio oficial de autenticação OAuth do Spotify (estritamente https)
		if (
			parsed.protocol === "https:" &&
			(parsed.hostname === "accounts.spotify.com" ||
				parsed.hostname.endsWith(".spotify.com"))
		) {
			return true;
		}

		// Origem local autorizada para desenvolvimento e testes automatizados
		if (
			typeof window !== "undefined" &&
			parsed.origin === window.location.origin
		) {
			return true;
		}

		return false;
	} catch {
		return false;
	}
}

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
			if (!isAllowedSpotifyAuthorizeUrl(data.authorizeUrl)) {
				Logger.error(
					"URL de autorização do Spotify rejeitada por validação preventiva de segurança",
					{ url: data.authorizeUrl },
				);
				toast.error(t("spotify.errors.connectFailed"));
				return;
			}

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
