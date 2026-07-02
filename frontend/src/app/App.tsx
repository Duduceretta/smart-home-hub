import { Toaster } from "sonner";
import { useAuthListener } from "@/features/auth/hooks/useAuthListener";
import { Router } from "./Router";

export function App() {
	useAuthListener();

	return (
		<>
			<Router />
			<Toaster theme="dark" position="bottom-right" richColors />
		</>
	);
}
