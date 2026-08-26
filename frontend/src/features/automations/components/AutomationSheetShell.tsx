import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AutomationSheetShellProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Sheet lateral local à feature automations — estruturalmente idêntico ao
 * core/components/layouts/SheetLayout.tsx (portal, backdrop, slide-in,
 * Escape, scroll-lock), mas na paleta nova do dashboard (surface-container/
 * border-subtle/foreground) em vez do zinc/preto hardcoded do original.
 * Não editamos o SheetLayout compartilhado para não quebrar rooms/device-
 * groups, que ainda não migraram (retrofit fica pra depois, ver CLAUDE.md).
 */
export const AutomationSheetShell: React.FC<AutomationSheetShellProps> = ({
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

	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
			setIsClosing(false);
		} else if (isVisible) {
			setIsClosing(true);
			const timer = setTimeout(() => {
				setIsVisible(false);
				setIsClosing(false);
			}, 300);
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
			<button
				type="button"
				onClick={onClose}
				aria-label="Fechar painel"
				className="absolute inset-0 h-full w-full cursor-default border-none"
			/>

			<div
				role="dialog"
				aria-modal="true"
				className={`relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border-subtle/40 bg-surface-container shadow-2xl ${
					isClosing ? "animate-sheet-out" : "animate-sheet-in"
				}`}
			>
				<div className="absolute left-0 top-0 h-1 w-full shimmer-line pointer-events-none" />

				<form
					noValidate
					onSubmit={onSubmit}
					className="flex h-full flex-col justify-between overflow-hidden"
				>
					<div className="flex shrink-0 items-start justify-between border-b border-border-subtle/20 p-6">
						<div>
							<h2 className="text-lg font-bold tracking-tight text-foreground">
								{title}
							</h2>
							{description && (
								<p className="mt-1 text-sm text-muted-foreground">
									{description}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>

					{footer && (
						<div className="flex shrink-0 justify-end gap-3 border-t border-border-subtle/20 bg-surface-container p-6">
							{footer}
						</div>
					)}
				</form>
			</div>
		</div>,
		document.body,
	);
};
