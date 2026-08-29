import { Toaster } from "sonner";
import { ConfirmDialogProvider } from "@/core/components/providers/ConfirmDialogProvider";
import { useAuthListener } from "@/features/auth/hooks/useAuthListener";
import { useRealtimeListener } from "./hooks/useRealtimeListener";
import { Router } from "./Router";

export function App() {
	useAuthListener();
	useRealtimeListener();

	return (
		<ConfirmDialogProvider>
			<Router />
			<Toaster theme="dark" position="bottom-right" richColors />
		</ConfirmDialogProvider>
	);
}
