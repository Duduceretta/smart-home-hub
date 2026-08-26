import { Loader2 } from "lucide-react";

/**
 * Suspense fallback shown while a lazy-loaded route chunk downloads.
 * Route-level code splitting means this can appear briefly on navigation
 * (chunk not yet cached) — kept minimal and un-branded on purpose so it
 * doesn't fight for attention with the real page it's about to reveal.
 */
export function RoutePendingFallback() {
	return (
		<div className="flex h-screen w-full items-center justify-center bg-[#141314]">
			<Loader2 className="h-6 w-6 animate-spin text-[#c5c6cf]" />
		</div>
	);
}
