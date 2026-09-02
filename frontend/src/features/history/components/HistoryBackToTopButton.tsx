import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { scrollToTop } from "../hooks/useEventStream";

interface HistoryBackToTopButtonProps {
	containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Floating button that smoothly scrolls the History page back to top when the user scrolls down.
 */
export function HistoryBackToTopButton({
	containerRef,
}: HistoryBackToTopButtonProps) {
	const { t } = useTranslation("history");
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const scrollContainer = containerRef?.current?.closest(
			".overflow-y-auto",
		) as HTMLElement | null;

		const handleScroll = () => {
			const containerTop = scrollContainer ? scrollContainer.scrollTop : 0;
			const windowTop = typeof window !== "undefined" ? window.scrollY : 0;
			setIsVisible(containerTop > 280 || windowTop > 280);
		};

		if (scrollContainer) {
			scrollContainer.addEventListener("scroll", handleScroll, {
				passive: true,
			});
		}
		window.addEventListener("scroll", handleScroll, { passive: true });

		// Initial check
		handleScroll();

		return () => {
			if (scrollContainer) {
				scrollContainer.removeEventListener("scroll", handleScroll);
			}
			window.removeEventListener("scroll", handleScroll);
		};
	}, [containerRef]);

	return (
		<button
			type="button"
			onClick={() => scrollToTop(containerRef?.current)}
			aria-label={t("actions.backToTop", "Voltar ao topo")}
			className={cn(
				"fixed bottom-20 right-4 z-40 md:bottom-8 md:right-8 flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-border bg-card/90 text-primary shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-surface-highest hover:scale-105 active:scale-95 cursor-pointer",
				isVisible
					? "opacity-100 translate-y-0 pointer-events-auto"
					: "opacity-0 translate-y-4 pointer-events-none",
			)}
		>
			<ArrowUp className="h-4 w-4 text-primary" />
		</button>
	);
}
