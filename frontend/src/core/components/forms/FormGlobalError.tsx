import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../utils";

interface FormGlobalErrorProps {
	error?: string;
	className?: string;
}

export function FormGlobalError({ error, className }: FormGlobalErrorProps) {
	return (
		<AnimatePresence>
			{error && (
				<motion.div
					initial={{ opacity: 0, height: 0, marginBottom: 0 }}
					animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
					exit={{ opacity: 0, height: 0, marginBottom: 0 }}
					transition={{ duration: 0.2, ease: "easeOut" }}
					className={cn("overflow-hidden w-full", className)}
				>
					<div
						role="alert"
						aria-live="assertive"
						className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 shadow-sm"
					>
						<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
						<p className="text-xs font-medium text-destructive leading-relaxed min-w-0 wrap-break-word">
							{error}
						</p>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
