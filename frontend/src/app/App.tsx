import { Toaster } from "sonner";
import { useAuthListener } from "@/features/auth/hooks/useAuthListener";
import { useRealtimeListener } from "./hooks/useRealtimeListener";
import { Router } from "./Router";

export function App() {
	useAuthListener();
	useRealtimeListener();

	return (
		<>
			<Router />
			<Toaster theme="dark" position="bottom-right" richColors />
		</>
	);
}
