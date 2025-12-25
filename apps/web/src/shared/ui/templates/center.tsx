import { cx } from "class-variance-authority";

export const Center: React.FC<React.ComponentProps<"div">> = (props) => (
	<div
		{...props}
		className={cx("w-full h-full flex items-center justify-center", props.className)}
	/>
);
