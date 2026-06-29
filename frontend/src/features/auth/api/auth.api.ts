import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	type User,
	updateProfile,
} from "firebase/auth";
import { auth } from "@/core/lib/firebase";
import { Logger } from "@/core/lib/logger";
import type { LoginFormData } from "@/features/auth/types/loginSchema";
import type { RegisterFormData } from "@/features/auth/types/registerSchema";

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
				firebaseError.code === "auth/user-not-found"
			) {
				throw new Error("E-mail ou senha incorretos.");
			}
			if (firebaseError.code === "auth/too-many-requests") {
				throw new Error(
					"Muitas tentativas falhas. Tente novamente mais tarde.",
				);
			}
		}

		throw new Error("Erro ao autenticar. Verifique sua conexão.");
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
				throw new Error("Este e-mail já está cadastrado no sistema.");
			}
			if (firebaseError.code === "auth/weak-password") {
				throw new Error("A senha fornecida é muito fraca.");
			}
		}

		throw new Error("Erro ao criar a conta. Verifique sua conexão.");
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
