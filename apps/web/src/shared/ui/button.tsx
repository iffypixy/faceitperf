import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/shared/lib/cn";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-xs text-2xl font-medium ring-offset-background transition-colors focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-primary text-foreground hover:bg-primary/75 py-2 px-4",
				icon: "text-foreground/75 hover:text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

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
Button.displayName = "Button";

export { Button, buttonVariants };
