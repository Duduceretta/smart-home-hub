import axios, { type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../hooks/useAuthStore";
import { auth } from "../lib/firebase";
import { Logger } from "../logger/app.logger";

type NavigationHandler = (to: string) => void;
let onUnauthorizedCallback: NavigationHandler | null = null;

export function setUnauthorizedRedirectHandler(
	handler: NavigationHandler | null,
) {
	onUnauthorizedCallback = handler;
}

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:5252/api",
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 10000,
});

apiClient.interceptors.request.use(
	async (config: InternalAxiosRequestConfig) => {
		try {
			const currentUser = auth.currentUser;

			if (currentUser) {
				const token = await currentUser.getIdToken();
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (error: unknown) {
			Logger.error("Falha ao injetar token de autenticação no Axios", error);
		}

		return config;
	},
	(error: unknown) => {
		return Promise.reject(error);
	},
);

apiClient.interceptors.response.use(
	(response) => response,
	async (error: unknown) => {
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			Logger.warn(
				"Sessão revogada ou não autorizada (401). Deslogando usuário...",
			);

			try {
				await auth.signOut();
			} catch (signOutError: unknown) {
				Logger.error(
					"Falha ao executar signOut no Firebase após 401",
					signOutError,
				);
			}

			useAuthStore.getState().setUser(null);
			useAuthStore.getState().setLoading(false);

			if (onUnauthorizedCallback) {
				onUnauthorizedCallback("/login");
			}
		} else {
			Logger.error("Falha de rede ou servidor detectada no Axios", error);
		}

		return Promise.reject(error);
	},
);
