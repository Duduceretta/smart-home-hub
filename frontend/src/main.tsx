import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App.tsx";
import { queryClient } from "./core/lib/react-query.ts";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Elemento 'root' não foi encontrado no documento HTML.");
}

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</StrictMode>,
);
