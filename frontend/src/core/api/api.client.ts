import axios, { type InternalAxiosRequestConfig } from "axios";
import { auth } from "../lib/firebase";
import { Logger } from "../logger/app.logger";

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
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
	(error: unknown) => {
		Logger.error("Falha de rede ou servidor detectada no Axios", error);
		return Promise.reject(error);
	},
);
