import {cx} from "class-variance-authority";

import "./index.css";

export const Loader: React.FC<React.ComponentProps<"div">> = ({
	className,
	...props
}) => <div className={cx("loader", className)} {...props} />;
