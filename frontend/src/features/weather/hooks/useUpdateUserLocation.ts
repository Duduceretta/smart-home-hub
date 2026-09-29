import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppError } from "@/core/errors/app.errors";
import { Logger } from "@/core/logger/app.logger";
import { updateUserLocation } from "../api/weather.api";
import { weatherKeys } from "./weather.keys";

interface UpdateUserLocationInput {
	latitude: number;
	longitude: number;
}

export function useUpdateUserLocation() {
	const queryClient = useQueryClient();

	return useMutation<void, AppError, UpdateUserLocationInput>({
		mutationFn: ({ latitude, longitude }) =>
			updateUserLocation(latitude, longitude),

		onError: (error) => {
			Logger.error("Falha ao salvar localização do usuário", error);
		},

		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: weatherKeys.current() });
		},
	});
}
