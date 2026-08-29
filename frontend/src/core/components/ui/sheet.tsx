import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/core/utils/index";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
	...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
				className,
			)}
			{...props}
		/>
	);
}

const sheetVariants = cva(
	"fixed z-50 flex flex-col bg-card text-foreground shadow-lg transition ease-in-out data-open:animate-in data-closed:animate-out data-closed:duration-200 data-open:duration-300",
	{
		variants: {
			side: {
				right:
					"inset-y-0 right-0 h-full w-full border-l border-border-subtle data-closed:slide-out-to-right data-open:slide-in-from-right sm:max-w-md",
				left: "inset-y-0 left-0 h-full w-full border-r border-border-subtle data-closed:slide-out-to-left data-open:slide-in-from-left sm:max-w-md",
				top: "inset-x-0 top-0 h-auto border-b border-border-subtle data-closed:slide-out-to-top data-open:slide-in-from-top",
				bottom:
					"inset-x-0 bottom-0 h-auto border-t border-border-subtle data-closed:slide-out-to-bottom data-open:slide-in-from-bottom",
			},
		},
		defaultVariants: { side: "right" },
	},
);

function SheetContent({
	className,
	children,
	side = "right",
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
	VariantProps<typeof sheetVariants> & { showCloseButton?: boolean }) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(sheetVariants({ side }), className)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-70 outline-none transition-opacity hover:bg-surface-high hover:opacity-100 disabled:pointer-events-none">
						<XIcon className="size-4" />
						<span className="sr-only">Fechar</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(
				"flex shrink-0 flex-col gap-1 border-b border-border-subtle/10 p-4",
				className,
			)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn(
				"mt-auto flex shrink-0 justify-end gap-2 border-t border-border-subtle/10 p-4",
				className,
			)}
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("font-semibold text-foreground", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};
