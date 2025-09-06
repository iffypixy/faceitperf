import {Link, useParams, useSearchParams} from "wouter";
import * as datefns from "date-fns";
import {cx} from "class-variance-authority";
import {twMerge} from "tailwind-merge";

import {
	formatMatchDate,
	useMatch,
	MatchStats,
	MapSelect,
} from "@entities/match";
import {calculateAverageStats} from "@entities/profile";
import {Loader} from "@shared/ui/loader";
import {Avatar, Center, Container, Fullscreen} from "@shared/ui";

/*
	TODO
	- [] bonus: ability to view stats for 'all maps'
	- [] bonus: time should be for overall series, not first map
	- [] bonus: veto option 7. should be "<MAP> left over"
	- [] added bonus - ability to select "side" to view stats based off if they're T or CT
	- [] added bonus - have half scores in map card be coloured based off side
	- [] added bonus - cleanup "Server" section
	- [] added bonus - pick banner on map card
	- [] added bonus - demo download links below server section
*/

export const MatchPage: React.FC = () => {
	const {matchId} = useParams() as {matchId: string};
	const [searchParams, setSearchParams] = useSearchParams();

	const {match, isLoading, isError} = useMatch(matchId);

	const activeMap = +searchParams.get('map')! > 0 ? +searchParams.get('map')! : 0

	if (isLoading)
		return (
			<Fullscreen>
				<Center>
					<Loader />
				</Center>
			</Fullscreen>
		);

	if (isError)
		return (
			<Fullscreen>
				<Center>
					<h1 className="text-48 font-black">Match not found. :c</h1>
				</Center>
			</Fullscreen>
		);

	if (!match) return;

	const score = {
		team1: match?.stats.map((s) =>
			s.score.find((s) => s.teamId === match.team1.faction_id),
		),
		team2: match?.stats.map((s) =>
			s.score.find((s) => s.teamId === match.team2.faction_id),
		),
	};

	const stats = match?.stats.map((m) => ({
		team1: match?.team1.roster
			.filter((player) =>
				m.team1.some((p) => p.player_id === player.player_id),
			)
			.map((player) => ({
				id: player.player_id,
				username: player.nickname,
				stats: calculateAverageStats([
					{
						...m.team1.find(
							(p) => p.player_id === player.player_id,
						)!.player_stats,
						Rounds: String(m.rounds),
					},
				]),
			}))
			.sort((a, b) => b.stats.rating - a.stats.rating),
		team2: match?.team2.roster
			.filter((player) =>
				m.team2.some((p) => p.player_id === player.player_id),
			)
			.map((player) => ({
				id: player.player_id,
				username: player.nickname,
				stats: calculateAverageStats([
					{
						...m.team2.find(
							(p) => p.player_id === player.player_id,
						)!.player_stats,
						Rounds: String(m.rounds),
					},
				]),
			}))
			.sort((a, b) => b.stats.rating - a.stats.rating),
	}));

	return (
		<div className="flex flex-col">
			<header className="w-full bg-profile bg-fixed-profile py-24 shadow-md shadow-[#000]">
				<Container className="max-w-[920px]">
					<Link to="/">
						<h3 className="font-black text-28 text-center leading-[1]">
							<span className="text-fixed-faceit">FACEIT</span>
							<span className="text-fixed-hltv text-[3.6rem]">
								perf
							</span>
						</h3>
					</Link>
				</Container>
			</header>

			<Container className="max-w-[920px]">
				<main className="w-full flex flex-col space-y-48 py-48">
					<div className="flex bg-[#2d3844] rounded-4 p-34 justify-between">
						<div className="w-1/3 flex flex-col items-center text-center space-y-12">
							<div className="w-full flex flex-col space-y-4 items-center">
								<Avatar
									src={match?.team1.avatar}
									alt="First team's avatar"
									className="w-72 h-auto rounded-full"
								/>

								<h3 className="w-full overflow-hidden text-ellipsis text-[#b9bdbf] font-bold text-24">
									{match?.team1.name}
								</h3>
							</div>

							<span
								className={twMerge(
									cx("font-bold text-[#b9bdbf]", {
										"text-[#09c100]": match?.winner.team1,
										"text-[#fc1d1d]": match?.winner.team2,
									}),
								)}
							>
								<span className="text-20">
									{match?.bo === 3
										? match.score.team1
										: score.team1[0]?.score}
								</span>
							</span>
						</div>

						<div className="w-1/3 flex flex-col items-center text-center justify-center space-y-16">
							<h4 className="text-[#b9bdbf] text-40 font-bold">
								{match?.startedAt &&
									datefns.format(match.startedAt, "HH:mm")}
							</h4>

							<div className="flex flex-col space-y-4">
								<span className="text-[#929a9e] text-14">
									{match && formatMatchDate(match.startedAt)}
								</span>

								<span className="text-[#929a9e] text-12">
									{match &&
										datefns.formatDistanceStrict(
											match.finishedAt,
											match.startedAt,
										)}
								</span>
							</div>

							<h6 className="text-[#929a9e] text-22 font-bold">
								Match over
							</h6>
						</div>

						<div className="w-1/3 flex flex-col items-center text-center space-y-12">
							<div className="w-full flex flex-col space-y-4 items-center">
								<Avatar
									src={match?.team2.avatar}
									alt="Second team's avatar"
									className="w-72 h-auto rounded-full"
								/>

								<h3 className="w-full text-ellipsis overflow-hidden text-[#b9bdbf] font-bold text-24">
									{match?.team2.name}
								</h3>
							</div>

							<span
								className={twMerge(
									cx("font-bold text-[#b9bdbf]", {
										"text-[#09c100]": match?.winner.team2,
										"text-[#fc1d1d]": match?.winner.team1,
									}),
								)}
							>
								<span className="text-20">
									{match?.bo === 3
										? match.score.team2
										: score.team2[0]?.score}
								</span>
							</span>
						</div>
					</div>

					<div className="flex space-x-32">
						<div className="w-1/2 flex flex-col space-y-16">
							<h5 className="text-[#929a9e] text-20 font-bold">
								Maps
							</h5>

							<div className="w-full flex flex-col space-y-12 text-[#929a9e]">
								<div className="w-full flex flex-col bg-[#2D3844] p-18 rounded-4">
									Best of {match?.bo}
								</div>

								{match?.veto && (
									<ul className="w-full flex flex-col bg-[#2D3844] p-18 rounded-4 text-14 space-y-6 list-decimal">
										{match.veto
											.find(
												(process) =>
													process.entity_type ===
													"map",
											)
											?.entities.map((entity, idx) => (
												<li
													key={idx}
													className="ml-18 break-words"
												>
													{`Team ${
														{
															faction1:
																match.team1
																	.name,
															faction2:
																match.team2
																	.name,
														}[entity.selected_by]
													} ${{pick: "picked", drop: "removed"}[entity.status]} ${
														{
															de_mirage: "Mirage",
															de_anubis: "Anubis",
															de_dust2: "Dust 2",
															de_vertigo:
																"Vertigo",
															de_inferno:
																"Inferno",
															de_nuke: "Nuke",
															de_ancient:
																"Ancient",
															de_train: "Train",
															de_overpass:
																"Overpass",
														}[entity.guid]
													}
                                                `}
												</li>
											))}
									</ul>
								)}

								{match.maps?.map((m, i) => {
									const team1Score = score.team1[i];
									const team2Score = score.team2[i];
									const isMapPlayed =
										team1Score || team2Score;

									return (
										<div className="flex flex-col rounded-4 overflow-hidden">
											<div className="flex items-center justify-center relative">
												<img
													src={`https://hltv.org/img/static/maps/${m.name?.slice(3)}.png`}
													alt="Map"
													className="w-full h-auto"
												/>

												{match && (
													<span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 text-[#fff] font-bold text-14">
														{
															{
																de_mirage:
																	"Mirage",
																de_anubis:
																	"Anubis",
																de_dust2:
																	"Dust 2",
																de_vertigo:
																	"Vertigo",
																de_inferno:
																	"Inferno",
																de_nuke: "Nuke",
																de_ancient:
																	"Ancient",
																de_train:
																	"Train",
																de_cbble:
																	"Cobblestone",
																de_overpass:
																	"Overpass",
															}[m.name!]
														}
													</span>
												)}
											</div>

											<div className="flex bg-[#2D3844] justify-between items-center p-18">
												<div className="w-1/3 flex items-start space-x-12 overflow-hidden">
													<Avatar
														src={
															match?.team1.avatar
														}
														alt="First team's avatar"
														className="min-w-32 max-w-32 h-auto rounded-full"
													/>

													<div className="flex flex-col items-start overflow-hidden">
														<span className="w-full overflow-hidden text-ellipsis text-[#929a9e] font-bold text-12">
															{match?.team1.name}
														</span>

														<span
															className={cx(
																"font-bold text-[#b9bdbf] !text-14",
																isMapPlayed && {
																	"!text-[#09c100]":
																		(team2Score?.score ??
																			0) >
																		(team1Score?.score ??
																			0),
																	"!text-[#fc1d1d]":
																		(team1Score?.score ??
																			0) >
																		(team2Score?.score ??
																			0),
																},
															)}
														>
															{isMapPlayed
																? team1Score?.score
																: "-"}
														</span>
													</div>
												</div>

												<div className="w-1/3 mt-auto overflow-hidden flex justify-center">
													{isMapPlayed && (
														<span className="text-[#929a9e] font-normal text-12">
															{`(${team1Score?.firstHalfScore}:${team2Score?.firstHalfScore}; ${team1Score?.secondHalfScore}:${team2Score?.secondHalfScore})${
																match?.stats[i]
																	.isOvertime
																	? ` (${team1Score?.overtimeScore}:${team2Score?.overtimeScore})`
																	: ""
															}`}
														</span>
													)}
												</div>

												<div className="w-1/3 flex items-start space-x-12 overflow-hidden">
													<div className="flex flex-1 flex-col items-end overflow-hidden">
														<span className="w-full overflow-hidden text-ellipsis text-[#929a9e] font-bold text-12 text-end">
															{match?.team2.name}
														</span>

														<span
															className={cx(
																"font-bold text-[#b9bdbf] !text-14",
																{
																	"!text-[#09c100]":
																		(team1Score?.score ??
																			0) >
																		(team2Score?.score ??
																			0),
																	"!text-[#fc1d1d]":
																		(team2Score?.score ??
																			0) >
																		(team1Score?.score ??
																			0),
																},
															)}
														>
															{isMapPlayed
																? team2Score?.score
																: "-"}
														</span>
													</div>

													<Avatar
														src={
															match?.team2.avatar
														}
														alt="Second team's avatar"
														className="min-w-32 max-w-32 h-auto rounded-full"
													/>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="w-1/2 flex flex-col space-y-16">
							<h5 className="text-[#929a9e] text-20 font-bold">
								Server
							</h5>

							<div className="w-full flex flex-col space-y-12 text-[#929a9e]">
								{match?.veto && (
									<ul className="w-full flex flex-col bg-[#2D3844] p-18 rounded-4 space-y-6 list-decimal text-14">
										{match.veto
											.find(
												(process) =>
													process.entity_type ===
													"location",
											)
											?.entities.map((entity, idx) => (
												<li
													key={idx}
													className="ml-18 break-words"
												>
													{`Team ${
														{
															faction1:
																match.team1
																	.name,
															faction2:
																match.team2
																	.name,
														}[entity.selected_by]
													} ${{pick: "picked", drop: "removed"}[entity.status]} ${
														entity.guid
													}
                                                `}
												</li>
											))}
									</ul>
								)}

								<div className="flex space-x-14 items-center rounded-4 bg-[#2D3844] overflow-hidden p-18">
									<img
										src={match?.server.image.lg}
										alt="Server location country"
										className="w-72 h-auto rounded-2"
									/>

									<span>{match?.server.name}</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex flex-col space-y-16">
						<h5 className="text-[#929a9e] font-bold text-20">
							Match Stats
						</h5>

						<div className="flex flex-col space-y-20">
							{match.bo === 3 && (
								<MapSelect
									maps={
										match.maps
											?.map((m, i) => ({
												name: m.name,
												value: i,
											}))
											.slice(0, stats.length) ?? []
									}
									activeMap={activeMap}
									setActiveMap={(map: string) => setSearchParams({'map': map})}
								/>
							)}

							{match && stats[activeMap].team1 && (
								<MatchStats
									team={{
										avatar: match?.team1.avatar,
										name: match?.team1.name,
										roster: stats[activeMap].team1?.map(
											(player) => ({
												id: player.id,
												username: player.username,
												kills: player.stats.kills,
												deaths: player.stats.deaths,
												adr: player.stats.adr,
												kast: player.stats.kast,
												rating: player.stats.rating,
												country:
													match.countries.team1.find(
														(p) =>
															p.id === player.id,
													)!.country,
											}),
										),
									}}
								/>
							)}

							{match && stats[activeMap].team2 && (
								<MatchStats
									team={{
										avatar: match?.team2.avatar,
										name: match?.team2.name,
										roster: stats[activeMap].team2?.map(
											(player) => ({
												id: player.id,
												username: player.username,
												kills: player.stats.kills,
												deaths: player.stats.deaths,
												adr: player.stats.adr,
												kast: player.stats.kast,
												rating: player.stats.rating,
												country:
													match.countries.team2.find(
														(p) =>
															p.id === player.id,
													)!.country,
											}),
										),
									}}
								/>
							)}
						</div>
					</div>
				</main>
			</Container>
		</div>
	);
};
