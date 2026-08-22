import { apiClient } from "@/core/api/api.client";
import { handleApplicationError } from "@/core/errors/app.errors";
import type {
	SpotifyPlaybackState,
	SpotifyStatus,
} from "../types/integrations.types";

export async function getSpotifyLoginUrlRequest(): Promise<{
	authorizeUrl: string;
}> {
	try {
		const { data } = await apiClient.get<{ authorizeUrl: string }>(
			"/integrations/spotify/login",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível iniciar a conexão com o Spotify.",
		);
	}
}

export async function getSpotifyStatusRequest(): Promise<SpotifyStatus> {
	try {
		const { data } = await apiClient.get<SpotifyStatus>(
			"/integrations/spotify/status",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível verificar o status da conexão com o Spotify.",
		);
	}
}

export async function disconnectSpotifyRequest(): Promise<void> {
	try {
		await apiClient.delete("/integrations/spotify");
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível desconectar a conta do Spotify.",
		);
	}
}

export async function getSpotifyPlaybackRequest(): Promise<SpotifyPlaybackState | null> {
	try {
		const { data } = await apiClient.get<SpotifyPlaybackState | null>(
			"/integrations/spotify/playback",
		);
		return data;
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível carregar o que está tocando no Spotify.",
		);
	}
}

export async function setSpotifyVolumeRequest(volume: number): Promise<void> {
	try {
		await apiClient.put("/integrations/spotify/volume", { volume });
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível ajustar o volume do Spotify.",
		);
	}
}

export async function toggleSpotifyPlaybackRequest(): Promise<void> {
	try {
		await apiClient.put("/integrations/spotify/toggle");
	} catch (error: unknown) {
		throw handleApplicationError(
			error,
			"Não foi possível alternar a reprodução do Spotify.",
		);
	}
}
