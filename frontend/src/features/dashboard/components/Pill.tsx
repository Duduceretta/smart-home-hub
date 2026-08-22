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
			className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
				active
					? "bg-[#c5c6cf]/20 border-[#c5c6cf]/50 text-[#e5e2e2]"
					: "bg-[#201f20] border-[#46464b]/20 text-[#c7c6cb] hover:bg-[#2a2a2a] hover:text-[#e5e2e2]"
			} ${className}`}
		>
			{children}
		</button>
	);
};
