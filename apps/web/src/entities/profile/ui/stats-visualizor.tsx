import {Icon, Tooltip, TooltipContent, TooltipTrigger} from "@shared/ui";
import {cx} from "class-variance-authority";
import {twMerge} from "tailwind-merge";

type VisualizedStat = "rating" | "kd" | "dpr" | "kpr" | "kast" | "adr";

export const StatsVisualizor: React.FC<{
	stats: Record<VisualizedStat, number>;
}> = ({stats}) => {
	return (
		<div className="flex flex-col space-y-52 -mx-22">
			<div className="flex">
				<Stat id="rating" value={stats.rating} approximate />
				<Stat id="dpr" value={stats.dpr} />
				<Stat id="kast" value={stats.kast} approximate />
			</div>

			<div className="flex">
				<Stat id="kd" value={stats.kd} />
				<Stat id="adr" value={stats.adr} approximate />
				<Stat id="kpr" value={stats.kpr} />
			</div>
		</div>
	);
};

const Stat: React.FC<{
	id: VisualizedStat;
	value: number;
	approximate?: boolean;
}> = ({id, value, approximate}) => {
	const map: Record<VisualizedStat, string> = {
		rating: "Rating 2.0",
		kd: "K/D",
		dpr: "DPR",
		kast: "KAST %",
		kpr: "KPR",
		adr: "ADR",
	};

	const range: Record<VisualizedStat, number[]> = {
		rating: [0.5, 1.5],
		kd: [0.5, 1.6],
		dpr: [0.55, 0.85],
		kast: [40, 90],
		kpr: [0.5, 1],
		adr: [50, 110],
	};

	const format: Record<VisualizedStat, string> = {
		kd: value.toFixed(2),
		rating: value.toFixed(2),
		dpr: value.toFixed(2),
		kast: value.toFixed(1),
		adr: value.toFixed(1),
		kpr: value.toFixed(2),
	};

	const adjusted = format[id];

	const [MIN, MAX] = range[id];

	const scale = () => (+adjusted - MIN) / (MAX - MIN);

	const level = () => {
		const diff = MAX - MIN;

		const first = MIN + diff / 3;
		const second = MIN + (2 * diff) / 3;

		if (+adjusted <= first) return 1;
		else if (+adjusted <= second) return 2;
		else return 3;
	};

	const translate = id === "dpr" ? 100 - scale() * 100 : scale() * 100;
	const left = Math.min(Math.max(translate, 0), 100);

	const poor = level() === (id === "dpr" ? 3 : 1);
	const average = level() === 2;
	const good = level() === (id === "dpr" ? 1 : 3);

	const name = map[id];

	return (
		<div className="flex flex-col w-1/3 mx-22 xs:mx-14">
			<div className="flex flex-col">
				<div className="flex items-center">
					<span className="text-[#9ec8f1] uppercase font-medium xs:text-14">
						{name}
					</span>

					{approximate && (
						<Tooltip>
							<TooltipTrigger>
								<Icon.Approx className="w-16 h-auto fill-paper-contrast/60 ml-8" />
							</TooltipTrigger>

							<TooltipContent
								className="max-w-[22rem] w-full"
								sideOffset={12}
							>
								<div className="flex flex-col space-y-12">
									<h6 className="text-16 font-bold text-paper-contrast">
										Approximation
									</h6>

									<span className="text-12">
										This value is an approximate estimate,
										not a precise figure.
									</span>
								</div>
							</TooltipContent>
						</Tooltip>
					)}
				</div>

				<span className="text-paper-contrast font-bold text-60 xs:text-38">
					{adjusted}
				</span>
			</div>

			<div className="relative">
				<div className="flex h-8 rounded-2">
					<div className="w-1/3 h-full relative">
						<span
							className={cx(
								"bg-[#4b525a] block w-full h-full rounded-2",
								{
									"bg-[#f53c3c] shadow-[0px_0px_15px_0px_#f53c3c]":
										poor,
								},
							)}
						/>

						{poor && (
							<span className="uppercase absolute top-14 left-0 text-12 text-[#f53c3c]">
								poor
							</span>
						)}
					</div>

					<div className="w-1/3 h-full relative">
						<span
							className={cx(
								"bg-[#5f666d] block w-full h-full rounded-2",
								{
									"bg-[#e3ae08] shadow-[0px_0px_15px_0px_#e3ae08]":
										average,
								},
							)}
						/>

						{average && (
							<span className="uppercase absolute top-14 left-1/2 -translate-x-1/2 text-12 text-[#e3ae08]">
								okay
							</span>
						)}
					</div>

					<div className="w-1/3 h-full relative">
						<span
							className={twMerge(
								cx(
									"bg-[#4b535c] block w-full h-full rounded-2",
									{
										"bg-[#06ab18] shadow-[0px_0px_15px_0px_#06ab18]":
											good,
									},
								),
							)}
						/>

						{good && (
							<span className="uppercase absolute top-14 right-0 text-12 text-[#06ab18]">
								good
							</span>
						)}
					</div>
				</div>

				<div
					className="w-8 h-18 bg-paper-contrast absolute rounded-2"
					style={{
						left: `${left}%`,
						top: "50%",
						transform: "translateY(-50%)",
					}}
				></div>
			</div>
		</div>
	);
};
