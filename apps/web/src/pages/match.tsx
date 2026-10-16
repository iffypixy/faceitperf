import { createQueryKeys } from "@lukemorales/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceStrict } from "date-fns";
import { ExternalLinkIcon, UsersIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { match, P } from "ts-pattern";
import { Link, useParams } from "wouter";
import { mapLabel } from "~/entities/map";
import {
	countryName,
	flagUrl,
	Performance,
	PerformanceColor,
	RatingColumnHead,
	roundMetricValue,
	StackedColumnHead,
} from "~/features/profile";
import {
	aggregatePlayerPerformance,
	type PlayerMapStatsInput,
	type PlayerPerformance,
} from "~/features/stats";
import { api, faceitApi } from "~/shared/api";
import { assert } from "~/shared/lib/assert";
import { cn } from "~/shared/lib/cn";
import { useHistoryState } from "~/shared/lib/history-state";
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
	const statsQuery = useStatsQuery(matchId);
	// The page fades in over its skeleton; a match already loaded shows at once.
	const [startedEmpty] = useState(query.isPending);

	useDocumentTitle(
		query.data?.status === "FINISHED" ? matchTitle(query.data, statsQuery.data) : "Match",
	);

	return (
		<ContentTemplate>
			{match(query)
				.with({ status: "pending" }, () => <MatchSkeleton />)
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
						competition_name,
						teams: { faction1, faction2 },
						voting,
						faceit_url,
						results,
						detailed_results,
						started_at,
						finished_at,
					} = x.data;

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
							<div
								className={cn(
									"flex flex-col gap-8",
									startedEmpty && "animate-in fade-in-0 duration-150 ease-out",
								)}
							>
								<div className={MatchHeaderGrid}>
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
													<span className="mx-1 sm:mx-3 text-muted-foreground">:</span>
													<span style={{ color: outcomeColor(results.winner === "faction2") }}>
														{score[1]}
													</span>
												</>
											) : (
												<ScoreSkeleton />
											)}
										</p>
									</div>
									<TeamCard avatar={faction2.avatar} name={faction2.name} />
									{/* The event gets its own line, as on HLTV, so neither line breaks mid-thought. */}
									<div className="col-span-3 flex flex-col items-center gap-0.5 text-center text-sm text-muted-foreground">
										{competition_name && (
											<p className="font-medium text-foreground/80">{competition_name}</p>
										)}
										<p>
											{MatchDateFormat.format(startDate)}
											<span className="mx-1.5">·</span>
											{formatDistanceStrict(endDate, startDate, { unit: "minute" })}
										</p>
									</div>
								</div>

								<div className="grid md:grid-cols-2 gap-8">
									<div className="flex flex-col gap-2">
										<h2 className="font-bold">Maps</h2>
										<InfoBlock>Best of {best_of}</InfoBlock>
										<Veto
											type="map"
											matchId={match_id}
											poolSize={voting?.map?.entities.length ?? 0}
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
										<Server
											matchId={match_id}
											vote={voting?.location}
											team1={faction1.name}
											team2={faction2.name}
										/>

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

type ServerVote = NonNullable<Match["voting"]>["location"];

// Teams used to vote on the server, and the vote named it. Since late July 2026 the EU, NA and SEA
// queues assign the server without one, so it's asked from FACEIT's own match API instead.
const Server: React.FC<{
	matchId: string;
	vote: ServerVote;
	team1: string;
	team2: string;
}> = ({ matchId, vote, team1, team2 }) => {
	const assignedQuery = useAssignedServerQuery(matchId, !vote);
	const location = vote ? vote.pick[0] : assignedQuery.data;

	if (!location && !assignedQuery.isPending) return null;

	return (
		<div className="flex flex-col gap-2">
			<h2 className="font-bold">Server</h2>
			<Veto
				type="location"
				matchId={matchId}
				poolSize={vote?.entities.length ?? 0}
				team1={team1}
				team2={team2}
			/>
			<InfoBlock>
				{location ? (
					<ServerName location={location} />
				) : (
					<div className="h-6 flex items-center animate-pulse">
						<div className="h-4 w-32 rounded-xs bg-muted-foreground/25" />
					</div>
				)}
			</InfoBlock>
		</div>
	);
};

const ServerName: React.FC<{ location: string }> = ({ location }) => {
	const { name, country } = serverLocation(location);

	return (
		<div className="flex items-center gap-2">
			{country && (
				<img
					src={flagUrl(country)}
					// The name is written beside it.
					alt=""
					width={30}
					height={20}
					className="border border-background"
				/>
			)}
			<p>{name}</p>
		</div>
	);
};

// FACEIT's servers by id, named and flagged as its server votes showed them (gathered from 344
// matches in every region). An assigned server comes as the id alone.
const ServerLocations: Record<string, { name: string; country: string }> = {
	Germany: { name: "Germany", country: "de" },
	Netherlands: { name: "Netherlands", country: "nl" },
	France: { name: "France", country: "fr" },
	UK: { name: "UK", country: "gb" },
	Sweden: { name: "Sweden", country: "se" },
	Finland: { name: "Finland", country: "fi" },
	Moscow: { name: "Moscow", country: "ru" },
	Novosibirsk: { name: "Novosibirsk", country: "ru" },
	Yekaterinburg: { name: "Yekaterinburg", country: "ru" },
	Vladivostok: { name: "Vladivostok", country: "ru" },
	Kazakhstan: { name: "Kazakhstan", country: "kz" },
	Chicago: { name: "Chicago", country: "us" },
	Dallas: { name: "Dallas", country: "us" },
	Denver: { name: "Denver", country: "us" },
	SanJose: { name: "San Jose", country: "us" },
	Virginia: { name: "Virginia", country: "us" },
	"ESEA-NewYork": { name: "New York", country: "us" },
	SaoPaulo: { name: "São Paulo", country: "br" },
	BuenosAires: { name: "Buenos Aires", country: "ar" },
	Chile: { name: "Santiago", country: "cl" },
	Sydney: { name: "Sydney", country: "au" },
	Singapore: { name: "Singapore", country: "sg" },
};

/** A server id's name and flag. A server FACEIT added since keeps its id, spaced out, and no flag. */
function serverLocation(location: string): { name: string; country: string | null } {
	return (
		ServerLocations[location] ?? {
			name: location.replace(/([a-z])([A-Z])/g, "$1 $2"),
			country: null,
		}
	);
}

// Phones narrow the gaps around the score, so a 360px screen still fits names like "team__TwentyOne_".
const MatchHeaderGrid =
	"grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-4 sm:gap-x-4 items-start bg-card p-4 sm:p-8";

// As wide as a two-digit score, so the team names don't reflow when it arrives.
const ScoreSkeleton: React.FC = () => (
	<span className="rounded-xs bg-muted-foreground/25 text-transparent animate-pulse">
		00<span className="mx-1 sm:mx-3">:</span>00
	</span>
);

// The header's shape while the match loads, rather than a lone spinner on an empty page.
const MatchSkeleton: React.FC = () => (
	<Container>
		<div className={MatchHeaderGrid}>
			<TeamCardSkeleton />
			<p className="self-center text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
				<ScoreSkeleton />
			</p>
			<TeamCardSkeleton />
			<div className="col-span-3 h-5 w-72 max-w-full mx-auto rounded-xs bg-muted-foreground/25 animate-pulse" />
		</div>
	</Container>
);

const TeamCardSkeleton: React.FC = () => (
	<div className="flex flex-col items-center gap-2 animate-pulse">
		<div className="size-12 sm:size-16 rounded-xs bg-muted-foreground/25" />
		<div className="h-6 w-28 max-w-full rounded-xs bg-muted-foreground/25" />
	</div>
);

const TeamCard: React.FC<{ avatar: string; name: string }> = ({ avatar, name }) => (
	<div className="flex flex-col items-center gap-2">
		<TeamAvatar src={avatar} alt="" className="w-12 sm:w-16" />
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

// FACEIT holds a veto only when more than one option was in the pool; matchmaking often
// picks the map itself. Asking anyway costs a Function request, and those are capped daily.
// Like HLTV, a match without a veto shows nothing in its place.
const Veto: React.FC<{
	type: "map" | "location";
	matchId: string;
	poolSize: number;
	team1: string;
	team2: string;
}> = ({ type, matchId, poolSize, team1, team2 }) => {
	const hasVeto = poolSize > 1;
	const vetoProcessQuery = useVetoProcessQuery(matchId, hasVeto);

	if (!hasVeto) return null;

	return match(vetoProcessQuery)
		.with({ status: "pending" }, () => (
			// A veto has one line per option in the pool, so nothing below moves when it arrives.
			<InfoBlock>
				<ol className="flex flex-col animate-pulse">
					{Array.from({ length: poolSize }).map((_, index) => (
						<li key={index} className="h-6 flex items-center">
							<div className="h-4 w-2/3 rounded-xs bg-muted-foreground/25" />
						</li>
					))}
				</ol>
			</InfoBlock>
		))
		.with({ status: "error" }, () => null)
		.with({ status: "success" }, (x) => {
			const veto = x.data.payload.tickets.find((x) => x.entity_type === type);
			if (!veto) return null;

			return (
				<InfoBlock>
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
								.with("location", () => serverLocation(x.guid).name)
								.exhaustive();

							const text =
								index === length - 1 ? `${entity} was left over` : `${team} ${action} ${entity}`;

							return <li key={x.guid}>{text}</li>;
						})}
					</ol>
				</InfoBlock>
			);
		})
		.exhaustive();
};

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
		<TeamAvatar src={avatar} alt={name} className="w-8" />
		<div className="flex flex-col min-w-0">
			<p
				title={name}
				// Phones have room for the avatar and score only; the avatar's alt text keeps the name.
				className={cn(
					"truncate max-sm:hidden",
					outcome === "win" ? "font-bold" : "text-muted-foreground",
				)}
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
	assignedServerByMatchId: (matchId: string) => ["assignedServer", matchId],
	statsByMatchId: (matchId: string) => ["stats", matchId],
	playerById: (playerId: string) => ["player", playerId],
});

function useMatchQuery(matchId: string) {
	return useQuery({
		queryKey: queryKeys.matchById(matchId).queryKey,
		queryFn: () => fetchMatch(matchId),
	});
}

function useVetoProcessQuery(matchId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.vetoProcessByMatchId(matchId).queryKey,
		queryFn: () => fetchVetoProcess(matchId),
		enabled,
	});
}

function useAssignedServerQuery(matchId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.assignedServerByMatchId(matchId).queryKey,
		queryFn: () => fetchAssignedServer(matchId),
		enabled,
		// A finished match's server never changes, and each ask is a Function request.
		staleTime: Infinity,
		retry: false,
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
	assists: number;
	details: PlayerDetails | null;
}

// FACEIT reports these for CS2 matches only.
interface PlayerDetails {
	firstKills: number;
	firstDeaths: number;
	sniperKills: number;
	multiKills: number;
	utilityDamage: number;
}

type PlayerMatchStats =
	MatchStats["rounds"][number]["teams"][number]["players"][number]["player_stats"];

function buildPlayers(maps: MatchStats["rounds"], teamId: string): Array<PlayerEntry> {
	const playerByIdMap = new Map<
		string,
		{
			nickname: string;
			stats: PlayerMapStatsInput[];
			assists: number;
			details: PlayerDetails | null;
		}
	>();

	for (const map of maps) {
		const team = map.teams.find((t) => t.team_id === teamId);
		if (!team) continue;

		for (const p of team.players) {
			if (!playerByIdMap.has(p.player_id))
				playerByIdMap.set(p.player_id, {
					nickname: p.nickname,
					stats: [],
					assists: 0,
					details: {
						firstKills: 0,
						firstDeaths: 0,
						sniperKills: 0,
						multiKills: 0,
						utilityDamage: 0,
					},
				});

			const player = playerByIdMap.get(p.player_id);
			assert(player);

			player.stats.push({ ...p.player_stats, Rounds: map.round_stats.Rounds });
			player.assists += Number(p.player_stats.Assists);
			player.details = addDetails(player.details, p.player_stats);
		}
	}

	return Array.from(playerByIdMap.entries())
		.map(([id, p]) => ({
			id,
			nickname: p.nickname,
			stats: aggregatePlayerPerformance(p.stats),
			assists: p.assists,
			details: p.details,
		}))
		.sort((a, b) => b.stats.rating - a.stats.rating);
}

function addDetails(details: PlayerDetails | null, stats: PlayerMatchStats): PlayerDetails | null {
	if (!details || stats["First Kills"] === undefined) return null;

	return {
		firstKills: details.firstKills + Number(stats["First Kills"]),
		// Each round's opening duel counts as an entry for both players, so the entries a player
		// didn't win are the rounds they died first.
		firstDeaths: details.firstDeaths + Number(stats["Entry Count"]) - Number(stats["Entry Wins"]),
		sniperKills: details.sniperKills + Number(stats["Sniper Kills"]),
		multiKills:
			details.multiKills +
			Number(stats["Double Kills"]) +
			Number(stats["Triple Kills"]) +
			Number(stats["Quadro Kills"]) +
			Number(stats["Penta Kills"]),
		utilityDamage: details.utilityDamage + Number(stats["Utility Damage"]),
	};
}

type StatsView = "overview" | "detailed";

const MatchStats: React.FC<{
	matchId: string;
	team1: TeamEntry;
	team2: TeamEntry;
}> = ({ matchId, team1, team2 }) => {
	const query = useStatsQuery(matchId);

	const [mapFilter, setMapFilter] = useState("all");
	const [view, setView] = useHistoryState<StatsView>("statsView", "overview");
	// The player whose history row opened this match, set by that row's link.
	const [fromPlayer] = useHistoryState<string | null>("fromPlayer", null);

	return match(query)
		.with({ status: "pending" }, () => <Spinner />)
		.with({ status: "error" }, () => <ErrorMessage />)
		.with({ status: "success" }, (x) => {
			const rounds =
				mapFilter === "all"
					? x.data.rounds
					: x.data.rounds.filter((x) => x.round_stats.Map === mapFilter);
			const players1 = buildPlayers(rounds, team1.id);
			const players2 = buildPlayers(rounds, team2.id);
			const hasDetails = [...players1, ...players2].every((p) => p.details);
			const shownView = hasDetails ? view : "overview";

			return (
				<div className="flex flex-col gap-2">
					<InfoBlock>
						<div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
							<Switcher
								options={["all", ...x.data.rounds.map((x) => x.round_stats.Map)].map((x) => ({
									value: x,
									label: x === "all" ? "All maps" : mapLabel(x),
								}))}
								selected={mapFilter}
								onSelect={setMapFilter}
							/>
							{hasDetails && (
								<Switcher
									options={[
										{ value: "overview", label: "Overview" },
										{ value: "detailed", label: "Detailed" },
									]}
									selected={view}
									onSelect={setView}
								/>
							)}
						</div>
					</InfoBlock>

					<TopPerformers players={[...players1, ...players2]} />

					<div className="flex flex-col gap-4">
						<PlayerTable
							avatar={team1.avatar}
							name={team1.name}
							players={players1}
							view={shownView}
							highlighted={fromPlayer}
						/>
						<PlayerTable
							avatar={team2.avatar}
							name={team2.name}
							players={players2}
							view={shownView}
							highlighted={fromPlayer}
						/>
					</div>
				</div>
			);
		})
		.exhaustive();
};

const Switcher = <T extends string>({
	options,
	selected,
	onSelect,
}: {
	options: Array<{ value: T; label: string }>;
	selected: T;
	onSelect: (value: T) => void;
}) => (
	<ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
		{options.map((x) => (
			<li
				key={x.value}
				className={cn("text-primary-foreground", x.value === selected && "font-bold")}
			>
				{/* The bold copy keeps each option as wide as when selected, so picking one moves nothing. */}
				<button
					type="button"
					onClick={() => onSelect(x.value)}
					className="inline-grid py-2 -my-2 active:opacity-70"
				>
					<span className="col-start-1 row-start-1">{x.label}</span>
					<span aria-hidden className="col-start-1 row-start-1 invisible font-bold">
						{x.label}
					</span>
				</button>
			</li>
		))}
	</ul>
);

// HLTV's match leaders. A leader everyone ties at zero (no AWP kills, say) isn't shown.
const Leaders: Array<{
	label: string;
	value: (x: PlayerEntry) => number | undefined;
	format: (value: number) => string;
}> = [
	{ label: "Most kills", value: (x) => x.stats.kills, format: String },
	{ label: "Highest ADR", value: (x) => x.stats.adr, format: (x) => roundMetricValue("adr", x) },
	{ label: "Most assists", value: (x) => x.assists, format: String },
	{ label: "Most AWP kills", value: (x) => x.details?.sniperKills, format: String },
	{ label: "Most first kills", value: (x) => x.details?.firstKills, format: String },
	{
		label: "Best rating",
		value: (x) => x.stats.rating,
		format: (x) => roundMetricValue("rating", x),
	},
];

const TopPerformers: React.FC<{ players: PlayerEntry[] }> = ({ players }) => {
	const leaders = Leaders.flatMap(({ label, value, format }) => {
		const leader = players.reduce<{ player: PlayerEntry; value: number } | null>((best, player) => {
			const v = value(player);
			return v !== undefined && v > (best?.value ?? 0) ? { player, value: v } : best;
		}, null);
		return leader ? [{ label, text: format(leader.value), player: leader.player }] : [];
	});

	return (
		// Columns follow the number of leaders, so none sits alone in a row.
		<div
			className={cn(
				"grid grid-cols-2 gap-2",
				leaders.length === 4 && "sm:grid-cols-4",
				leaders.length === 5 && "sm:grid-cols-5",
				leaders.length === 6 && "sm:grid-cols-3 md:grid-cols-6",
			)}
		>
			{leaders.map(({ label, text, player }) => (
				<div
					key={label}
					className="flex flex-col gap-1 min-w-0 p-4 md:py-3 bg-card rounded-xs max-sm:odd:last:col-span-2"
				>
					<p className="text-muted-foreground text-sm md:text-xs uppercase tracking-wide">
						{label}
					</p>
					<p className="text-2xl md:text-xl font-bold">{text}</p>
					<PlayerName id={player.id} nickname={player.nickname} />
				</div>
			))}
		</div>
	);
};

const PlayerTable: React.FC<{
	name: string;
	avatar: string;
	players: Array<PlayerEntry>;
	view: StatsView;
	highlighted: string | null;
}> = ({ name, avatar, players, view, highlighted }) => {
	const columns =
		view === "detailed"
			? DetailedColumns
			: OverviewColumns.filter((x) => x !== FirstKillsColumn || players.every((p) => p.details));

	// The overview fits phones as long as names aren't cut, so opening duels give way there. The
	// detailed view's headers don't fit beside names, so it scrolls sideways with the names pinned.
	const nameClassName =
		view === "overview"
			? "max-sm:w-full max-sm:max-w-0"
			: "max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:min-w-36 max-sm:border-r-0 max-sm:shadow-[inset_-1px_0_0_var(--color-border)] max-sm:bg-[color-mix(in_srgb,var(--color-card)_50%,var(--color-background))] max-sm:[tr:nth-child(even)>&]:bg-card";
	const columnClassName = (column: Column) =>
		cn("sm:w-[11%]", view === "overview" && column === FirstKillsColumn && "max-sm:hidden");

	return (
		<Table className={cn("sm:min-w-[36rem]", view === "detailed" && "max-sm:overflow-visible")}>
			<TableHeader>
				<TableRow className="[&>th]:text-center">
					<TableHead
						className={cn(nameClassName, "max-sm:bg-card sm:text-base sm:text-foreground")}
					>
						<div className="flex items-center gap-2">
							<TeamAvatar src={avatar} alt="" className="w-6 sm:w-8" />
							<p className="font-bold text-left max-sm:whitespace-normal max-sm:leading-tight max-sm:line-clamp-2 max-sm:wrap-anywhere">
								{withBreaks(name)}
							</p>
						</div>
					</TableHead>
					{columns.map((column, index) => (
						<TableHead key={index} className={columnClassName(column)}>
							{column.head}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>

			<TableBody>
				{players.map((player) => (
					<TableRow
						key={player.id}
						className={cn(
							"[&>td]:text-center",
							// In the profile card's blue-grey, so you find yourself among the ten at a glance.
							player.id === highlighted && "odd:bg-primary even:bg-primary hover:bg-primary",
						)}
					>
						<TableCell
							className={cn(
								nameClassName,
								// The pinned name cell paints its own background on phones.
								player.id === highlighted &&
									view === "detailed" &&
									"max-sm:bg-primary max-sm:[tr:nth-child(even)>&]:bg-primary",
							)}
						>
							<PlayerName id={player.id} nickname={player.nickname} />
						</TableCell>
						{columns.map((column, index) => (
							<TableCell key={index} className={columnClassName(column)}>
								{column.cell(player)}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
};

interface Column {
	head: ReactNode;
	cell: (player: PlayerEntry) => ReactNode;
}

const KillsDeathsColumn: Column = {
	head: "K–D",
	cell: (x) => `${x.stats.kills}–${x.stats.deaths}`,
};

const DiffColumn: Column = {
	head: "+/-",
	cell: (x) => (
		<Performance metric="kdDiff" value={x.stats.kills - x.stats.deaths} render={toSignedString} />
	),
};

// HLTV's "FK diff": opening duels won minus lost.
const FirstKillsColumn: Column = {
	head: "FK diff",
	cell: (x) =>
		x.details && (
			<Performance
				metric="kdDiff"
				value={x.details.firstKills - x.details.firstDeaths}
				render={toSignedString}
			/>
		),
};

const AdrColumn: Column = { head: "ADR", cell: (x) => roundMetricValue("adr", x.stats.adr) };

const KastColumn: Column = {
	head: (
		<>
			KAST<span className="max-sm:hidden"> %</span>
		</>
	),
	cell: (x) => roundMetricValue("kast", x.stats.kast),
};

const RatingColumn: Column = {
	head: <RatingColumnHead />,
	cell: (x) => <Performance metric="rating" value={x.stats.rating} />,
};

const OverviewColumns: Column[] = [
	KillsDeathsColumn,
	DiffColumn,
	FirstKillsColumn,
	AdrColumn,
	KastColumn,
	RatingColumn,
];

// The stats the overview leaves out, in the same six columns, so switching views keeps the grid.
const DetailedColumns: Column[] = [
	{ head: "Assists", cell: (x) => x.assists },
	{ head: "FK–FD", cell: (x) => x.details && `${x.details.firstKills}–${x.details.firstDeaths}` },
	{ head: <StackedColumnHead title="AWP" detail="kills" />, cell: (x) => x.details?.sniperKills },
	{ head: <StackedColumnHead title="Multi" detail="kills" />, cell: (x) => x.details?.multiKills },
	{
		head: <StackedColumnHead title="Utility" detail="damage" />,
		cell: (x) => x.details?.utilityDamage,
	},
	RatingColumn,
];

const PlayerName: React.FC<{ id: string; nickname: string }> = ({ id, nickname }) => {
	const country = usePlayerQuery(id).data?.country;

	return (
		<div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
			{/* The flag's place is kept while the player loads, so the name doesn't slide over. */}
			<span className="w-5 sm:w-6 shrink-0">
				{country && (
					<img
						src={flagUrl(country)}
						alt={countryName(country)}
						width={30}
						height={20}
						className="block w-full border border-background"
					/>
				)}
			</span>
			<Link
				href={playerUrl(nickname)}
				title={nickname}
				className="min-w-0 truncate font-bold text-primary-foreground"
			>
				{nickname}
			</Link>
		</div>
	);
};

function playerUrl(username: string) {
	return `/players/${username}`;
}

// `alt` is empty where the team's name is written beside the avatar.
const TeamAvatar: React.FC<{
	src: string;
	alt: string;
	className?: string;
}> = ({ src, alt, className }) => (
	<Avatar className={cn("h-auto shrink-0 rounded-xs", className)}>
		<AvatarImage src={src} alt={alt} />
		{/* Only a slow image shows the placeholder; a quick one never flashes it. */}
		<AvatarFallback delayMs={400}>
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

async function fetchAssignedServer(matchId: string) {
	const { location } = await api.get<{ location: string }>(`/faceit/location/${matchId}`).json();
	return location;
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
					// The ones below are missing from CS:GO matches.
					"First Kills"?: string;
					"Entry Count"?: string;
					"Entry Wins"?: string;
					"Sniper Kills"?: string;
					"Utility Damage"?: string;
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
