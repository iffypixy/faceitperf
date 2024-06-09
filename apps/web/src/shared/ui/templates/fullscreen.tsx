import {cx} from "class-variance-authority";

export const Fullscreen: React.FC<React.ComponentProps<"div">> = (props) => (
	<div {...props} className={cx("w-screen h-screen", props.className)} />
);
