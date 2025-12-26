import { LoaderIcon, type LucideProps } from "lucide-react";

import { cn } from "~/shared/lib/cn";
import { Center } from "./templates";

export const Spinner: React.FC<LucideProps> = ({ className, ...props }) => (
	<Center>
		<LoaderIcon className={cn("animate-spin", className)} {...props} />
	</Center>
);
