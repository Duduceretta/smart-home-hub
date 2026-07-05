import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SheetLayoutProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const SheetLayout: React.FC<SheetLayoutProps> = ({
	isOpen,
	onClose,
	title,
	description,
	children,
	footer,
	onSubmit,
}) => {
	const [mounted, setMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [isClosing, setIsClosing] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Controle de entrada e saída suave com delay para remoção do DOM
	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
			setIsClosing(false);
		} else if (isVisible) {
			setIsClosing(true);
			const timer = setTimeout(() => {
				setIsVisible(false);
				setIsClosing(false);
			}, 300); // Tempo exato da animação animate-sheet-out (0.3s)
			return () => clearTimeout(timer);
		}
	}, [isOpen, isVisible]);

	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isClosing) onClose();
		};

		document.addEventListener("keydown", handleKeyDown);
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "";
		};
	}, [isOpen, isClosing, onClose]);

	if (!isVisible || !mounted) return null;

	return createPortal(
		<div
			className={`fixed inset-0 z-9999 flex justify-end bg-black/40 backdrop-blur-sm ${
				isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
			}`}
		>
			{/* Backdrop com clique para fechar */}
			<button
				type="button"
				onClick={onClose}
				aria-label="Fechar painel"
				className="absolute inset-0 h-full w-full cursor-default border-none"
			/>

			{/* Painel lateral deslizando da direita (Sheet) */}
			<div
				role="dialog"
				aria-modal="true"
				className={`relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#27272a] bg-[#09090b] shadow-2xl ${
					isClosing ? "animate-sheet-out" : "animate-sheet-in"
				}`}
			>
				{/* Linha brilhante superior com efeito shimmer (Aproveitando o seu CSS!) */}
				<div className="absolute left-0 top-0 h-1 w-full shimmer-line pointer-events-none" />

				<form
					noValidate
					onSubmit={onSubmit}
					className="flex h-full flex-col justify-between overflow-hidden"
				>
					{/* Cabeçalho */}
					<div className="flex shrink-0 items-start justify-between border-b border-[#27272a] p-6">
						<div>
							<h2 className="text-lg font-bold tracking-tight text-white">
								{title}
							</h2>
							{description && (
								<p className="mt-1 text-sm text-[#a1a1aa]">{description}</p>
							)}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-md p-1 text-[#a1a1aa] transition-colors hover:bg-[#27272a] hover:text-white cursor-pointer"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					{/* Corpo do Formulário */}
					<div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>

					{/* Rodapé fixo na base */}
					{footer && (
						<div className="flex shrink-0 justify-end gap-3 border-t border-[#27272a] bg-[#09090b] p-6">
							{footer}
						</div>
					)}
				</form>
			</div>
		</div>,
		document.body,
	);
};
