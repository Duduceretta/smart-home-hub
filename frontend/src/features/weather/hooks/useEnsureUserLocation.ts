import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useCurrentWeather } from "./useCurrentWeather";
import { useUpdateUserLocation } from "./useUpdateUserLocation";

/**
 * Captura a localização da residência UMA VEZ, sob gesto explícito do
 * usuário — nunca automaticamente ao montar. Best practice documentada pelo
 * Google (Geolocation API Web Services): pedir permissão no carregamento da
 * página é anti-padrão, prompt só deve responder a uma ação clara do
 * usuário (ex: clique num botão "Ativar localização").
 *
 * `requestLocation` é essa ação — quem chama decide quando (nenhum efeito
 * automático aqui). Depois de salva, `useCurrentWeather` reflete
 * `hasLocation: true` e `needsLocation` vira `false` sozinho — nunca
 * pergunta de novo.
 */
export function useEnsureUserLocation() {
	const { data } = useCurrentWeather();
	const { mutate: saveLocation, isPending: isSaving } = useUpdateUserLocation();
	const [permissionDenied, setPermissionDenied] = useState(false);

	const needsLocation = data?.hasLocation === false;

	const requestLocation = useCallback(() => {
		if (!navigator.geolocation) {
			setPermissionDenied(true);
			toast.error("Geolocalização não é suportada neste navegador");
			return;
		}

		setPermissionDenied(false);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				saveLocation({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
			},
			() => {
				// Negada ou indisponível — nunca tenta de novo sozinho, só se o
				// usuário clicar no botão outra vez. Toast avisa o porquê em vez
				// de um texto fixo no card empurrando o layout.
				setPermissionDenied(true);
				toast.error("Permissão de localização bloqueada", {
					description:
						"Libere o acesso à localização nas configurações do navegador pra ver o clima.",
				});
			},
		);
	}, [saveLocation]);

	return { needsLocation, requestLocation, isSaving, permissionDenied };
}
