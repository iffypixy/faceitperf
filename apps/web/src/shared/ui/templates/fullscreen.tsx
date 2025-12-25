import { cn } from "~/shared/lib/cn";

export const Fullscreen: React.FC<React.ComponentProps<"div">> = (props) => (
	<div {...props} className={cn("w-screen h-screen", props.className)} />
);
