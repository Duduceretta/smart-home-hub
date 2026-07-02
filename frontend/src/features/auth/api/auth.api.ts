import {
	confirmPasswordReset,
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
	type User,
	updateProfile,
	verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/core/lib/firebase";
import { Logger } from "@/core/logger/app.logger";
import type {
	LoginFormData,
	RegisterFormData,
} from "@/features/auth/types/auth.schemas";

const CANCELLED_CODES = new Set([
	"auth/popup-closed-by-user",
	"auth/cancelled-popup-request",
]);

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

export const resetPassword = async (email: string): Promise<void> => {
	try {
		await sendPasswordResetEmail(auth, email);
	} catch (error: unknown) {
		if (error instanceof Error && "code" in error) {
			Logger.error("Erro no Firebase ao solicitar recuperação de senha", error);
		} else {
			Logger.error("Falha crítica desconhecida na recuperação de senha", error);
		}

		throw new Error(
			"Não foi possível processar a solicitação. Tente novamente mais tarde.",
		);
	}
};

export const verifyResetToken = async (oobCode: string): Promise<string> => {
	try {
		return await verifyPasswordResetCode(auth, oobCode);
	} catch (error: unknown) {
		Logger.error("Código de reset inválido ou expirado", error);
		throw new Error(
			"O link de recuperação é inválido ou já expirou. Solicite um novo.",
		);
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
		throw new Error(
			"Não foi possível redefinir a senha. O link pode ter expirado.",
		);
	}
};
