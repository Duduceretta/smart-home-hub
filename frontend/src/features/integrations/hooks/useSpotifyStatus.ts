import { useQuery } from "@tanstack/react-query";
import { getSpotifyStatusRequest } from "../api/integrations.api";
import type { SpotifyStatus } from "../types/integrations.types";
import { integrationsKeys } from "./integrations.keys";

export function useSpotifyStatus() {
	return useQuery<SpotifyStatus, Error>({
		queryKey: integrationsKeys.spotifyStatus(),
		queryFn: getSpotifyStatusRequest,
		staleTime: 1000 * 30,
	});
}
