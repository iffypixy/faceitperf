import {cx} from "class-variance-authority";

import {PropsWithClassName} from "@shared/lib/types";

interface ContainerProps extends React.PropsWithChildren, PropsWithClassName {}

export const Container: React.FC<ContainerProps> = ({children, className}) => (
	<div
		className={cx(
			"max-w-[1170px] w-full h-full mx-auto md:px-24 xs:px-12",
			className,
		)}
	>
		{children}
	</div>
);
