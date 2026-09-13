import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef } from "react";
import { auth } from "@/core/lib/firebase";
import { Logger } from "@/core/logger/app.logger";
import { useAuthStore } from "../store/useAuthStore";
import { useSyncUser } from "./useSyncUser";

export function useAuthListener() {
	const setUser = useAuthStore((state) => state.setUser);
	const setLoading = useAuthStore((state) => state.setLoading);

	const { mutateAsync: syncUserAsync } = useSyncUser();

	// `mutateAsync` do TanStack Query não é estável entre renders (o objeto
	// de opções de `useMutation` é recriado a cada chamada) — colocá-la
	// direto nas deps do efeito abaixo fazia o listener do Firebase ser
	// desinscrito/reinscrito a cada render do App. `onAuthStateChanged`
	// dispara o callback IMEDIATAMENTE a cada nova inscrição (mesmo sem o
	// usuário mudar), disparando outra sincronização, outro re-render, outra
	// referência nova — um loop de requisições que nunca se resolve sozinho
	// (era a causa real do travamento ao navegar rápido: as requisições desse
	// loop saturavam o limite de conexões simultâneas do navegador,
	// deixando QUALQUER outra requisição real enfileirada indefinidamente).
	// Guardar a versão mais recente numa ref evita recriar a inscrição.
	const syncUserAsyncRef = useRef(syncUserAsync);
	syncUserAsyncRef.current = syncUserAsync;

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				setUser(firebaseUser);

				try {
					await syncUserAsyncRef.current();
				} catch (error) {
					Logger.error(
						"Falha ao sincronizar usuário com o banco SQL local",
						error,
					);
				} finally {
					setLoading(false);
				}
			} else {
				setUser(null);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, [setUser, setLoading]);
}
