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
			className={`shrink-0 inline-flex h-8 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors cursor-pointer ${
				active
					? "bg-primary/20 border-primary/50 text-foreground"
					: "bg-surface-container border-border-subtle text-muted-foreground hover:bg-surface-high hover:text-foreground"
			} ${className}`}
		>
			{children}
		</button>
	);
};
