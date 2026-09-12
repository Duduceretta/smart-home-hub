import type { SVGProps } from "react";
import { cn } from "@/core/utils";

export interface NexusHubMonogramProps extends SVGProps<SVGSVGElement> {
	variant?: "bare" | "tile";
}

const PATH_N =
	"M 74.0 710.0 V 0.0 H 241.6 L 524.2 489.6 V 0.0 H 676.2 V 710.0 H 506.2 L 226.0 237.2 V 710.0 Z";

const PATH_H =
	"M 74.0 710.0 V 0.0 H 226.0 V 336.6 L 158.6 288.8 H 562.8 L 495.4 336.6 V 0.0 H 647.4 V 710.0 H 495.4 V 369.4 L 562.8 416.6 H 158.6 L 226.0 369.4 V 710.0 Z";

export function NexusHubMonogram({
	variant = "bare",
	className,
	...props
}: NexusHubMonogramProps) {
	if (variant === "tile") {
		return (
			<svg
				viewBox="0 0 32 32"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className={cn("shrink-0", className)}
				role="img"
				aria-label="Nexus Hub"
				{...props}
			>
				<rect
					width="32"
					height="32"
					rx="7.5"
					className="fill-card stroke-border-subtle"
					strokeWidth="0.8"
				/>
				<g transform="translate(2.1, 7.7) scale(0.0232)">
					<path
						d={PATH_N}
						transform="translate(-74, 0)"
						fill="var(--brand-accent)"
					/>
					<path
						d={PATH_H}
						transform="translate(618.2, 0)"
						fill="var(--brand-muted)"
					/>
				</g>
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 1356 710"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("shrink-0", className)}
			role="img"
			aria-label="Nexus Hub"
			{...props}
		>
			<path
				d={PATH_N}
				transform="translate(-74, 0)"
				fill="var(--brand-accent)"
			/>
			<path
				d={PATH_H}
				transform="translate(708.2, 0)"
				fill="var(--brand-muted)"
			/>
		</svg>
	);
}
