import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { useAuthListener } from "@/features/auth/hooks/useAuthListener";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { Router } from "./Router";

export function App() {
	useAuthListener();

	const isLoading = useAuthStore((state) => state.isLoading);

	if (isLoading) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-zinc-950">
				<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
			</div>
		);
	}

	return (
		<>
			<Router />
			<Toaster theme="dark" position="bottom-right" richColors />
		</>
	);
}
