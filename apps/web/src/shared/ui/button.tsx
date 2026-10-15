import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/shared/lib/cn";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-xs text-2xl font-medium ring-offset-background transition-[color,background-color,scale] duration-160 ease-out active:scale-[0.97] focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				// Hover lightens, as everywhere else in the app.
				default:
					"bg-primary text-foreground hover:bg-[color-mix(in_oklab,var(--primary),white_8%)] py-2 px-4",
				// The icon alone is a small target, so the tappable area reaches a little past it.
				icon: "relative text-foreground/75 hover:text-foreground after:absolute after:-inset-2",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Button({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />
	);
}

export { Button, buttonVariants };
