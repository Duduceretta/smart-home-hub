import { useQuery } from "@tanstack/react-query";
import { getSpotifyPlaybackRequest } from "../api/integrations.api";
import type { SpotifyPlaybackState } from "../types/integrations.types";
import { integrationsKeys } from "./integrations.keys";

interface UseSpotifyPlaybackOptions {
	enabled?: boolean;
}

/**
 * Busca o playback inicial ao montar — atualização contínua vem do evento
 * SignalR "SpotifyPlaybackChanged" (useRealtimeListener), sem polling client-side.
 */
export function useSpotifyPlayback({
	enabled = true,
}: UseSpotifyPlaybackOptions = {}) {
	return useQuery<SpotifyPlaybackState | null, Error>({
		queryKey: integrationsKeys.spotifyPlayback(),
		queryFn: getSpotifyPlaybackRequest,
		enabled,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	});
}
