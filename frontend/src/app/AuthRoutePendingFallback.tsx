import { Loader2 } from "lucide-react";

/**
 * Suspense fallback for auth pages (Login/Register/ForgotPassword/etc),
 * nested inside AuthLayout's own centered outlet slot.
 *
 * Not RoutePendingFallback: that one hardcodes
 * `min-h-[calc(100vh-4rem)]` to fit AppLayout's Header (h-16). Reused here,
 * on a cold load it forced ~1016px of height inside AuthLayout (which has
 * no such header), momentarily overflowing the viewport and triggering a
 * vertical scrollbar that vanished again once the real (shorter) form
 * replaced it — the classic scrollbar-appear/disappear horizontal CLS.
 * This one has no height opinion of its own; AuthLayout's
 * `flex-1 items-center justify-center` wrapper already sizes it.
 */
export function AuthRoutePendingFallback() {
	return (
		<div className="flex w-full items-center justify-center py-10">
			<Loader2 className="h-6 w-6 animate-spin text-primary" />
		</div>
	);
}
