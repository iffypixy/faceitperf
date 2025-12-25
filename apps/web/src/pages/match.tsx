import { ReactNode, useMemo, useState } from "react";
import { useParams } from "wouter";
import { format, formatDistanceStrict } from "date-fns";
import { match } from "ts-pattern";
import { useQuery } from "@tanstack/react-query";
import { createQueryKeys } from "@lukemorales/query-key-factory";

import { api, faceitApi } from "@shared/api";
import { Spinner } from "@shared/ui/loader";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Center,
	Container,
	ContentTemplate,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/ui";
import { toSignedString } from "@shared/lib/numbers";
import { cn } from "@shared/lib/cn";
import type { PlayerPerformance } from "@features/stats";
import {
	aggregatePlayerPerformance,
	flagUrl,
	Performance,
	PerformanceColor,
	type PlayerMapStatsInput,
	RatingColumnHead,
	roundMetricValue,
} from "@features/profile";
import { MapLabel, type Map } from "@entities/map";
import { PageTitle } from "@shared/lib/title";

export const MatchPage: React.FC = () => {
	const { matchId } = useParams<{ matchId: string }>();

	const query = useMatchQuery(matchId);
	useVetoProcessQuery(matchId);
	useStatsQuery(matchId);

	return (
		<ContentTemplate>
			<PageTitle title="Match" />

			{match(query)
				.with({ status: "pending" }, () => <Spinner />)
				.with({ status: "error" }, () => (
					<Center>
						<h1 className="text-2xl">This match doesn't exist or isn't available right now.</h1>
					</Center>
				))
				.with({ status: "success" }, (x) => {
					const {
						match_id,
						best_of,
						teams: { faction1, faction2 },
						voting,
						faceit_url,
						results,
						started_at,
						finished_at,
					} = x.data;

					const serverInfo = inferServerInfo(voting);
					const startDate = new Date(started_at * 1000);
					const endDate = new Date(finished_at * 1000);

					const team1: TeamEntry = {
						id: faction1.faction_id,
						name: faction1.name,
						avatar: faction1.avatar,
					};
					const team2: TeamEntry = {
						id: faction2.faction_id,
						name: faction2.name,
						avatar: faction2.avatar,
					};

					return (
						<Container>
							<div className="flex flex-col gap-8">
								<div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center bg-card p-8">
									<TeamScoreCard
										avatar={faction1.avatar}
										name={faction1.name}
										score={results.score.faction1}
										outcome={results.winner === "faction1" ? "win" : "loss"}
									/>
									<div className="flex flex-col justify-center text-center gap-4">
										<p className="text-3xl font-bold">{format(startDate, "HH:mm")}</p>
										<div className="flex flex-col">
											<p>{format(startDate, "do 'of' MMMM yyyy")}</p>
											<p>{formatDistanceStrict(endDate, startDate, { unit: "minute" })}</p>
										</div>
										<p className="text-xl font-bold">Match over</p>
									</div>
									<TeamScoreCard
										avatar={faction2.avatar}
										name={faction2.name}
										score={results.score.faction2}
										outcome={results.winner === "faction2" ? "win" : "loss"}
									/>
								</div>

								<div className="grid grid-cols-2 gap-8">
									<div className="flex flex-col gap-2">
										<h3 className="font-bold">Maps</h3>
										<InfoBlock>Best of {best_of}</InfoBlock>
										<MapVeto matchId={match_id} team1={faction1.name} team2={faction2.name} />
										<MapHistory matchId={match_id} team1={team1} team2={team2} />
									</div>

									<div className="flex flex-col gap-8">
										<div className="flex flex-col gap-2">
											<h3 className="font-bold">Server</h3>
											<ServerVeto matchId={match_id} team1={faction1.name} team2={faction2.name} />
											{serverInfo && (
												<InfoBlock>
													<div className="flex items-center gap-2">
														<img
															src={flagUrl(serverInfo.countryCode)}
															alt={serverInfo.countryCode}
															className="border border-background"
														/>
														<p>{serverInfo.location}</p>
													</div>
												</InfoBlock>
											)}
										</div>

										<div className="flex flex-col gap-2">
											<h3 className="font-bold">Rewatch</h3>
											<a
												href={faceit_url.replace("{lang}", "en")}
												target="_blank"
												rel="noopener noreferrer"
											>
												<InfoBlock>Go to matchroom</InfoBlock>
											</a>
										</div>
									</div>
								</div>

								<MatchStats matchId={match_id} team1={team1} team2={team2} />
							</div>
						</Container>
					);
				})
				.exhaustive()}
		</ContentTemplate>
	);
};

function inferServerInfo(voting: Match["voting"]) {
	if (!voting || !voting.location) return null;

	const location = voting.location.pick[0];

	const locationInfo = voting.location.entities.find((x) => x.guid === location);
	if (!locationInfo) return null;

	const countryCodeMatch = locationInfo.image_sm.match(/\/([a-z]{2})\.jpg/i);
	const countryCode = countryCodeMatch ? countryCodeMatch[1].toLowerCase() : null;
	if (!countryCode) return null;

	return { location, countryCode };
}

const TeamScoreCard: React.FC<{
	avatar: string;
	name: string;
	score: number;
	outcome: "win" | "loss";
}> = ({ avatar, name, score, outcome }) => {
	const scoreColor = match(outcome)
		.with("win", () => PerformanceColor.good)
		.with("loss", () => PerformanceColor.poor)
		.exhaustive();

	return (
		<div className="flex flex-col items-center gap-4 overflow-hidden">
			<div className="flex flex-col items-center gap-2 w-full">
				<PlayerAvatar src={avatar} alt={name} />
				<p title={name} className="font-bold truncate w-full text-center">
					{name}
				</p>
			</div>

			<p className="text-xl font-bold" style={{ color: scoreColor }}>
				{score}
			</p>
		</div>
	);
};

const MapVeto: React.FC<{ matchId: string; team1: string; team2: string }> = ({
	matchId,
	team1,
	team2,
}) => {
	const vetoProcessQuery = useVetoProcessQuery(matchId);

	return (
		<InfoBlock>
			{match(vetoProcessQuery)
				.with({ status: "pending" }, () => <Spinner />)
				.with({ status: "error" }, () => <ErrorMessage />)
				.with({ status: "success" }, (x) => {
					const mapVeto = x.data.payload.tickets.find((x) => x.entity_type === "map");
					if (!mapVeto) return <ErrorMessage />;

					return (
						<ol className="list-decimal pl-4">
							{mapVeto.entities.map((x, index, { length }) => {
								const team = match(x.selected_by)
									.with("faction1", () => team1)
									.with("faction2", () => team2)
									.exhaustive();

								const action = match(x.status)
									.with("drop", () => "removed")
									.with("pick", () => "picked")
									.exhaustive();

								const map = MapLabel[x.guid as Map] ?? "???";
								const text =
									index === length - 1 ? `${map} was left over` : `${team} ${action} ${map}`;

								return <li key={x.guid}>{text}</li>;
							})}
						</ol>
					);
				})
				.exhaustive()}
		</InfoBlock>
	);
};

interface TeamEntry {
	id: string;
	avatar: string;
	name: string;
}

const MapHistory: React.FC<{ matchId: string; team1: TeamEntry; team2: TeamEntry }> = ({
	matchId,
	team1,
	team2,
}) => {
	const statsQuery = useStatsQuery(matchId);

	return match(statsQuery)
		.with({ status: "pending" }, () => (
			<InfoBlock>
				<Spinner />
			</InfoBlock>
		))
		.with({ status: "error" }, () => (
			<InfoBlock>
				<ErrorMessage />
			</InfoBlock>
		))
		.with({ status: "success" }, (x) => (
			<ul>
				{x.data.rounds.map((x, index) => {
					const map = (x.round_stats.Map ?? "tba") as Map;
					const stats1 = x.teams.find((x) => x.team_id === team1.id)?.team_stats;
					const stats2 = x.teams.find((x) => x.team_id === team2.id)?.team_stats;

					return (
						<li key={index}>
							<div className="flex flex-col">
								<div className="relative">
									<img src={mapImageUrl(map)} alt={map} className="w-full" />
									<p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold">
										{MapLabel[map] ?? "???"}
									</p>
								</div>

								<InfoBlock>
									<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-4">
										<TeamMapResult
											avatar={team1.avatar}
											name={team1.name}
											score={parseFloat(stats1?.["Final Score"] ?? "")}
											outcome={x.round_stats.Winner === team1.id ? "win" : "loss"}
										/>

										<p>
											({stats1?.["First Half Score"]}:{stats2?.["First Half Score"]};{" "}
											{stats1?.["Second Half Score"]}:{stats2?.["Second Half Score"]}) (
											{stats1?.["Overtime score"]}:{stats2?.["Overtime score"]})
										</p>

										<TeamMapResult
											avatar={team2.avatar}
											name={team2.name}
											score={parseFloat(stats2?.["Final Score"] ?? "")}
											outcome={x.round_stats.Winner === team2.id ? "win" : "loss"}
											reverse
										/>
									</div>
								</InfoBlock>
							</div>
						</li>
					);
				})}
			</ul>
		))
		.exhaustive();
};

function mapImageUrl(map: Map): string {
	return `https://hltv.org/img/static/maps/${map.slice(3)}.png`;
}

const TeamMapResult: React.FC<{
	avatar: string;
	name: string;
	score: number;
	outcome: "win" | "loss";
	reverse?: boolean;
}> = ({ avatar, name, score, outcome, reverse }) => {
	const scoreColor = match(outcome)
		.with("win", () => PerformanceColor.good)
		.with("loss", () => PerformanceColor.poor)
		.exhaustive();

	return (
		<div
			className={cn("grid grid-cols-[auto_1fr] items-start gap-4", reverse && "text-right ml-auto")}
		>
			<PlayerAvatar src={avatar} alt={name} className={cn("w-8", reverse && "order-2")} />
			<div className="flex flex-col overflow-hidden">
				<p
					title={name}
					className={cn("truncate", {
						"font-bold": outcome === "win",
						"text-muted-foreground": outcome === "loss",
					})}
				>
					{name}
				</p>
				<p
					style={{ color: scoreColor }}
					className={cn({
						"font-bold": outcome === "win",
						"text-muted-foreground": outcome === "loss",
					})}
				>
					{score}
				</p>
			</div>
		</div>
	);
};

const ServerVeto: React.FC<{ matchId: string; team1: string; team2: string }> = ({
	matchId,
	team1,
	team2,
}) => {
	const vetoProcessQuery = useVetoProcessQuery(matchId);

	return (
		<InfoBlock>
			{match(vetoProcessQuery)
				.with({ status: "pending" }, () => <Spinner />)
				.with({ status: "error" }, () => <ErrorMessage />)
				.with({ status: "success" }, (x) => {
					const serverVeto = x.data.payload.tickets.find((x) => x.entity_type === "location");
					if (!serverVeto) return <ErrorMessage />;

					return (
						<ol className="list-decimal pl-4">
							{serverVeto.entities.map((x, index, { length }) => {
								const team = match(x.selected_by)
									.with("faction1", () => team1)
									.with("faction2", () => team2)
									.exhaustive();

								const action = match(x.status)
									.with("drop", () => "removed")
									.with("pick", () => "picked")
									.exhaustive();

								const text =
									index === length - 1 ? `${x.guid} was left over` : `${team} ${action} ${x.guid}`;

								return <li key={x.guid}>{text}</li>;
							})}
						</ol>
					);
				})
				.exhaustive()}
		</InfoBlock>
	);
};

const InfoBlock: React.FC<{ children: ReactNode }> = ({ children }) => (
	<div className="p-4 bg-card rounded-xs">{children}</div>
);

const ErrorMessage: React.FC = () => <p className="text-destructive">Data unavailable.</p>;

const queryKeys = createQueryKeys("match", {
	matchById: (matchId: string) => ["match", matchId],
	vetoProcessByMatchId: (matchId: string) => ["vetoProcess", matchId],
	statsByMatchId: (matchId: string) => ["stats", matchId],
	playerById: (playerId: string) => ["player", playerId],
});

function useMatchQuery(matchId: string) {
	return useQuery({
		queryKey: queryKeys.matchById(matchId).queryKey,
		queryFn: () => fetchMatch(matchId),
	});
}

function useVetoProcessQuery(matchId: string) {
	return useQuery({
		queryKey: queryKeys.vetoProcessByMatchId(matchId).queryKey,
		queryFn: () => fetchVetoProcess(matchId),
	});
}

function useStatsQuery(matchId: string) {
	return useQuery({
		queryKey: queryKeys.statsByMatchId(matchId).queryKey,
		queryFn: () => fetchStats(matchId),
	});
}

function usePlayerQuery(playerId: string) {
	return useQuery({
		queryKey: queryKeys.playerById(playerId).queryKey,
		queryFn: () => fetchPlayer(playerId),
	});
}

interface PlayerEntry {
	id: string;
	nickname: string;
	stats: PlayerPerformance;
}

function buildPlayers(maps: MatchStats["rounds"], teamId: string): Array<PlayerEntry> {
	const playerByIdMap = new Map<string, { nickname: string; stats: PlayerMapStatsInput[] }>();

	for (const map of maps) {
		const team = map.teams.find((t) => t.team_id === teamId);
		if (!team) continue;

		for (const p of team.players) {
			if (!playerByIdMap.has(p.player_id))
				playerByIdMap.set(p.player_id, { nickname: p.nickname, stats: [] });

			const player = playerByIdMap.get(p.player_id)!;
			player.stats.push({ ...p.player_stats, Rounds: map.round_stats.Rounds });
		}
	}

	return Array.from(playerByIdMap.entries()).map(([id, p]) => ({
		id,
		nickname: p.nickname,
		stats: aggregatePlayerPerformance(p.stats),
	}));
}

type MapFilterValue = "all" | Map;

const MatchStats: React.FC<{
	matchId: string;
	team1: TeamEntry;
	team2: TeamEntry;
}> = ({ matchId, team1, team2 }) => {
	const query = useStatsQuery(matchId);

	const [mapFilter, setMapFilter] = useState<MapFilterValue>("all");

	return match(query)
		.with({ status: "pending" }, () => <Spinner />)
		.with({ status: "error" }, () => <ErrorMessage />)
		.with({ status: "success" }, (x) => {
			const mapFilterValues: MapFilterValue[] = [
				"all",
				...x.data.rounds.map((x) => x.round_stats.Map as Map),
			];

			const rounds = match(mapFilter)
				.with("all", () => x.data.rounds)
				.otherwise(() => x.data.rounds.filter((x) => x.round_stats.Map === mapFilter));

			return (
				<div className="flex flex-col gap-2">
					<InfoBlock>
						<ul className="flex items-center gap-4">
							{mapFilterValues.map((x, index) => (
								<li
									key={index}
									className={cn("text-primary-foreground", x === mapFilter && "font-bold")}
								>
									<button onClick={() => setMapFilter(x)}>
										{x === "all" ? "All maps" : MapLabel[x]}
									</button>
								</li>
							))}
						</ul>
					</InfoBlock>

					<div className="flex flex-col gap-4">
						<PlayerTable
							avatar={team1.avatar}
							name={team1.name}
							players={buildPlayers(rounds, team1.id)}
						/>
						<PlayerTable
							avatar={team2.avatar}
							name={team2.name}
							players={buildPlayers(rounds, team2.id)}
						/>
					</div>
				</div>
			);
		})
		.exhaustive();
};

const PlayerTable: React.FC<{
	name: string;
	avatar: string;
	players: Array<PlayerEntry>;
}> = ({ name, avatar, players }) => {
	const sortedPlayers = useMemo(
		() => players.slice().sort((a, b) => b.stats.rating - a.stats.rating),
		[players],
	);

	return (
		<Table>
			<TableHeader>
				<TableRow className="[&>th]:text-center">
					<TableHead>
						<div className="flex items-center gap-2">
							<PlayerAvatar src={avatar} alt={name} className="w-8" />
							<p className="font-bold">{name}</p>
						</div>
					</TableHead>
					<TableHead className="w-[10%]">K—D</TableHead>
					<TableHead className="w-[10%]">+/-</TableHead>
					<TableHead className="w-[10%]">ADR</TableHead>
					<TableHead className="w-[10%]">KAST %</TableHead>
					<TableHead className="w-[10%]">
						<RatingColumnHead />
					</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{sortedPlayers.map((player) => (
					<PlayerRow key={player.id} {...player} />
				))}
			</TableBody>
		</Table>
	);
};

const PlayerRow: React.FC<{
	id: string;
	nickname: string;
	stats: PlayerPerformance;
}> = ({ id, nickname, stats }) => {
	const { data } = usePlayerQuery(id);
	const country = data?.country;

	return (
		<TableRow key={id} className="[&>td]:text-center">
			<TableCell>
				<div className="flex items-center gap-2">
					{country && (
						<img src={flagUrl(country)} alt={country} className="w-6 border border-background" />
					)}
					<a
						href={playerUrl(nickname)}
						target="_blank"
						rel="noopener noreferrer"
						className="font-bold text-primary-foreground"
					>
						{nickname}
					</a>
				</div>
			</TableCell>

			<TableCell className="w-[10%]">
				{stats.kills}—{stats.deaths}
			</TableCell>

			<TableCell className="w-[10%]">
				<Performance metric="kdDiff" value={stats.kills - stats.deaths} render={toSignedString} />
			</TableCell>

			<TableCell className="w-[10%]">{roundMetricValue("adr", stats.adr)}</TableCell>
			<TableCell className="w-[10%]">{roundMetricValue("kast", stats.kast)}</TableCell>
			<TableCell className="w-[10%]">
				<Performance metric="rating" value={stats.rating} />
			</TableCell>
		</TableRow>
	);
};

function playerUrl(username: string) {
	return `/players/${username}`;
}

const PlayerAvatar: React.FC<{
	src: string;
	alt: string;
	className?: string;
}> = ({ src, alt, className }) => (
	<Avatar className={cn("w-16 h-auto rounded-xs", className)}>
		<AvatarImage src={src} alt={alt} />
		<AvatarFallback>?</AvatarFallback>
	</Avatar>
);

interface Match {
	best_of: number;
	broadcast_start_time: number;
	broadcast_start_time_label: boolean;
	calculate_elo: boolean;
	chat_room_id: string;
	competition_id: string;
	competition_name: string;
	competition_type: string;
	configured_at: number;
	demo_url: string[];
	detailed_results: [
		{
			asc_score: boolean;
			factions: {
				property1: {
					score: number;
				};
				property2: {
					score: number;
				};
			};
			winner: string;
		},
	];
	faceit_url: string;
	finished_at: number;
	game: string;
	group: number;
	match_id: string;
	organizer_id: string;
	region: string;
	results: {
		score: {
			faction1: number;
			faction2: number;
		};
		winner: string;
	};
	round: number;
	scheduled_at: number;
	started_at: number;
	status: "FINISHED" | "ONGOING";
	teams: {
		faction1: {
			avatar: string;
			faction_id: string;
			leader: string;
			name: string;
			roster: [
				{
					anticheat_required: boolean;
					avatar: string;
					game_player_id: string;
					game_player_name: string;
					game_skill_level: number;
					membership: string;
					nickname: string;
					player_id: string;
				},
			];
			roster_v1: null;
			stats: {
				rating: number;
				skillLevel: {
					average: number;
					range: {
						max: number;
						min: number;
					};
				};
				winProbability: number;
			};
			substituted: boolean;
			type: string;
		};
		faction2: {
			avatar: string;
			faction_id: string;
			leader: string;
			name: string;
			roster: [
				{
					anticheat_required: boolean;
					avatar: string;
					game_player_id: string;
					game_player_name: string;
					game_skill_level: number;
					membership: string;
					nickname: string;
					player_id: string;
				},
			];
			roster_v1: null;
			stats: {
				rating: number;
				skillLevel: {
					average: number;
					range: {
						max: number;
						min: number;
					};
				};
				winProbability: number;
			};
			substituted: boolean;
			type: string;
		};
	};
	version: number;
	voting?: {
		location?: {
			entities: {
				class_name: string;
				game_location_id: string;
				guid: string;
				image_lg: string;
				image_sm: string;
				name: string;
			}[];
			pick: string[];
		};
		map?: {
			entities: {
				class_name: string;
				game_location_id: string;
				guid: string;
				image_lg: string;
				image_sm: string;
				name: string;
			}[];
			pick: string[];
		};
	};
}

async function fetchMatch(matchId: string) {
	return await faceitApi.get<Match>(`matches/${matchId}`).json();
}

interface VetoProcessResponse {
	payload: {
		match_id: string;
		tickets: {
			entities: [
				{
					guid: string;
					status: "pick" | "drop";
					random: boolean;
					round: number;
					selected_by: "faction1" | "faction2";
				},
			];
			entity_type: "location" | "map";
			vote_type: "drop_pick";
		}[];
	};
}

async function fetchVetoProcess(matchId: string) {
	return await api
		.get<VetoProcessResponse>(
			`https://corsproxy.io/?${encodeURIComponent(`https://api.faceit.com/democracy/v1/match/${matchId}/history`)}`,
		)
		.json();
}

interface MatchStats {
	rounds: {
		best_of: string;
		competition_id: any;
		game_id: string;
		game_mode: string;
		match_id: string;
		match_round: string;
		played: string;
		round_stats: {
			Region: string;
			Score: string;
			Winner: string;
			Map: string;
			Rounds: string;
		};
		teams: {
			team_id: string;
			premade: boolean;
			team_stats: {
				"Second Half Score": string;
				"Team Win": string;
				"Team Headshots": string;
				Team: string;
				"Final Score": string;
				"Overtime score": string;
				"First Half Score": string;
			};
			players: {
				player_id: string;
				nickname: string;
				player_stats: {
					MVPs: string;
					"Penta Kills": string;
					Deaths: string;
					"K/R Ratio": string;
					"Headshots %": string;
					Kills: string;
					"Double Kills": string;
					"Triple Kills": string;
					"Quadro Kills": string;
					Assists: string;
					Headshots: string;
					Result: string;
					"K/D Ratio": string;
					ADR: string;
				};
			}[];
		}[];
	}[];
}

async function fetchStats(matchId: string) {
	return await faceitApi.get<MatchStats>(`matches/${matchId}/stats`).json();
}

interface Player {
	activated_at: string;
	avatar: string;
	country: string;
	cover_featured_image: string;
	cover_image: string;
	faceit_url: string;
	friends_ids: string[];
	games: Record<
		string,
		{
			faceit_elo: number;
			game_player_id: string;
			game_player_name: string;
			game_profile_id: string;
			region: string;
			regions: any;
			skill_level: number;
			skill_level_label: string;
		}
	>;
	infractions: any;
	membership_type: string;
	memberships: string[];
	new_steam_id: string;
	nickname: string;
	platforms: Record<string, string>;
	player_id: string;
	settings: {
		language: string;
	};
	steam_id_64: string;
	steam_nickname: string;
	verified: boolean;
}

async function fetchPlayer(playerId: string) {
	return await faceitApi.get<Player>(`players/${playerId}`).json();
}
