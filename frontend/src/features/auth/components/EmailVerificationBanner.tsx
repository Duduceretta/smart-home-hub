import { Loader2, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { useCurrentUser } from "@/core/hooks/useCurrentUser";
import { Logger } from "@/core/logger/app.logger";
import { sendVerificationEmail } from "../api/auth.api";

const COOLDOWN_KEY = "email_verification_cooldown_until";
const DISMISS_KEY = "dismissed_email_verification_banner";
const COOLDOWN_SECONDS = 60;

export function EmailVerificationBanner() {
	const { t } = useTranslation("auth");
	const { user } = useCurrentUser();

	const [isDismissed, setIsDismissed] = useState<boolean>(() => {
		try {
			return sessionStorage.getItem(DISMISS_KEY) === "true";
		} catch {
			return false;
		}
	});

	const [cooldown, setCooldown] = useState<number>(() => {
		try {
			const stored = sessionStorage.getItem(COOLDOWN_KEY);
			if (stored) {
				const diff = Math.ceil((Number(stored) - Date.now()) / 1000);
				return diff > 0 ? diff : 0;
			}
		} catch {
			// ignore storage errors
		}
		return 0;
	});

	const [isSending, setIsSending] = useState(false);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timer = setInterval(() => {
			setCooldown((prev) => {
				if (prev <= 1) {
					try {
						sessionStorage.removeItem(COOLDOWN_KEY);
					} catch {
						// ignore
					}
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [cooldown]);

	// Se não houver usuário logado, se já estiver verificado ou se foi dispensado na sessão, não exibe
	if (!user || user.emailVerified || isDismissed) {
		return null;
	}

	const handleDismiss = () => {
		setIsDismissed(true);
		try {
			sessionStorage.setItem(DISMISS_KEY, "true");
		} catch {
			// ignore storage errors
		}
	};

	const handleResend = async () => {
		if (cooldown > 0 || isSending || !user.email) return;

		setIsSending(true);
		try {
			await sendVerificationEmail(user.email);
			const cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;
			try {
				sessionStorage.setItem(COOLDOWN_KEY, cooldownUntil.toString());
			} catch {
				// ignore
			}
			setCooldown(COOLDOWN_SECONDS);
			toast.success(
				t(
					"verifyEmail.banner.emailSent",
					"E-mail de confirmação reenviado com sucesso! Verifique sua caixa de entrada.",
				),
			);
		} catch (error: unknown) {
			Logger.error("Falha ao reenviar e-mail de confirmação", error);
			const message =
				error instanceof Error
					? t(error.message, error.message)
					: t(
							"verifyEmail.errors.generic",
							"Não foi possível reenviar o e-mail de verificação.",
						);
			toast.error(message);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div
			role="status"
			aria-live="polite"
			className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-border-subtle bg-surface-container p-4 shadow-sm transition-all"
		>
			<div className="flex items-start gap-3 min-w-0">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-high text-primary">
					<Mail className="h-4.5 w-4.5" />
				</div>
				<div className="flex flex-col gap-0.5 min-w-0">
					<p className="text-sm font-medium text-foreground">
						{t("verifyEmail.banner.title", "Confirme seu endereço de e-mail")}
					</p>
					<p className="text-xs text-muted-foreground leading-relaxed text-pretty">
						{t(
							"verifyEmail.banner.description",
							"Enviamos um link de confirmação para {{email}}. Confirme sua conta para garantir segurança e acesso total às notificações.",
							{ email: user.email },
						)}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 self-end sm:self-center shrink-0">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleResend}
					disabled={cooldown > 0 || isSending}
					className="h-8 px-3 text-xs font-medium cursor-pointer"
				>
					{isSending ? (
						<>
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
							{t("verifyEmail.banner.sending", "Enviando...")}
						</>
					) : cooldown > 0 ? (
						t("verifyEmail.banner.cooldown", "Reenviar em {{seconds}}s", {
							seconds: cooldown,
						})
					) : (
						t("verifyEmail.banner.resendButton", "Reenviar e-mail")
					)}
				</Button>

				<button
					type="button"
					onClick={handleDismiss}
					aria-label={t(
						"verifyEmail.banner.dismissAria",
						"Fechar aviso de confirmação de e-mail",
					)}
					className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
