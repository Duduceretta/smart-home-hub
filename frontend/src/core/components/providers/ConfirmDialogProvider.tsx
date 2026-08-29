import { AlertTriangle, Info, type LucideIcon } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/core/utils";

export interface ConfirmOptions {
	title: string;
	/** String na maioria dos casos — aceita ReactNode pra descrições com
	 * trecho em destaque (`<Trans>` com um nome em negrito, por exemplo). */
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
	icon?: LucideIcon;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
	resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [pending, setPending] = useState<PendingConfirm | null>(null);

	const confirm = useCallback<ConfirmFn>((options) => {
		return new Promise<boolean>((resolve) => {
			setPending({ ...options, resolve });
		});
	}, []);

	const settle = (value: boolean) => {
		pending?.resolve(value);
		setPending(null);
	};

	const isDestructive = pending?.variant === "destructive";
	const Icon = pending?.icon ?? (isDestructive ? AlertTriangle : Info);

	return (
		<ConfirmDialogContext.Provider value={confirm}>
			{children}

			<AlertDialogPrimitive.Root
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open) settle(false);
				}}
			>
				<AlertDialogPrimitive.Portal>
					{/* Container Fullscreen com centralização Flex */}
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
						{/* Backdrop com Blur */}
						<AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" />

						{/* Card do Modal com proporção equilibrada (max-w-[370px]) */}
						<AlertDialogPrimitive.Content className="relative z-10 w-full max-w-92.5 overflow-hidden rounded-xl border border-border-subtle bg-surface-container text-foreground shadow-2xl animate-fade-up outline-none">
							{/* Linha de brilho superior */}
							<div
								className={cn(
									"pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-transparent to-transparent",
									isDestructive ? "via-destructive/70" : "via-primary/50",
								)}
							/>

							{/* Corpo Principal com maior respiro vertical */}
							<div className="flex flex-col gap-3 p-5 pb-5">
								<div className="flex items-center gap-2.5">
									<span
										className={cn(
											"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-xs transition-colors",
											isDestructive
												? "border-destructive/30 bg-destructive/10 text-destructive"
												: "border-border bg-surface-high text-foreground",
										)}
									>
										<Icon className="h-4 w-4" />
									</span>

									<AlertDialogPrimitive.Title className="text-sm font-semibold tracking-tight text-foreground">
										{pending?.title}
									</AlertDialogPrimitive.Title>
								</div>

								{pending?.description && (
									<AlertDialogPrimitive.Description className="text-xs leading-relaxed text-muted-foreground">
										{pending.description}
									</AlertDialogPrimitive.Description>
								)}
							</div>

							{/* Rodapé dos botões */}
							<div className="flex items-center justify-end gap-2 border-t border-border-subtle/60 bg-surface-low/50 px-4.5 py-3">
								<AlertDialogPrimitive.Cancel
									onClick={() => settle(false)}
									className="h-8 rounded-lg border border-border-subtle bg-surface-container px-3 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-surface-high hover:text-foreground cursor-pointer shadow-xs"
								>
									{pending?.cancelLabel ?? "Cancelar"}
								</AlertDialogPrimitive.Cancel>

								<AlertDialogPrimitive.Action
									onClick={() => settle(true)}
									className={cn(
										"inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all cursor-pointer shadow-xs",
										isDestructive
											? "border border-destructive/40 bg-destructive/15 text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
											: "border border-border bg-surface-high text-foreground hover:border-foreground/40 hover:bg-surface-highest",
									)}
								>
									<Icon className="h-3.5 w-3.5" />
									{pending?.confirmLabel ?? "Confirmar"}
								</AlertDialogPrimitive.Action>
							</div>
						</AlertDialogPrimitive.Content>
					</div>
				</AlertDialogPrimitive.Portal>
			</AlertDialogPrimitive.Root>
		</ConfirmDialogContext.Provider>
	);
}

export function useConfirm(): ConfirmFn {
	const context = useContext(ConfirmDialogContext);
	if (!context) {
		throw new Error(
			"useConfirm precisa estar dentro de ConfirmDialogProvider.",
		);
	}
	return context;
}
