import { cn } from "@/core/utils";

interface PillProps {
	active?: boolean;
	onClick?: () => void;
	children: React.ReactNode;
	className?: string;
}

export const Pill: React.FC<PillProps> = ({
	active = false,
	onClick,
	children,
	className = "",
}) => {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-medium tracking-wide transition-all cursor-pointer shadow-xs",
				active
					? "border-primary/40 bg-primary/10 text-foreground shadow-inner"
					: "border-border-subtle bg-surface-container text-muted-foreground hover:border-border hover:bg-surface-high hover:text-foreground",
				className,
			)}
		>
			{children}
		</button>
	);
};
