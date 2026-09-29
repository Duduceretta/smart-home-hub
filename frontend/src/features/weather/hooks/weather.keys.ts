export const weatherKeys = {
	all: ["weather"] as const,
	current: () => [...weatherKeys.all, "current"] as const,
};
