import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface DeleteDeviceModalProps {
	isOpen: boolean;
	deviceName: string;
	onClose: () => void;
	onConfirm: () => void;
	isLoading?: boolean;
}

export const DeleteDeviceModal: React.FC<DeleteDeviceModalProps> = ({
	isOpen,
	deviceName,
	onClose,
	onConfirm,
	isLoading = false,
}) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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
			<button
				type="button"
				disabled={isLoading}
				onClick={onClose}
				className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm cursor-default border-none"
			/>

			<div
				role="alertdialog"
				aria-modal="true"
				className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-[#27272a] bg-[#09090b] p-6 shadow-2xl animate-fade-up"
			>
				<div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-transparent via-red-500/50 to-transparent pointer-events-none" />

				<div className="flex flex-col items-center text-center space-y-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
						<Trash2 className="h-5 w-5" />
					</div>

					<div className="space-y-1 w-full">
						<h3 className="text-base font-bold text-white tracking-tight">
							Excluir dispositivo?
						</h3>
						<p className="text-xs text-[#a1a1aa] leading-relaxed">
							Tem certeza que deseja remover{" "}
							<span className="text-red-400 font-semibold">"{deviceName}"</span>
							? Esta ação não poderá ser desfeita.
						</p>
					</div>
				</div>

				<div className="mt-6 grid grid-cols-2 gap-3">
					<button
						type="button"
						disabled={isLoading}
						onClick={onClose}
						className="w-full rounded-lg border border-[#27272a] bg-transparent py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:bg-[#27272a] disabled:opacity-50 cursor-pointer"
					>
						Cancelar
					</button>

					<button
						type="button"
						disabled={isLoading}
						onClick={onConfirm}
						className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-xs font-medium text-white transition-all hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Trash2 className="h-3.5 w-3.5" />
						)}
						<span>Excluir</span>
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
};
