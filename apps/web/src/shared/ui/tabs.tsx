import {forwardRef} from "react";
import * as RTabs from "@radix-ui/react-tabs";
import {cx} from "class-variance-authority";

export const Tabs = RTabs.Root;

export const TabsList = forwardRef<
	React.ElementRef<typeof RTabs.List>,
	React.ComponentPropsWithoutRef<typeof RTabs.List>
>(({className, ...props}, ref) => (
	<RTabs.List
		ref={ref}
		className={cx(
			"inline-flex h-88 items-center justify-center rounded-12 p-12",
			className,
		)}
		{...props}
	/>
));

TabsList.displayName = RTabs.List.displayName;

export const TabsTrigger = forwardRef<
	React.ElementRef<typeof RTabs.Trigger>,
	React.ComponentPropsWithoutRef<typeof RTabs.Trigger>
>(({className, ...props}, ref) => (
	<RTabs.Trigger
		ref={ref}
		className={cx(
			"inline-flex items-center justify-center font-bold whitespace-nowrap h-full rounded-8 px-3 py-1 text-sm uppercase transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-fixed-hltv data-[state=active]:shadow",
			className,
		)}
		{...props}
	/>
));

TabsTrigger.displayName = RTabs.Trigger.displayName;

export const TabsContent = forwardRef<
	React.ElementRef<typeof RTabs.Content>,
	React.ComponentPropsWithoutRef<typeof RTabs.Content>
>(({className, ...props}, ref) => (
	<RTabs.Content
		ref={ref}
		className={cx("mt-2 focus-visible:outline-none", className)}
		{...props}
	/>
));

TabsContent.displayName = RTabs.Content.displayName;
