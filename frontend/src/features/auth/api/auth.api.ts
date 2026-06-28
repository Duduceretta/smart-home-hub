import { signInWithEmailAndPassword, type User } from "firebase/auth";
import { auth } from "@/core/lib/firebase";
import type { LoginFormData } from "../types/loginSchema";

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
