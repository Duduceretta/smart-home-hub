import axios from "axios";
import {
	confirmPasswordReset,
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
	type User,
	updateProfile,
	verifyPasswordResetCode,
} from "firebase/auth";
import { apiClient } from "@/core/api/api.client";
import { auth } from "@/core/lib/firebase";
import { Logger } from "@/core/logger/app.logger";
import type {
	LoginFormData,
	RegisterFormData,
} from "@/features/auth/types/auth.schemas";
import type { SyncUserResponse } from "../types/auth.types";

const CANCELLED_CODES = new Set([
	"auth/popup-closed-by-user",
	"auth/cancelled-popup-request",
]);

export class AuthError extends Error {
	public readonly code?: string;

	constructor(message: string, code?: string) {
		super(message);
		this.name = "AuthError";
		this.code = code;
	}
}

export const loginWithEmail = async (
	credentials: LoginFormData,
): Promise<User> => {
	try {
		const userCredential = await signInWithEmailAndPassword(
			auth,
			credentials.email,
			credentials.password,
		);
		return userCredential.user;
	} catch (error: unknown) {
		if (error instanceof Error && "code" in error) {
			const firebaseError = error as { code: string };

			if (
				firebaseError.code === "auth/invalid-credential" ||
				firebaseError.code === "auth/user-not-found" ||
				firebaseError.code === "auth/wrong-password"
			) {
				throw new AuthError(
					"login.errors.invalidCredentials",
					firebaseError.code,
				);
			}
			if (firebaseError.code === "auth/user-disabled") {
				throw new AuthError("login.errors.userDisabled", firebaseError.code);
			}
			if (firebaseError.code === "auth/invalid-email") {
				throw new AuthError("login.errors.emailInvalid", firebaseError.code);
			}
			if (firebaseError.code === "auth/too-many-requests") {
				throw new AuthError("login.errors.tooManyRequests", firebaseError.code);
			}
			if (firebaseError.code === "auth/network-request-failed") {
				throw new AuthError("login.errors.networkError", firebaseError.code);
			}

			Logger.error("Erro no Firebase ao autenticar usuário", error);
		} else {
			Logger.error("Falha desconhecida no login", error);
		}

		throw new AuthError("login.errors.generic");
	}
};

export const loginWithGoogle = async (): Promise<User | null> => {
	try {
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({ prompt: "select_account" });

		const userCredential = await signInWithPopup(auth, provider);
		return userCredential.user;
	} catch (error: unknown) {
		if (error instanceof Error && "code" in error) {
			const firebaseError = error as { code: string };

			if (CANCELLED_CODES.has(firebaseError.code)) {
				return null;
			}

			Logger.error("Erro interno do Firebase no Google Auth", error);
		} else {
			Logger.error("Falha crítica desconhecida no login com Google", error);
		}

		throw new Error(
			"Falha ao autenticar com o Google. Verifique sua conexão e tente novamente.",
		);
	}
};

export const registerWithEmail = async (
	credentials: RegisterFormData,
): Promise<User> => {
	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			credentials.email,
			credentials.password,
		);

		await updateProfile(userCredential.user, {
			displayName: credentials.name,
		});

		return userCredential.user;
	} catch (error: unknown) {
		if (error instanceof Error && "code" in error) {
			const firebaseError = error as { code: string };

			if (firebaseError.code === "auth/email-already-in-use") {
				throw new AuthError("register.errors.emailInUse", firebaseError.code);
			}
			if (firebaseError.code === "auth/weak-password") {
				throw new AuthError("register.errors.passwordWeak", firebaseError.code);
			}
			if (firebaseError.code === "auth/invalid-email") {
				throw new AuthError("register.errors.emailInvalid", firebaseError.code);
			}
			if (firebaseError.code === "auth/too-many-requests") {
				throw new AuthError(
					"register.errors.tooManyRequests",
					firebaseError.code,
				);
			}
			if (firebaseError.code === "auth/network-request-failed") {
				throw new AuthError("register.errors.networkError", firebaseError.code);
			}

			Logger.error("Erro no Firebase ao registrar usuário", error);
		} else {
			Logger.error("Falha desconhecida no cadastro", error);
		}

		throw new AuthError("register.errors.generic");
	}
};

export const logoutUser = async (): Promise<void> => {
	try {
		await signOut(auth);
	} catch (error: unknown) {
		if (error instanceof Error) {
			Logger.error("Erro interno no Firebase ao tentar fazer signOut", error);
		} else {
			Logger.error(
				"Falha desconhecida e crítica no signOut do Firebase",
				error,
			);
		}

		throw new Error(
			"Não foi possível encerrar a sessão no momento. Verifique sua conexão.",
		);
	}
};

export const resetPassword = async (email: string): Promise<void> => {
	try {
		await apiClient.post("/auth/forgot-password", { email });
	} catch (error: unknown) {
		if (axios.isAxiosError(error)) {
			if (error.response?.status === 429) {
				throw new AuthError(
					"forgotPassword.errors.tooManyRequests",
					"auth/too-many-requests",
				);
			}

			if (!error.response) {
				throw new AuthError(
					"forgotPassword.errors.networkError",
					"auth/network-request-failed",
				);
			}

			Logger.error("Erro na API ao solicitar recuperação de senha", error);
		} else {
			Logger.error("Falha crítica na recuperação de senha", error);
		}

		throw new AuthError("forgotPassword.errors.generic");
	}
};

export const verifyResetToken = async (oobCode: string): Promise<string> => {
	try {
		return await verifyPasswordResetCode(auth, oobCode);
	} catch (error: unknown) {
		Logger.error("Código de reset inválido ou expirado", error);
		if (error instanceof Error && "code" in error) {
			const firebaseError = error as { code: string };
			throw new AuthError(
				"resetPassword.errors.invalidOrExpiredToken",
				firebaseError.code,
			);
		}
		throw new AuthError("resetPassword.errors.invalidOrExpiredToken");
	}
};

export const submitNewPassword = async (
	oobCode: string,
	newPassword: string,
): Promise<void> => {
	try {
		await confirmPasswordReset(auth, oobCode, newPassword);
	} catch (error: unknown) {
		Logger.error("Erro ao tentar redefinir a senha", error);
		if (error instanceof Error && "code" in error) {
			const firebaseError = error as { code: string };

			if (
				firebaseError.code === "auth/expired-action-code" ||
				firebaseError.code === "auth/invalid-action-code"
			) {
				throw new AuthError(
					"resetPassword.errors.expiredActionCode",
					firebaseError.code,
				);
			}
			if (firebaseError.code === "auth/weak-password") {
				throw new AuthError(
					"resetPassword.errors.passwordWeak",
					firebaseError.code,
				);
			}
			if (firebaseError.code === "auth/network-request-failed") {
				throw new AuthError(
					"resetPassword.errors.networkError",
					firebaseError.code,
				);
			}
		}

		throw new AuthError("resetPassword.errors.generic");
	}
};

export const syncUserWithBackendRequest =
	async (): Promise<SyncUserResponse> => {
		try {
			const { data } = await apiClient.post<SyncUserResponse>("/users/sync");
			return data;
		} catch (error: unknown) {
			Logger.error("Falha ao sincronizar identidade com o backend C#", error);
			throw new Error(
				"Não foi possível sincronizar o usuário com o servidor local.",
			);
		}
	};
