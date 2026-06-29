import { AnimatePresence, motion } from "framer-motion";

interface FormGlobalErrorProps {
	error?: string;
}

export function FormGlobalError({ error }: FormGlobalErrorProps) {
	return (
		<AnimatePresence>
			{error && (
				<motion.div
					initial={{ opacity: 0, height: 0, marginTop: 0 }}
					animate={{ opacity: 1, height: "auto", marginTop: 16 }}
					exit={{ opacity: 0, height: 0, marginTop: 0 }}
					transition={{ duration: 0.25, ease: "easeInOut" }}
					className="overflow-hidden"
				>
					<div className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-3">
						<p className="text-sm font-medium text-red-400">{error}</p>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
