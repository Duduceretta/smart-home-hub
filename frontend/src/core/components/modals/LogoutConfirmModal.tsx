import { AlertTriangle, Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

interface LogoutConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	isLoading?: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	isLoading = false,
}) => {
	const { t } = useTranslation(["auth", "common"]);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Controle da tecla Escape e travamento do scroll
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isLoading) onClose();
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "";
		};
	}, [isOpen, isLoading, onClose]);

	if (!isOpen || !mounted) return null;

	return createPortal(
		<div className="fixed inset-0 z-10000 flex items-center justify-center p-4 animate-fade-in">
			{/* Backdrop escuro translúcido com clique fora para fechar */}
			<button
				type="button"
				disabled={isLoading}
				onClick={onClose}
				aria-label={t("logout.closeAriaLabel")}
				className="absolute inset-0 h-full w-full cursor-default border-none bg-black/60 backdrop-blur-sm"
			/>

			{/* Card do Modal Centralizado */}
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="logout-modal-title"
				aria-describedby="logout-modal-desc"
				className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-[#27272a] bg-[#09090b] p-6 shadow-2xl animate-fade-up"
			>
				{/* Linha brilhante superior (Vermelha/Alerta sutil) */}
				<div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-transparent via-red-500/50 to-transparent pointer-events-none" />

				{/* Ícone e Cabeçalho */}
				<div className="flex flex-col items-center text-center space-y-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
						<LogOut className="h-5 w-5 translate-x-0.5" />
					</div>

					<div className="space-y-1">
						<h3
							id="logout-modal-title"
							className="text-base font-bold text-white tracking-tight"
						>
							{t("logout.confirmTitle")}
						</h3>
						<p
							id="logout-modal-desc"
							className="text-xs text-[#a1a1aa] leading-relaxed"
						>
							{t("logout.confirmDescription")}
						</p>
					</div>
				</div>

				{/* Ações / Botões */}
				<div className="mt-6 grid grid-cols-2 gap-3">
					<button
						type="button"
						disabled={isLoading}
						onClick={onClose}
						className="w-full rounded-lg border border-[#27272a] bg-transparent py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:bg-[#27272a] hover:text-white disabled:opacity-50 cursor-pointer"
					>
						{t("common:actions.cancel")}
					</button>

					<button
						type="button"
						disabled={isLoading}
						onClick={onConfirm}
						className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600/90 py-2 text-xs font-medium text-white transition-all hover:bg-red-600 shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<AlertTriangle className="h-3.5 w-3.5" />
						)}
						<span>{t("logout.confirmYes")}</span>
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};
