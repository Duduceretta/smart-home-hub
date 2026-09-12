import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/core/components/ui/button";
import { useCurrentUser } from "@/core/hooks/useCurrentUser";
import { auth } from "@/core/lib/firebase";
import { verifyEmailToken } from "../api/auth.api";
import { useAuthStore } from "../store/useAuthStore";

type VerificationStatus = "verifying" | "success" | "error";

export function VerifyEmailContent() {
	const { t } = useTranslation("auth");
	const [searchParams] = useSearchParams();
	const { user } = useCurrentUser();
	const setUser = useAuthStore((s) => s.setUser);

	const oobCode = searchParams.get("oobCode");

	const [status, setStatus] = useState<VerificationStatus>("verifying");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const verifiedRef = useRef(false);

	useEffect(() => {
		if (verifiedRef.current) return;

		if (!oobCode) {
			setStatus("error");
			setErrorMessage("verifyEmail.errors.missingToken");
			return;
		}

		verifiedRef.current = true;

		const verify = async () => {
			try {
				await verifyEmailToken(oobCode);
				if (auth.currentUser) {
					setUser(auth.currentUser);
				}
				setStatus("success");
			} catch (error: unknown) {
				setStatus("error");
				if (error instanceof Error) {
					setErrorMessage(error.message);
				} else {
					setErrorMessage("verifyEmail.errors.invalidOrExpiredToken");
				}
			}
		};

		verify();
	}, [oobCode, setUser]);

	const translateError = (errorKey?: string | null) => {
		if (!errorKey) return undefined;
		return t(errorKey, errorKey);
	};

	return (
		<div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl animate-fade-up text-center">
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			{status === "verifying" && (
				<div className="flex flex-col items-center justify-center py-6">
					<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface-container shadow-inner">
						<Loader2 className="h-7 w-7 animate-spin text-primary" />
					</div>
					<h2 className="mb-2 text-xl sm:text-2xl font-semibold text-foreground">
						{t("verifyEmail.page.verifyingTitle", "Verificando seu e-mail...")}
					</h2>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
						{t(
							"verifyEmail.page.verifyingDescription",
							"Aguarde um instante enquanto validamos a confirmação da sua conta.",
						)}
					</p>
				</div>
			)}

			{status === "success" && (
				<div className="flex flex-col items-center justify-center py-4 animate-fade-up">
					<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
						<CheckCircle2 className="h-7 w-7 text-emerald-500" />
					</div>
					<h2 className="mb-2 text-xl sm:text-2xl font-semibold text-foreground">
						{t(
							"verifyEmail.page.successTitle",
							"E-mail confirmado com sucesso!",
						)}
					</h2>
					<p className="mb-6 text-sm text-muted-foreground leading-relaxed">
						{t(
							"verifyEmail.page.successDescription",
							"Sua conta foi validada com êxito. Agora você conta com proteção total e todas as notificações ativas.",
						)}
					</p>

					<div className="w-full">
						{user ? (
							<Link to="/dashboard" className="w-full block">
								<Button
									type="button"
									className="h-11 w-full rounded-lg border border-border bg-surface-high text-sm font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest active:scale-[0.99] cursor-pointer"
								>
									{t("verifyEmail.page.goToDashboard", "Acessar Dashboard")}
								</Button>
							</Link>
						) : (
							<Link to="/login" className="w-full block">
								<Button
									type="button"
									className="h-11 w-full rounded-lg border border-border bg-surface-high text-sm font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest active:scale-[0.99] cursor-pointer"
								>
									{t("verifyEmail.page.goToLogin", "Ir para o Login")}
								</Button>
							</Link>
						)}
					</div>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col items-center justify-center py-4 animate-fade-up">
					<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
						<XCircle className="h-7 w-7 text-destructive" />
					</div>
					<h2 className="mb-2 text-xl sm:text-2xl font-semibold text-foreground">
						{t("verifyEmail.page.errorTitle", "Link inválido ou expirado")}
					</h2>
					<p className="mb-6 text-sm text-muted-foreground leading-relaxed">
						{translateError(errorMessage) ||
							t(
								"verifyEmail.page.errorDescription",
								"Este link de confirmação não é mais válido ou já foi utilizado.",
							)}
					</p>

					<div className="w-full space-y-3">
						{user ? (
							<Link to="/dashboard" className="w-full block">
								<Button
									type="button"
									className="h-11 w-full rounded-lg border border-border bg-surface-high text-sm font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest active:scale-[0.99] cursor-pointer"
								>
									{t("verifyEmail.page.goToDashboard", "Acessar Dashboard")}
								</Button>
							</Link>
						) : (
							<Link to="/login" className="w-full block">
								<Button
									type="button"
									className="h-11 w-full rounded-lg border border-border bg-surface-high text-sm font-semibold text-foreground shadow-xs transition-all hover:border-foreground/40 hover:bg-surface-highest active:scale-[0.99] cursor-pointer"
								>
									{t("verifyEmail.page.goToLogin", "Ir para o Login")}
								</Button>
							</Link>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
