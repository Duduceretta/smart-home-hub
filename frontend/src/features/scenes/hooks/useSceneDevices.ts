import { useQuery } from "@tanstack/react-query";
import { fetchSceneDevices } from "../api/scenes.api";
import { isSceneEligibleDevice } from "../lib/scene-devices";
import type { SceneDevice } from "../types/scenes.types";
import { scenesKeys } from "./scenes.keys";

/**
 * Dispositivos que uma cena pode controlar (sem sensor, câmera, fechadura e
 * alarme), com o estado atual de cada um para pré-preencher o editor.
 * Stale time curto: o estado atual é a base do que o usuário vai salvar.
 */
export function useSceneDevices(enabled = true) {
	return useQuery<SceneDevice[], Error, SceneDevice[]>({
		queryKey: scenesKeys.devices(),
		queryFn: ({ signal }) => fetchSceneDevices(signal),
		select: (devices) => devices.filter(isSceneEligibleDevice),
		staleTime: 1000 * 30,
		retry: 1,
		enabled,
	});
}
