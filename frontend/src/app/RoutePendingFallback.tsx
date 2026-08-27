import { Loader2 } from "lucide-react";

/**
 * Suspense fallback shown while a lazy-loaded route chunk downloads.
 * Route-level code splitting means this can appear briefly on navigation
 * (chunk not yet cached) — kept minimal and un-branded on purpose so it
 * doesn't fight for attention with the real page it's about to reveal.
 *
 * No background of its own: it renders inside AppLayout's content slot,
 * which already paints its own gradient (`from-muted to-background`). A
 * solid hardcoded fill here didn't match that gradient's lighter top tone,
 * showing up as a visible seam/margin around the fallback box.
 *
 * `min-h-[calc(100vh-4rem)]` (4rem = Header's h-16) instead of `h-screen`:
 * its direct parent has no fixed height on most routes (grows with content),
 * so `h-full` would collapse to 0 here — this calc guarantees it still
 * covers the whole visible content area without depending on that.
 */
export function RoutePendingFallback() {
	return (
		<div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center">
			<Loader2 className="h-6 w-6 animate-spin text-primary" />
		</div>
	);
}
