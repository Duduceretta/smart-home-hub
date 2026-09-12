import type { SVGProps } from "react";
import { cn } from "@/core/utils";

export interface NexusHubWordmarkProps extends SVGProps<SVGSVGElement> {
	accentColor?: string;
	textColor?: string;
}

const PATH_N =
	"M 74.0 710.0 V 0.0 H 241.6 L 524.2 489.6 V 0.0 H 676.2 V 710.0 H 506.2 L 226.0 237.2 V 710.0 Z";
const PATH_E =
	"M 293.8 722.0 Q 216.4 722.0 159.8 687.8 Q 103.2 653.6 72.4 590.9 Q 41.6 528.2 41.6 444.0 Q 41.6 359.8 72.4 297.6 Q 103.2 235.4 159.0 200.7 Q 214.8 166.0 290.6 166.0 Q 363.2 166.0 418.3 199.3 Q 473.4 232.6 503.8 295.6 Q 534.2 358.6 534.2 448.0 V 474.8 H 152.0 Q 156.4 552.6 193.9 591.7 Q 231.4 630.8 294.6 630.8 Q 342.0 630.8 372.9 609.0 Q 403.8 587.2 416.0 549.6 L 526.4 557.2 Q 505.2 631.4 443.6 676.7 Q 382.0 722.0 293.8 722.0 Z M 152.0 394.8 H 421.8 Q 416.8 323.8 381.2 290.1 Q 345.6 256.4 290.6 256.4 Q 234.4 256.4 197.9 291.6 Q 161.4 326.8 152.0 394.8 Z";
const PATH_U =
	"M 250.0 722.0 Q 169.8 722.0 122.5 668.5 Q 75.2 615.0 75.2 520.4 V 178.0 H 181.2 V 493.2 Q 181.2 565.2 206.0 599.1 Q 230.8 633.0 282.4 633.0 Q 339.8 633.0 372.2 595.5 Q 404.6 558.0 404.6 489.6 V 178.0 H 510.6 V 710.0 H 411.8 L 410.4 571.2 L 425.2 577.2 Q 410.8 647.4 365.8 684.7 Q 320.8 722.0 250.0 722.0 Z";
const PATH_S =
	"M 280.2 722.0 Q 202.8 722.0 151.3 698.9 Q 99.8 675.8 72.7 635.2 Q 45.6 594.6 41.6 542.4 L 151.0 536.6 Q 158.6 581.4 187.7 607.3 Q 216.8 633.2 280.4 633.2 Q 329.8 633.2 356.5 617.1 Q 383.2 601.0 383.2 566.0 Q 383.2 546.4 374.2 533.4 Q 365.2 520.4 338.9 510.6 Q 312.6 500.8 261.8 491.6 Q 184.4 477.4 140.5 456.6 Q 96.6 435.8 78.8 405.3 Q 61.0 374.8 61.0 331.2 Q 61.0 258.2 116.0 212.1 Q 171.0 166.0 274.6 166.0 Q 348.2 166.0 395.1 190.4 Q 442.0 214.8 466.2 254.7 Q 490.4 294.6 495.0 340.8 L 386.2 346.8 Q 384.6 321.8 372.5 300.8 Q 360.4 279.8 336.4 267.3 Q 312.4 254.8 272.6 254.8 Q 221.4 254.8 196.3 274.9 Q 171.2 295.0 171.2 326.8 Q 171.2 350.6 181.1 365.8 Q 191.0 381.0 215.8 390.6 Q 240.6 400.2 283.4 407.4 Q 363.6 420.0 409.6 440.4 Q 455.6 460.8 474.5 491.3 Q 493.4 521.8 493.4 565.2 Q 493.4 640.0 434.5 681.0 Q 375.6 722.0 280.2 722.0 Z";
const PATH_H =
	"M 74.0 710.0 V 0.0 H 226.0 V 336.6 L 158.6 288.8 H 562.8 L 495.4 336.6 V 0.0 H 647.4 V 710.0 H 495.4 V 369.4 L 562.8 416.6 H 158.6 L 226.0 369.4 V 710.0 Z";
const PATH_B =
	"M 340.0 722.0 Q 284.6 722.0 242.2 697.7 Q 199.8 673.4 176.8 630.4 L 173.8 710.0 H 75.2 V 0.0 H 181.2 V 252.8 Q 201.8 218.2 243.4 192.1 Q 285.0 166.0 340.0 166.0 Q 409.4 166.0 460.1 200.2 Q 510.8 234.4 538.6 296.7 Q 566.4 359.0 566.4 444.0 Q 566.4 529.0 538.6 591.3 Q 510.8 653.6 460.1 687.8 Q 409.4 722.0 340.0 722.0 Z M 322.8 630.2 Q 384.0 630.2 420.1 580.4 Q 456.2 530.6 456.2 444.0 Q 456.2 356.6 420.3 307.2 Q 384.4 257.8 324.4 257.8 Q 279.4 257.8 247.2 279.9 Q 215.0 302.0 198.1 343.6 Q 181.2 385.2 181.2 444.0 Q 181.2 501.0 198.1 543.0 Q 215.0 585.0 246.8 607.6 Q 278.6 630.2 322.8 630.2 Z";

export function NexusHubWordmark({
	className,
	accentColor,
	textColor,
	...props
}: NexusHubWordmarkProps) {
	const brandAccent = accentColor ?? "var(--brand-accent)";
	const textFill = textColor ?? "currentColor";

	return (
		<svg
			viewBox="0 0 4754 730"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("shrink-0", className)}
			role="img"
			aria-label="Nexus Hub"
			{...props}
		>
			{/* N (Geist Bold - Brand Accent) */}
			<path d={PATH_N} transform="translate(-74, 0)" fill={brandAccent} />

			{/* e (Geist Medium - Text Color) */}
			<path d={PATH_E} transform="translate(693.4, 0)" fill={textFill} />

			{/* x (Signature Network Mesh Icon - Brand Accent with Floating Corner Gaps) */}
			<g>
				<line
					x1="1440.6"
					y1="274.5"
					x2="1659.4"
					y2="544.5"
					stroke={brandAccent}
					strokeWidth="52"
					strokeLinecap="round"
				/>
				<line
					x1="1659.4"
					y1="274.5"
					x2="1440.6"
					y2="544.5"
					stroke={brandAccent}
					strokeWidth="52"
					strokeLinecap="round"
				/>
				{/* 4 Floating Terminal Nodes */}
				<circle cx="1360" cy="175" r="66" fill={brandAccent} />
				<circle cx="1740" cy="175" r="66" fill={brandAccent} />
				<circle cx="1360" cy="644" r="66" fill={brandAccent} />
				<circle cx="1740" cy="644" r="66" fill={brandAccent} />
				{/* Central Router Node */}
				<circle cx="1550" cy="409.5" r="84" fill={brandAccent} />
			</g>

			{/* u (Geist Medium - Text Color) */}
			<path d={PATH_U} transform="translate(1804.8, 0)" fill={textFill} />

			{/* s (Geist Medium - Text Color) */}
			<path d={PATH_S} transform="translate(2348.4, 0)" fill={textFill} />

			{/* H (Geist Bold - Text Color) */}
			<path d={PATH_H} transform="translate(3029.4, 0)" fill={textFill} />

			{/* u (Geist Medium - Text Color) */}
			<path d={PATH_U} transform="translate(3676.6, 0)" fill={textFill} />

			{/* b (Geist Medium - Text Color) */}
			<path d={PATH_B} transform="translate(4187, 0)" fill={textFill} />
		</svg>
	);
}
