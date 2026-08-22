export const integrationsKeys = {
	all: ["integrations"] as const,
	spotifyStatus: () => [...integrationsKeys.all, "spotify", "status"] as const,
	spotifyPlayback: () =>
		[...integrationsKeys.all, "spotify", "playback"] as const,
};
