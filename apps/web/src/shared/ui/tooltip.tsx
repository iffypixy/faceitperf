import {forwardRef} from "react";
import * as RTooltip from "@radix-ui/react-tooltip";
import {cx} from "class-variance-authority";

const TooltipProvider = RTooltip.Provider;

const Tooltip = RTooltip.Root;

const TooltipTrigger = RTooltip.Trigger;

const TooltipContent = forwardRef<
	React.ElementRef<typeof RTooltip.Content>,
	React.ComponentPropsWithoutRef<typeof RTooltip.Content>
>(({className, sideOffset = 4, ...props}, ref) => (
	<RTooltip.Content
		ref={ref}
		sideOffset={sideOffset}
		className={cx(
			"z-50 max-w-[22rem] w-full bg-paper p-18 border-2 border-paper-contrast/15 opacity-95 rounded-6 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-paper-contrast animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
			className,
		)}
		{...props}
	/>
));

TooltipContent.displayName = RTooltip.Content.displayName;

export {Tooltip, TooltipTrigger, TooltipContent, TooltipProvider};
