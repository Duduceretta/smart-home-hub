/**
 * Espelha SpotifyStatusDto (C#).
 */
export interface SpotifyStatus {
	connected: boolean;
	displayName: string | null;
}

/**
 * Espelha DeviceMediaStateDto (C#) — mesmo shape usado pela mídia de TV,
 * com os dois campos extras que só o Spotify preenche.
 */
export interface SpotifyPlaybackState {
	volumePercent: number;
	isPlaying: boolean;
	title: string | null;
	artist: string | null;
	albumCoverUrl: string | null;
	deviceName: string | null;
}
