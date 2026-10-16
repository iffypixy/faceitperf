import { cn } from "~/shared/lib/cn";
import { translate } from "~/shared/lib/language";
import { Center } from "./templates";

const SpokeCount = 8;

// Like the iOS indicator: the spokes fade behind the brightest one, and the wheel ticks a spoke at
// a time, which reads as quicker than a smooth spin.
export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
	<Center role="status">
		<svg
			role="img"
			aria-label={translate({ en: "Loading", ru: "Загрузка" })}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			className={cn("size-6 animate-tick", className)}
		>
			{Array.from({ length: SpokeCount }).map((_, index) => (
				<line
					key={index}
					x1={12}
					y1={2}
					x2={12}
					y2={6}
					transform={`rotate(${index * (360 / SpokeCount)} 12 12)`}
					// Ahead of the brightest spoke (index 0) is the dimmest one: the wheel turns clockwise.
					strokeOpacity={index === 0 ? 1 : index / SpokeCount}
				/>
			))}
		</svg>
	</Center>
);
