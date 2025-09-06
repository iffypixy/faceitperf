import {Avatar} from "@shared/ui";
import {cx} from "class-variance-authority";
import {TeamScore} from "types/score";

interface MapCardProps {
	team1Score?: TeamScore;
	team2Score?: TeamScore;
	mapName: string;
	team1Avatar: string;
	team1Name: string;
	team2Avatar: string;
	team2Name: string;
	isOvertime: boolean;
}

export const MapCard: React.FC<MapCardProps> = ({
	team1Score,
	team2Score,
	mapName,
	team1Avatar,
	team1Name,
	team2Avatar,
	team2Name,
	isOvertime,
}) => {
	const isMapPlayed = team1Score || team2Score;

	return (
		<div className="flex flex-col rounded-4 overflow-hidden">
			<div className="flex items-center justify-center relative">
				<img
					src={`https://hltv.org/img/static/maps/${mapName.slice(3)}.png`}
					alt="Map"
					className="w-full h-auto"
				/>

				<span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 text-[#fff] font-bold text-14">
					{
						{
							de_mirage: "Mirage",
							de_anubis: "Anubis",
							de_dust2: "Dust 2",
							de_vertigo: "Vertigo",
							de_inferno: "Inferno",
							de_nuke: "Nuke",
							de_ancient: "Ancient",
							de_train: "Train",
							de_cbble: "Cobblestone",
							de_overpass: "Overpass",
						}[mapName]
					}
				</span>
			</div>

			<div className="flex bg-[#2D3844] justify-between items-center p-18">
				<div className="w-1/3 flex items-start space-x-12 overflow-hidden">
					<Avatar
						src={team1Avatar}
						alt="First team's avatar"
						className="min-w-32 max-w-32 h-auto rounded-full"
					/>

					<div className="flex flex-col items-start overflow-hidden">
						<span className="w-full overflow-hidden text-ellipsis text-[#929a9e] font-bold text-12">
							{team1Name}
						</span>

						<span
							className={cx(
								"font-bold text-[#b9bdbf] !text-14",
								isMapPlayed && {
									"!text-[#09c100]":
										(team2Score?.score ?? 0) >
										(team1Score?.score ?? 0),
									"!text-[#fc1d1d]":
										(team1Score?.score ?? 0) >
										(team2Score?.score ?? 0),
								},
							)}
						>
							{isMapPlayed ? team1Score?.score : "-"}
						</span>
					</div>
				</div>

				<div className="w-1/3 mt-auto overflow-hidden flex justify-center">
					{isMapPlayed && (
						<span className="text-[#929a9e] font-normal text-12">
							{`(${team1Score?.firstHalfScore}:${team2Score?.firstHalfScore}; ${team1Score?.secondHalfScore}:${team2Score?.secondHalfScore})${
								isOvertime
									? ` (${team1Score?.overtimeScore}:${team2Score?.overtimeScore})`
									: ""
							}`}
						</span>
					)}
				</div>

				<div className="w-1/3 flex items-start space-x-12 overflow-hidden">
					<div className="flex flex-1 flex-col items-end overflow-hidden">
						<span className="w-full overflow-hidden text-ellipsis text-[#929a9e] font-bold text-12 text-end">
							{team2Name}
						</span>

						<span
							className={cx("font-bold text-[#b9bdbf] !text-14", {
								"!text-[#09c100]":
									(team1Score?.score ?? 0) >
									(team2Score?.score ?? 0),
								"!text-[#fc1d1d]":
									(team2Score?.score ?? 0) >
									(team1Score?.score ?? 0),
							})}
						>
							{isMapPlayed ? team2Score?.score : "-"}
						</span>
					</div>

					<Avatar
						src={team2Avatar}
						alt="Second team's avatar"
						className="min-w-32 max-w-32 h-auto rounded-full"
					/>
				</div>
			</div>
		</div>
	);
};
