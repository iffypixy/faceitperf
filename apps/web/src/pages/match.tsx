import { createQueryKeys } from "@lukemorales/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceStrict } from "date-fns";
import { ExternalLinkIcon, UsersIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { match, P } from "ts-pattern";
import { Link, useParams } from "wouter";
import { mapLabel } from "~/entities/map";
import {
	aggregatePlayerPerformance,
	flagUrl,
	Performance,
	PerformanceColor,
	type PlayerMapStatsInput,
	RatingColumnHead,
	roundMetricValue,
} from "~/features/profile";
import type { PlayerPerformance } from "~/features/stats";
import { api, faceitApi } from "~/shared/api";
import { assert } from "~/shared/lib/assert";
import { cn } from "~/shared/lib/cn";
import { toSignedString } from "~/shared/lib/numbers";
import { useDocumentTitle } from "~/shared/lib/use-document-title";
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
} from "~/shared/ui";
import { Spinner } from "~/shared/ui/loader";

const MatchDateFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "long",
	timeStyle: "short",
});

export const MatchPage: React.FC = () => {
	const { matchId } = useParams<{ matchId: string }>();

	const query = useMatchQuery(matchId);
	useVetoProcessQuery(matchId);
	const statsQuery = useStatsQuery(matchId);

	useDocumentTitle(
		query.data?.status === "FINISHED" ? matchTitle(query.data, statsQuery.data) : "Match",
	);

	return (
		<ContentTemplate>
			{match(query)
				.with({ status: "pending" }, () => <Spinner />)
				// A match that hasn't finished has no results or end time to render.
				.with(
					{ status: "error" },
					{ status: "success", data: { status: P.not("FINISHED") } },
					() => (
						<Center className="flex-col gap-4 px-4 text-center">
							<h1 className="text-2xl">This match doesn't exist or isn't available right now.</h1>
							<Link href="/" className="text-primary-foreground">
								Search for a player
							</Link>
						</Center>
					),
				)
				.with({ status: "success" }, (x) => {
					const {
						match_id,
						best_of,
						teams: { faction1, faction2 },
						voting,
						faceit_url,
						results,
						detailed_results,
						started_at,
						finished_at,
					} = x.data;

					const serverInfo = inferServerInfo(voting);
					const score = headlineScore(x.data, statsQuery.data);
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
								<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-start bg-card p-4 sm:p-8">
									<TeamCard avatar={faction1.avatar} name={faction1.name} />
									<div className="self-center">
										<h1 className="sr-only">
											{faction1.name} vs {faction2.name}
										</h1>
										<p className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
											{score ? (
												<>
													<span style={{ color: outcomeColor(results.winner === "faction1") }}>
														{score[0]}
													</span>
													<span className="mx-2 sm:mx-3 text-muted-foreground">:</span>
													<span style={{ color: outcomeColor(results.winner === "faction2") }}>
														{score[1]}
													</span>
												</>
											) : (
												// As wide as a two-digit score, so the team names don't reflow when it arrives.
												<span className="rounded-xs bg-muted-foreground/25 text-transparent animate-pulse">
													00<span className="mx-2 sm:mx-3">:</span>00
												</span>
											)}
										</p>
									</div>
									<TeamCard avatar={faction2.avatar} name={faction2.name} />
									<p className="col-span-3 text-center text-sm text-muted-foreground">
										{MatchDateFormat.format(startDate)}
										<span className="mx-1.5">·</span>
										{formatDistanceStrict(endDate, startDate, { unit: "minute" })}
									</p>
								</div>

								<div className="grid md:grid-cols-2 gap-8">
									<div className="flex flex-col gap-2">
										<h2 className="font-bold">Maps</h2>
										<InfoBlock>Best of {best_of}</InfoBlock>
										<Veto
											type="map"
											matchId={match_id}
											team1={faction1.name}
											team2={faction2.name}
										/>
										<MapHistory
											matchId={match_id}
											mapCount={detailed_results.length}
											team1={team1}
											team2={team2}
										/>
									</div>

									<div className="flex flex-col gap-8">
										<div className="flex flex-col gap-2">
											<h2 className="font-bold">Server</h2>
											<Veto
												type="location"
												matchId={match_id}
												team1={faction1.name}
												team2={faction2.name}
											/>
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
											<h2 className="font-bold">Match room</h2>
											<a
												href={faceit_url.replace("{lang}", "en")}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center justify-between p-4 bg-card rounded-xs text-primary-foreground hover:bg-muted/50 transition-colors"
											>
												Open on FACEIT
												<ExternalLinkIcon className="size-4" />
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

// A best-of-one ends 1:0 in maps, so its headline shows the rounds of that map instead.
// They come from the stats, which may still be loading.
function headlineScore(match: Match, stats: MatchStats | undefined): [number, number] | null {
	if (match.best_of !== 1) return [match.results.score.faction1, match.results.score.faction2];

	const teams = stats?.rounds[0]?.teams;
	if (!teams) return null;

	const rounds = (teamId: string) =>
		Number(teams.find((x) => x.team_id === teamId)?.team_stats["Final Score"]);
	return [rounds(match.teams.faction1.faction_id), rounds(match.teams.faction2.faction_id)];
}

function matchTitle(match: Match, stats: MatchStats | undefined): string {
	const { faction1, faction2 } = match.teams;
	return `${faction1.name} ${headlineScore(match, stats)?.join(":") ?? "vs"} ${faction2.name}`;
}

function outcomeColor(hasWon: boolean): string {
	return hasWon ? PerformanceColor.good : PerformanceColor.poor;
}

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

const TeamCard: React.FC<{ avatar: string; name: string }> = ({ avatar, name }) => (
	<div className="flex flex-col items-center gap-2">
		<TeamAvatar src={avatar} name={name} className="w-12 sm:w-16" />
		<p title={name} className="max-w-full font-bold text-center line-clamp-2 break-words">
			{withBreaks(name)}
		</p>
	</div>
);

// Team names like "team_NaZooie" have no spaces, so a narrow screen would break them
// mid-word. This lets them break after "_" or "-" first.
function withBreaks(name: string): ReactNode[] {
	return name
		.split(/(?<=[_-])/)
		.flatMap((part, index) => (index > 0 ? [<wbr key={index} />, part] : [part]));
}

const Veto: React.FC<{
	type: "map" | "location";
	matchId: string;
	team1: string;
	team2: string;
}> = ({ type, matchId, team1, team2 }) => {
	const vetoProcessQuery = useVetoProcessQuery(matchId);

	return (
		<InfoBlock>
			{match(vetoProcessQuery)
				.with({ status: "pending" }, () => <Spinner />)
				.with({ status: "error" }, () => <NoVeto />)
				.with({ status: "success" }, (x) => {
					const veto = x.data.payload.tickets.find((x) => x.entity_type === type);
					if (!veto) return <NoVeto />;

					return (
						<ol className="list-decimal pl-4">
							{veto.entities.map((x, index, { length }) => {
								const team = match(x.selected_by)
									.with("faction1", () => team1)
									.with("faction2", () => team2)
									.exhaustive();

								const action = match(x.status)
									.with("drop", () => "removed")
									.with("pick", () => "picked")
									.exhaustive();

								const entity = match(type)
									.with("map", () => mapLabel(x.guid))
									.with("location", () => x.guid)
									.exhaustive();

								const text =
									index === length - 1 ? `${entity} was left over` : `${team} ${action} ${entity}`;

								return <li key={x.guid}>{text}</li>;
							})}
						</ol>
					);
				})
				.exhaustive()}
		</InfoBlock>
	);
};

// Hubs and tournaments often skip the veto, so its absence isn't an error.
const NoVeto: React.FC = () => (
	<p className="text-muted-foreground">No veto available for this match.</p>
);

interface TeamEntry {
	id: string;
	avatar: string;
	name: string;
}

const MapHistory: React.FC<{
	matchId: string;
	mapCount: number;
	team1: TeamEntry;
	team2: TeamEntry;
}> = ({ matchId, mapCount, team1, team2 }) => {
	const statsQuery = useStatsQuery(matchId);

	return match(statsQuery)
		.with({ status: "pending" }, () => (
			<ul>
				{Array.from({ length: mapCount }).map((_, index) => (
					<MapSkeleton key={index} />
				))}
			</ul>
		))
		.with({ status: "error" }, () => (
			<InfoBlock>
				<ErrorMessage />
			</InfoBlock>
		))
		.with({ status: "success" }, (x) => (
			<ul>
				{x.data.rounds.map((x, index) => {
					const map = x.round_stats.Map ?? "tba";
					const stats1 = x.teams.find((x) => x.team_id === team1.id)?.team_stats;
					const stats2 = x.teams.find((x) => x.team_id === team2.id)?.team_stats;
					const hadOvertime =
						Number(stats1?.["Overtime score"]) > 0 || Number(stats2?.["Overtime score"]) > 0;

					return (
						<li key={index}>
							<div className="flex flex-col">
								<div className="relative aspect-[97/10] bg-card">
									<img src={mapImageUrl(map)} alt="" className="w-full" />
									<p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-shadow-image">
										{mapLabel(map)}
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
										<p className="text-center text-sm text-muted-foreground tabular-nums">
											({stats1?.["First Half Score"]}:{stats2?.["First Half Score"]};{" "}
											{stats1?.["Second Half Score"]}:{stats2?.["Second Half Score"]})
											{hadOvertime &&
												` (${stats1?.["Overtime score"]}:${stats2?.["Overtime score"]})`}
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

// Mirrors a played map's banner and result, so the sections below don't move when stats arrive.
const MapSkeleton: React.FC = () => (
	<li className="flex flex-col animate-pulse">
		<div className="aspect-[97/10] bg-card" />
		<InfoBlock>
			<div className="flex h-12 items-center justify-between">
				<div className="h-4 w-24 rounded-xs bg-muted-foreground/25" />
				<div className="h-4 w-24 rounded-xs bg-muted-foreground/25" />
			</div>
		</InfoBlock>
	</li>
);

function mapImageUrl(map: string): string {
	return `/hltv/maps/${map.slice(3)}.png`;
}

const TeamMapResult: React.FC<{
	avatar: string;
	name: string;
	score: number;
	outcome: "win" | "loss";
	reverse?: boolean;
}> = ({ avatar, name, score, outcome, reverse }) => (
	<div className={cn("flex items-start gap-3", reverse && "flex-row-reverse text-right")}>
		<TeamAvatar src={avatar} name={name} className="w-8" />
		<div className="flex flex-col min-w-0">
			<p
				title={name}
				className={cn("truncate", outcome === "win" ? "font-bold" : "text-muted-foreground")}
			>
				{name}
			</p>
			<p
				style={{ color: outcomeColor(outcome === "win") }}
				className={cn("tabular-nums", outcome === "win" && "font-bold")}
			>
				{score}
			</p>
		</div>
	</div>
);

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

			const player = playerByIdMap.get(p.player_id);
			assert(player);

			player.stats.push({ ...p.player_stats, Rounds: map.round_stats.Rounds });
		}
	}

	return Array.from(playerByIdMap.entries())
		.map(([id, p]) => ({
			id,
			nickname: p.nickname,
			stats: aggregatePlayerPerformance(p.stats),
		}))
		.sort((a, b) => b.stats.rating - a.stats.rating);
}

const MatchStats: React.FC<{
	matchId: string;
	team1: TeamEntry;
	team2: TeamEntry;
}> = ({ matchId, team1, team2 }) => {
	const query = useStatsQuery(matchId);

	const [mapFilter, setMapFilter] = useState("all");

	return match(query)
		.with({ status: "pending" }, () => <Spinner />)
		.with({ status: "error" }, () => <ErrorMessage />)
		.with({ status: "success" }, (x) => {
			const rounds =
				mapFilter === "all"
					? x.data.rounds
					: x.data.rounds.filter((x) => x.round_stats.Map === mapFilter);

			return (
				<div className="flex flex-col gap-2">
					<InfoBlock>
						<ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
							{["all", ...x.data.rounds.map((x) => x.round_stats.Map)].map((x) => (
								<li
									key={x}
									className={cn("text-primary-foreground", x === mapFilter && "font-bold")}
								>
									<button
										type="button"
										onClick={() => setMapFilter(x)}
										className="active:opacity-70"
									>
										{x === "all" ? "All maps" : mapLabel(x)}
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
}> = ({ name, avatar, players }) => (
	<Table className="min-w-[36rem]">
		<TableHeader>
			<TableRow className="[&>th]:text-center">
				<TableHead>
					<div className="flex items-center gap-2">
						<TeamAvatar src={avatar} name={name} className="w-8" />
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
			{players.map((player) => (
				<PlayerRow key={player.id} {...player} />
			))}
		</TableBody>
	</Table>
);

const PlayerRow: React.FC<{
	id: string;
	nickname: string;
	stats: PlayerPerformance;
}> = ({ id, nickname, stats }) => {
	const { data } = usePlayerQuery(id);
	const country = data?.country;

	return (
		<TableRow className="[&>td]:text-center">
			<TableCell>
				<div className="flex items-center gap-2">
					{country && (
						<img src={flagUrl(country)} alt={country} className="w-6 border border-background" />
					)}
					<Link href={playerUrl(nickname)} className="font-bold text-primary-foreground">
						{nickname}
					</Link>
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

const TeamAvatar: React.FC<{
	src: string;
	name: string;
	className?: string;
}> = ({ src, name, className }) => (
	<Avatar className={cn("h-auto shrink-0 rounded-xs", className)}>
		<AvatarImage src={src} alt={name} />
		<AvatarFallback>
			<UsersIcon className="size-1/2 text-muted-foreground" />
		</AvatarFallback>
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
	// One entry per map played.
	detailed_results: {
		asc_score: boolean;
		factions: Record<"faction1" | "faction2", { score: number }>;
		winner: string;
	}[];
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
	return await api.get<VetoProcessResponse>(`/faceit/veto/${matchId}`).json();
}

interface MatchStats {
	rounds: {
		best_of: string;
		competition_id: unknown;
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
			regions: unknown;
			skill_level: number;
			skill_level_label: string;
		}
	>;
	infractions: unknown;
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
