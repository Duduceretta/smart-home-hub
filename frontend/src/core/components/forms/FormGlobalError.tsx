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
					initial={{ opacity: 0, height: 0, marginTop: 0 }}
					animate={{ opacity: 1, height: "auto", marginTop: 16 }}
					exit={{ opacity: 0, height: 0, marginTop: 0 }}
					transition={{ duration: 0.25, ease: "easeInOut" }}
					className={cn("overflow-hidden", className)}
				>
					<div
						role="alert"
						aria-live="assertive"
						className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3"
					>
						<AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
						<p className="text-sm font-medium text-red-400">{error}</p>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
