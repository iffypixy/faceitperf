import { cn } from "~/shared/lib/cn";

export const Container: React.FC<
	React.PropsWithChildren & {
		className?: string;
	}
> = ({ children, className }) => (
	// Keep "max-width" in sync with `--breakpoint-md` CSS variable.
	<div className={cn("max-w-[1024px] px-8 mx-auto", className)}>{children}</div>
);
