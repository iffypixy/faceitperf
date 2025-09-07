import React, {
	CSSProperties,
	FormEvent,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { match, P } from "ts-pattern";
import { addMonths, format, getYear, isAfter, isToday, isYesterday, parseISO } from "date-fns";
import { AsteriskIcon, CircleAlert, InfoIcon, ShieldUserIcon, XIcon } from "lucide-react";
import { createQueryKeys } from "@lukemorales/query-key-factory";

import {
	Container,
	ContentTemplate,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/ui";
import { api, faceitApi, FaceitQueryLimit } from "@shared/api";
import { Spinner } from "@shared/ui/loader";
import { clamp } from "@shared/lib/numbers";
import { Button } from "@shared/ui/button";
import { assert } from "@shared/lib/assert";
import { cn } from "@shared/lib/cn";
import { tc } from "@shared/lib/async";
import { Env } from "@shared/env";
import { computePlayerPerformance, type PlayerPerformance, type MapStats } from "@features/stats";
import { type Map, Maps, MapAlias, MapLabel } from "@entities/map";
import { PageTitle } from "@shared/lib/title";

const Heading: React.FC = () => (
	<h1 className="text-3xl text-center">
		Your <span className="text-brand-faceit font-medium">FACEIT</span> stats,{" "}
		<span className="text-brand-hltv font-medium">HLTV</span> style.
	</h1>
);

export const ProfileSearch: React.FC = () => {
	const { username } = useParams<{ username: string }>();

	return (
		<ContentTemplate>
			<PageTitle title={`${username ?? "Home"}`} />

			<Container>
				<div className="flex flex-col gap-16">
					<div className="flex flex-col items-center gap-4">
						<Heading />
						<ProfileSearchForm initialValue={username ?? ""} />
					</div>

					{username && <Profile username={username} />}
				</div>
			</Container>
		</ContentTemplate>
	);
};

const TimeFilterPresets = [
	"lastMonth",
	"lastThreeMonths",
	"lastSixMonths",
	"lastTwelveMonths",
] as const;
type TimeFilterPreset = (typeof TimeFilterPresets)[number];

const TimeFilterPresetStartDate: Record<TimeFilterPreset, (x: Date) => Date> = {
	lastMonth: (x) => addMonths(x, -1),
	lastThreeMonths: (x) => addMonths(x, -3),
	lastSixMonths: (x) => addMonths(x, -6),
	lastTwelveMonths: (x) => addMonths(x, -12),
};

type TimeFilterValue = "all" | TimeFilterPreset | number;

function timeFilterValues(startDate: Date | null): TimeFilterValue[] {
	const res: TimeFilterValue[] = ["all"];

	if (!startDate) return res;

	const now = new Date();
	for (const preset of TimeFilterPresets) {
		const PresetStartDate = TimeFilterPresetStartDate[preset](now);
		if (isAfter(startDate, PresetStartDate)) continue;
		res.push(preset);
	}

	const startYear = startDate.getUTCFullYear();
	for (let year = now.getUTCFullYear(); year >= startYear; year--) res.push(year);

	return res;
}

type MapFilterValue = "all" | Map;

const GameVersions = ["cs2", "csgo"] as const;
type GameVersion = (typeof GameVersions)[number];

interface FilterState {
	time: TimeFilterValue;
	map: MapFilterValue;
	version: GameVersion;
}

const Profile: React.FC<{
	username: string;
}> = ({ username }) => {
	const [filter, setFilter] = useState<FilterState>({
		time: "all",
		map: "all",
		version: "cs2",
	});

	const playerQuery = usePlayerQuery(username.trim());
	const mapsQuery = useMapsQuery(playerQuery.data?.player_id ?? null, filter.version);

	const filteredMaps = useMemo(() => {
		if (!mapsQuery.data) return null;
		return filterMaps(mapsQuery.data, filter);
	}, [mapsQuery.data, filter]);

	if (mapsQuery.isError)
		return (
			<p role="alert" className="text-error text-xl inline-flex items-center mx-auto">
				<CircleAlert className="h-5 w-5 me-2" />
				We couldn't load the maps. Try refreshing?
			</p>
		);

	return match(playerQuery)
		.with({ status: "error" }, () => null)
		.with({ status: "pending" }, () => <Spinner />)
		.with({ status: "success" }, (x) => (
			<div className="w-full flex flex-col mx-auto gap-4 animate-in fade-in-25 zoom-in-50 duration-500">
				<div className="flex flex-col gap-2">
					<FilterGroup
						maps={mapsQuery.data ?? null}
						selectedTime={filter.time}
						selectedMap={filter.map}
						selectedVersion={filter.version}
						onTimeChange={(time) => setFilter({ ...filter, time })}
						onMapChange={(map) => setFilter({ ...filter, map })}
						onVersionChange={(version) => setFilter({ ...filter, version })}
					/>
					<PlayerCard player={x.data} maps={filteredMaps} />
				</div>

				<MapHistory maps={filteredMaps} />
			</div>
		))
		.exhaustive();
};

function filterMaps(maps: PlayerMapStats[], filter: FilterState): PlayerMapStats[] {
	let res: PlayerMapStats[] = [];

	res = match(filter.time)
		.with("all", () => maps)
		.with("lastMonth", "lastThreeMonths", "lastSixMonths", "lastTwelveMonths", (x) => {
			const now = new Date();
			const PresetStartDate = TimeFilterPresetStartDate[x](now);

			return maps.filter((map) => isAfter(parseISO(map["Created At"]), PresetStartDate));
		})
		.with(P.number, (x) => maps.filter((map) => getYear(parseISO(map["Created At"])) === x))
		.exhaustive();

	res = match(filter.map)
		.with("all", () => res)
		.with(P.string, (x) => res.filter((map) => map.Map === x))
		.exhaustive();

	return res;
}

const FilterGroup: React.FC<{
	maps: PlayerMapStats[] | null;
	selectedTime: TimeFilterValue;
	selectedMap: MapFilterValue;
	selectedVersion: GameVersion;
	onTimeChange: (value: TimeFilterValue) => void;
	onMapChange: (value: MapFilterValue) => void;
	onVersionChange: (value: GameVersion) => void;
}> = ({
	maps,
	selectedTime,
	selectedMap,
	selectedVersion,
	onTimeChange,
	onMapChange,
	onVersionChange,
}) => {
	const timeValues = useMemo(() => {
		const firstMap = maps?.at(-1);
		return timeFilterValues(firstMap ? new Date(firstMap["Created At"]) : null);
	}, [maps]);

	const mapValues = useMemo(() => {
		const filtered = Maps.filter((x) => maps?.some((map) => map.Map === x));
		return ["all", ...filtered] as const;
	}, [maps]);

	const safeSelectedTime = useMemo(
		() => (timeValues.includes(selectedTime) ? selectedTime : "all"),
		[timeValues, selectedTime],
	);

	const safeSelectedMap = useMemo(
		() => (mapValues.includes(selectedMap) ? selectedMap : "all"),
		[mapValues, selectedMap],
	);

	const onSelectedTimeChange = useCallback(
		(valueStr: string) => {
			// Convert to number if it represents a year; otherwise keep as string.
			const valueNumber = Number(valueStr);
			const value = !isNaN(valueNumber) ? valueNumber : valueStr;
			onTimeChange(value as TimeFilterValue);
		},
		[onTimeChange],
	);

	return (
		<div className="grid grid-cols-[12rem,8rem,6rem] items-center bg-background-light gap-8 p-4 rounded-sm sm:grid-cols-3">
			<div className="flex flex-col">
				<p className="text-muted-foreground text-sm uppercase">Time</p>

				<Select value={safeSelectedTime.toString()} onValueChange={onSelectedTimeChange}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{timeValues.map((x) => {
							const id = x.toString();
							const label = match(x)
								.with("all", () => "All")
								.with("lastMonth", () => "Last month")
								.with("lastThreeMonths", () => "Last 3 months")
								.with("lastSixMonths", () => "Last 6 months")
								.with("lastTwelveMonths", () => "Last 12 months")
								.with(P.number, (x) => x.toString())
								.exhaustive();

							return (
								<SelectItem key={id} value={id}>
									{label}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col">
				<p className="text-muted-foreground text-sm uppercase">Map</p>

				<Select
					value={safeSelectedMap}
					onValueChange={(value: MapFilterValue) => onMapChange(value)}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{mapValues.map((x) => (
							<SelectItem key={x} value={x}>
								{x === "all" ? "All" : MapLabel[x]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col">
				<p className="text-muted-foreground text-sm uppercase">Version</p>

				<Select
					value={selectedVersion}
					onValueChange={(value: GameVersion) => onVersionChange(value)}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GameVersions.map((x) => {
							const label = match(x)
								.with("cs2", () => "CS2")
								.with("csgo", () => "CS:GO")
								.exhaustive();

							return (
								<SelectItem key={x} value={x}>
									{label}
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
};

const PlayerCard: React.FC<{
	player: Pick<PlayerListItem, "player_id" | "avatar" | "nickname" | "country">;
	maps: PlayerMapStats[] | null;
}> = ({ player, maps }) => {
	const performance = usePlayerPerformance(maps ?? []);

	return (
		<div className="grid grid-cols-[auto,1fr] bg-primary rounded-sm xs:grid-cols-1">
			<a
				href={playerFaceitUrl(player.nickname)}
				target="_blank"
				rel="noopener noreferrer"
				className="aspect-square h-[24rem] relative rounded-l-sm overflow-hidden border border-primary xs:h-[16rem] xs:aspect-auto"
			>
				<div
					className="size-full bg-cover bg-center before:absolute before:inset-0 before:bg-background/50 blur-xs"
					style={{ backgroundImage: `url(${player.avatar})` }}
				/>

				<div className="absolute bottom-8 w-full flex items-center text-center gap-2">
					<h4
						title={player.nickname}
						className="text-2xl font-bold text-shadow flex items-center gap-2 mx-auto truncate px-4"
					>
						<img
							src={flagUrl(player.country)}
							alt={player.country}
							className="border border-background-light w-7"
						/>
						{player.nickname}
					</h4>
				</div>
			</a>

			<div className="h-[24rem] p-12">
				{maps ? <MetricBox performance={performance} /> : <MetricBoxSkeleton />}
			</div>
		</div>
	);
};

function playerFaceitUrl(username: string) {
	return `https://www.faceit.com/en/players/${username}`;
}

const MetricBox: React.FC<{ performance: PlayerPerformance }> = ({ performance }) => (
	<div className="flex flex-col h-full pb-5 justify-between">
		<div className="flex gap-12">
			<Metric type="rating" value={performance.rating} approximate />
			<Metric type="dpr" value={performance.dpr} />
			<Metric type="kast" value={performance.kast} approximate />
		</div>
		<div className="flex gap-12">
			<Metric type="kd" value={performance.kd} />
			<Metric type="adr" value={performance.adr} approximate />
			<Metric type="kpr" value={performance.kpr} />
		</div>
	</div>
);

const MetricBoxSkeleton: React.FC = () => (
	<div className="flex flex-col h-full justify-between py-2">
		<div className="flex items-center h-24 gap-12">
			<MetricSkeleton />
			<MetricSkeleton />
			<MetricSkeleton />
		</div>
		<div className="flex items-center h-24 gap-12">
			<MetricSkeleton />
			<MetricSkeleton />
			<MetricSkeleton />
		</div>
	</div>
);

const MetricSkeleton: React.FC = () => (
	<div className="flex flex-col w-1/3 gap-4 animate-pulse">
		<div className="h-5 w-20 bg-muted-foreground/25 rounded-sm" />
		<div className="flex flex-col gap-2">
			<div className="h-12 w-24 bg-muted-foreground/25 rounded-sm" />
			<div className="h-5 w-full bg-muted-foreground/25 rounded-sm" />
		</div>
	</div>
);

type MetricType = "rating" | "kd" | "dpr" | "kpr" | "kast" | "adr" | "kdDiff";

const MetricLabel: Record<MetricType, string> = {
	rating: "Rating 2.0",
	kd: "K/D",
	dpr: "DPR",
	kast: "KAST %",
	kpr: "KPR",
	adr: "ADR",
	kdDiff: "+/-",
};

const InvertedMetrics: MetricType[] = ["dpr"];

const MetricValueRange: Record<MetricType, [number, number]> = {
	rating: [0.5, 1.5],
	kd: [0.5, 1.5],
	dpr: [0.5, 1],
	kast: [50, 100],
	kpr: [0.5, 1],
	adr: [50, 100],
	kdDiff: [-1, 1],
};

type Level = "poor" | "okay" | "good";

export function roundMetricValue(type: MetricType, value: number): string {
	return match(type)
		.with("rating", "kd", "dpr", "kpr", () => value.toFixed(2))
		.with("kast", "adr", () => value.toFixed(1))
		.with("kdDiff", () => String(value))
		.exhaustive();
}

function metricInfo(metric: MetricType, value: number) {
	const roundedValueStr = roundMetricValue(metric, value);
	const roundedValue = Number(roundedValueStr);

	const [min, max] = MetricValueRange[metric];
	const range = max - min;

	let normalizedValue = clamp((roundedValue - min) / range, 0, 1);
	if (InvertedMetrics.includes(metric)) normalizedValue = 1 - normalizedValue;

	const level: Level = (() => {
		if (normalizedValue < 1 / 3) return "poor";
		if (normalizedValue < 2 / 3) return "okay";
		return "good";
	})();

	return {
		roundedValueStr,
		normalizedValue,
		level,
	};
}

const LevelColor: Record<Level, string> = {
	poor: "#f53c3c",
	okay: "#e3ae08",
	good: "#06ab18",
};

const Metric: React.FC<{
	type: MetricType;
	value: number;
	approximate?: boolean;
}> = ({ type, value, approximate }) => {
	const { roundedValueStr, normalizedValue, level } = useMemo(
		() => metricInfo(type, value),
		[type, value],
	);

	return (
		<div className="flex flex-col w-1/3 gap-3">
			<div className="flex items-start">
				<span className="text-primary-foreground uppercase">{MetricLabel[type]}</span>

				{approximate && (
					<Tooltip>
						<TooltipTrigger>
							<AsteriskIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
						</TooltipTrigger>
						<TooltipContent>This value is an estimate, not a precise figure</TooltipContent>
					</Tooltip>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<span className="font-bold text-5xl">{roundedValueStr}</span>
				<div className="h-2 relative bg-border rounded-sm">
					<span
						className="absolute top-0 w-1/3 h-full rounded-sm"
						style={{
							boxShadow: `0 0 10px 0 ${LevelColor[level]}`,
							backgroundColor: LevelColor[level],
							left: `${
								match(level)
									.with("poor", () => 0)
									.with("okay", () => 1 / 3)
									.with("good", () => 2 / 3)
									.exhaustive() * 100
							}%`,
						}}
					/>
					<span
						className="w-0.5 h-3 rounded-sm bg-background-foreground absolute -top-0.5"
						style={{
							left: `${normalizedValue * 100}%`,
						}}
					/>
					<span
						className="absolute -bottom-6 uppercase text-sm"
						style={{
							color: LevelColor[level],
							...match<Level, CSSProperties>(level)
								.with("poor", () => ({
									left: "0",
									transform: "translateX(0)",
								}))
								.with("okay", () => ({
									left: "50%",
									transform: "translateX(-50%)",
								}))
								.with("good", () => ({
									left: "100%",
									transform: "translateX(-100%)",
								}))
								.exhaustive(),
						}}
					>
						{level}
					</span>
				</div>
			</div>
		</div>
	);
};

const MapHistory: React.FC<{
	maps: PlayerMapStats[] | null;
}> = ({ maps }) => {
	const sessions = useMemo(() => (maps ? groupMapsIntoSessions(maps) : null), [maps]);

	const mapCountLabel = maps ? `— ${maps.length}` : null;
	const sessionCountLabel = sessions ? `— ${sessions.length}` : null;

	return (
		<Tabs defaultValue="maps" className="w-full flex items-center mx-auto gap-2">
			<TabsList className="w-full gap-2 bg-background-light">
				<TabsTrigger value="maps">Maps {mapCountLabel}</TabsTrigger>

				<TabsTrigger value="sessions">
					Sessions {sessionCountLabel}
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<InfoIcon className="size-4 me-1 text-muted-foreground" />
							</span>
						</TooltipTrigger>
						<TooltipContent>
							Maps you played within {MaxSessionGapHours} hours are grouped into one session
						</TooltipContent>
					</Tooltip>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="maps" className="w-full">
				<MapsTable maps={maps} />
			</TabsContent>

			<TabsContent value="sessions" className="w-full">
				<SessionsTable sessions={sessions} />
			</TabsContent>
		</Tabs>
	);
};

export const RatingColumnHead: React.FC = () => (
	<div className="flex flex-col items-center">
		Rating <span className="text-sm font-normal -mt-2">2.0</span>
	</div>
);

const MapsTable: React.FC<{ maps: PlayerMapStats[] | null }> = ({ maps }) => (
	<Table className="rounded-sm">
		<TableHeader>
			<TableRow className="[&>th]:text-center">
				<TableHead className="w-[30%]">Datetime</TableHead>
				<TableHead className="w-[10%]">Map</TableHead>
				<TableHead className="w-[15%]">Score</TableHead>
				<TableHead className="w-[15%]">K—D</TableHead>
				<TableHead className="w-[15%]">K/D</TableHead>
				<TableHead className="w-[15%]">
					<RatingColumnHead />
				</TableHead>
			</TableRow>
		</TableHeader>

		<TableBody>
			{!maps ? <TableSkeleton /> : maps.map((map, index) => <MapRow key={index} map={map} />)}
		</TableBody>
	</Table>
);

export const PerformanceColor: Record<Level, string> = {
	good: "#09c100",
	poor: "#fc1d1d",
	okay: "#929a9e",
};

export const Performance: React.FC<{
	metric: MetricType;
	value: number;
	render?: (value: number) => ReactNode;
}> = ({ metric, value, render }) => {
	const { level, roundedValueStr } = useMemo(() => metricInfo(metric, value), [metric, value]);

	return (
		<span className="font-bold" style={{ color: PerformanceColor[level] }}>
			{render?.(value) ?? roundedValueStr}
		</span>
	);
};

function readableMapDate(map: PlayerMapStats) {
	// FACEIT API currently sets "Created At" to the same value as "Match Finished At".
	// Until this is fixed, we use "Created At" if available, otherwise fallback to "Match Finished At".
	const date = new Date(map["Created At"] ?? map["Match Finished At"]);

	if (isToday(date)) return `Today, ${format(date, "HH:mm")}`;
	if (isYesterday(date)) return `Yesterday, ${format(date, "HH:mm")}`;
	return format(date, "dd/MM/yy, HH:mm");
}

const MapRow: React.FC<{ map: PlayerMapStats }> = ({ map }) => {
	const performance = usePlayerPerformance([map]);
	const date = useMemo(() => readableMapDate(map), [map]);

	const scoreColor = match(map.Result)
		.with("1", () => PerformanceColor.good)
		.with("0", () => PerformanceColor.poor)
		.otherwise(() => PerformanceColor.okay);

	return (
		<TableRow className="[&>td]:text-center">
			<TableCell className="w-[30%] text-muted-foreground">
				<a
					href={matchUrl(map["Match Id"])}
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary-foreground"
				>
					{date}
				</a>
			</TableCell>

			<TableCell className="w-[10%] text-muted-foreground">
				{MapAlias[map["Map"] as Map] ?? "???"}
			</TableCell>

			<TableCell className="w-[15%]" style={{ color: scoreColor }}>
				{map["Score"]}
			</TableCell>

			<TableCell className="w-[15%]">
				{map["Kills"]}—{map["Deaths"]}
			</TableCell>

			<TableCell className="w-[15%]">
				<Performance metric="kd" value={performance.kd} />
			</TableCell>

			<TableCell className="w-[15%]">
				<Performance metric="rating" value={performance.rating} />
			</TableCell>
		</TableRow>
	);
};

function matchUrl(matchId: string) {
	return `/matches/${matchId}`;
}

const SessionsTable: React.FC<{ sessions: PlayerMapStats[][] | null }> = ({ sessions }) => (
	<Table className="rounded-sm">
		<TableHeader>
			<TableRow className="[&>th]:text-center">
				<TableHead className="w-[30%]">Datetime</TableHead>
				<TableHead className="w-[10%]">Maps</TableHead>
				<TableHead className="w-[15%]">W/L</TableHead>
				<TableHead className="w-[15%]">K—D</TableHead>
				<TableHead className="w-[15%]">K/D</TableHead>
				<TableHead className="w-[15%]">
					<RatingColumnHead />
				</TableHead>
			</TableRow>
		</TableHeader>

		<TableBody>
			{!sessions ? (
				<TableSkeleton />
			) : (
				sessions.map((session, index) => <SessionRow key={index} session={session} />)
			)}
		</TableBody>
	</Table>
);

const SessionRow: React.FC<{ session: PlayerMapStats[] }> = ({ session }) => {
	const performance = usePlayerPerformance(session);
	const date = useMemo(() => readableMapDate(session[0]), [session]);
	const maps = useMemo(() => session.slice().reverse(), [session]);

	return (
		<TableRow className="[&>td]:text-center">
			<TableCell className="w-[30%] text-muted-foreground">{date}</TableCell>
			<TableCell className="w-[10%] text-muted-foreground">{session.length}</TableCell>
			<TableCell className="w-[15%] text-muted-foreground">
				<ul className="inline-flex flex-wrap justify-center">
					{maps.map((x, index) => {
						const [result, color] = match(x.Result)
							.with("1", () => ["W", PerformanceColor.good])
							.with("0", () => ["L", PerformanceColor.poor])
							.otherwise(() => ["?", PerformanceColor.okay]);

						return (
							<li key={index} className="inline" style={{ color }}>
								{result}
							</li>
						);
					})}
				</ul>
			</TableCell>

			<TableCell className="w-[15%]">
				{performance.kills}—{performance.deaths}
			</TableCell>

			<TableCell className="w-[15%]">
				<Performance metric="kd" value={performance.kd} />
			</TableCell>

			<TableCell className="w-[15%]">
				<Performance metric="rating" value={performance.rating} />
			</TableCell>
		</TableRow>
	);
};

const TableSkeleton: React.FC = () =>
	Array.from({ length: 10 }).map((_, index) => (
		<TableRow key={index} className="[&>td]:h-10">
			<TableCell className="w-[30%]">
				<div className="h-4 bg-muted-foreground/25 rounded-sm w-28 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[10%]">
				<div className="h-4 bg-muted-foreground/25 rounded-sm w-12 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-sm w-16 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-sm w-16 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-sm w-12 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-sm w-12 mx-auto animate-pulse" />
			</TableCell>
		</TableRow>
	));

const MaxSessionGapHours = 3;

// Group matches into sessions where each session is a sequence of matches
// with <= MaxSessionGapHours hours between consecutive matches.
function groupMapsIntoSessions(maps: PlayerMapStats[]): PlayerMapStats[][] {
	const sessions: PlayerMapStats[][] = [];

	for (const map of maps) {
		const prevSession = sessions.at(-1);

		if (!prevSession) {
			sessions.push([map]);
			continue;
		}

		const mapTime = new Date(map["Created At"]).getTime();
		const prevMap = prevSession[prevSession.length - 1];
		const prevMapTime = new Date(prevMap["Created At"]).getTime();
		const hoursElapsed = Math.abs(mapTime - prevMapTime) / (1000 * 60 * 60);

		if (hoursElapsed <= MaxSessionGapHours) prevSession.push(map);
		else sessions.push([map]);
	}

	return sessions;
}

const queryKeys = createQueryKeys("profile", {
	mapsByPlayerId: (playerId: string, version: "cs2" | "csgo") => ["maps", playerId, version],
	playerByInput: (input: string) => ["player", input],
});

function usePlayerQuery(input: string, enabled: boolean = true) {
	return useQuery({
		queryKey: queryKeys.playerByInput(input).queryKey,
		queryFn: ({ signal }) => playerByInput(input, { signal }),
		enabled,
	});
}

function useMapsQuery(playerId: string | null, version: GameVersion) {
	const id = playerId ?? "";
	return useQuery({
		enabled: !!playerId,
		queryKey: queryKeys.mapsByPlayerId(id, version).queryKey,
		queryFn: ({ signal }) => fetchMapHistory(id, version, { signal }),
	});
}

const ProfileSearchForm: React.FC<{
	initialValue: string;
}> = ({ initialValue }) => {
	const [search, setSearch] = useState(initialValue);

	const input = search.trim();
	const query = usePlayerQuery(input, false);

	const [location, navigate] = useLocation();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (location !== homeUrl()) return;
		setSearch("");
		inputRef.current?.focus();
	}, [location]);

	const handleSubmit = useCallback(
		async (ev: FormEvent<HTMLFormElement>) => {
			ev.preventDefault();

			const { data, isSuccess } = await query.refetch();
			if (!isSuccess) return;

			navigate(playerUrl(data.nickname));

			// This component doesn't get unmounted/mounted after navigation (only `initialValue` prop changes),
			// so we have to manually update its value and force blur the input.
			setSearch(data.nickname);
			inputRef.current?.blur();
		},
		[navigate, query],
	);

	const onReset = useCallback((ev: React.MouseEvent<HTMLButtonElement>) => {
		// Standard click sequence: mousedown → focus → mouseup → click.
		// Focusing any element within <form> triggers a layout shift via :focus-within,
		// which can prevent the click event from firing reliably.
		// To fix this, we handle mousedown instead and preventDefault() to keep
		// focus on the input rather than the button.
		ev.preventDefault();
		setSearch("");
		inputRef.current?.focus();
	}, []);

	const isInitialSearch = search === initialValue && initialValue !== "";

	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				"flex flex-col gap-2 group transition-[width] w-[54rem] duration-300 ease-out xs:w-full",
				isInitialSearch && "w-[24rem] focus-within:w-[54rem] xs:w-[24rem] xs:focus-within:w-full",
			)}
		>
			<div className="relative">
				<ShieldUserIcon
					className={cn(
						"absolute left-4 top-1/2 -translate-y-1/2 size-8 hidden",
						isInitialSearch && "block group-focus-within:hidden",
					)}
				/>
				{/* eslint-disable jsx-a11y/no-autofocus */}
				{/* This input is the only interactive element -> autofocus is justified */}
				<input
					value={search}
					ref={inputRef}
					onChange={(ev) => setSearch(ev.currentTarget.value)}
					placeholder="FACEIT username, FACEIT URL, Steam URL, or Steam ID"
					aria-label="FACEIT username, FACEIT URL, Steam URL, or Steam ID"
					className={cn(
						"w-full text-2xl bg-background border-2 rounded-sm border-background-foreground pl-4 pr-56 py-4 focus-visible:outline outline-offset-2 outline-background-foreground",
						isInitialSearch && "pl-14 pr-14 group-focus-within:pl-4 group-focus-within:pr-4",
					)}
				/>
				<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
					<Button type="button" variant="icon" onMouseDown={onReset} aria-label="Clear input">
						<XIcon className="size-8 text-muted-foreground" />
					</Button>
					<Button
						type="submit"
						className={cn(isInitialSearch && "hidden group-focus-within:inline-flex")}
						disabled={!input || query.isLoading}
					>
						{query.isLoading && <Spinner className="h-6 w-6 me-2" />}
						Show stats
					</Button>
				</div>
			</div>

			{query.error && (
				<p role="alert" className="text-error inline-flex items-center text-left">
					<CircleAlert className="h-5 w-5 me-2" />
					{query.error.message}
				</p>
			)}
		</form>
	);
};

function playerUrl(username: string) {
	return `/players/${username}`;
}

function homeUrl() {
	return "/";
}

const RegExps = {
	FaceitUrl: /^https?:\/\/(www\.)?faceit\.com\/en\/players\/([a-zA-Z0-9_-]{1,24})\/?$/,
	FaceitUsername: /^[a-zA-Z0-9_-]{1,24}$/,
	SteamUrlWithSteamId: /https?:\/\/steamcommunity\.com\/profiles\/(\d{17})/,
	SteamUrlWithCustomId: /https?:\/\/steamcommunity\.com\/id\/([\w\d_-]+)/,
	SteamUrl: /^https?:\/\/steamcommunity\.com\/(id|profiles)\/([a-zA-Z0-9_-]+)\/?$/,
	SteamId: /^\d{17}$/,
};

type PlayerInput =
	| { kind: "faceit-username"; username: string }
	| { kind: "faceit-url"; url: string }
	| { kind: "invalid" }
	| { kind: "steam-url"; url: string }
	| { kind: "steam-id"; id: string };

function parseInput(input: string): PlayerInput {
	if (RegExps.SteamId.test(input)) {
		return { kind: "steam-id", id: input };
	} else if (RegExps.FaceitUsername.test(input)) {
		return { kind: "faceit-username", username: input };
	} else if (RegExps.FaceitUrl.test(input)) {
		return { kind: "faceit-url", url: input };
	} else if (RegExps.SteamUrl.test(input)) {
		return { kind: "steam-url", url: input };
	}

	return { kind: "invalid" };
}

function playerByInput(input: string, opts?: { signal?: AbortSignal }) {
	return match(parseInput(input))
		.with({ kind: "invalid" }, () => {
			throw new Error(
				"Hmm… that doesn't look like a valid FACEIT username, FACEIT URL, Steam URL, or Steam ID.",
			);
		})
		.with({ kind: "faceit-url" }, { kind: "faceit-username" }, async (x) => {
			const username = match(x)
				.with({ kind: "faceit-username" }, (x) => x.username)
				.with({ kind: "faceit-url" }, (x) => {
					const match = x.url.match(RegExps.FaceitUrl);
					assert(match);
					return match[2];
				})
				.exhaustive();

			const [err, player] = await tc(fetchPlayer(username, opts));
			if (err) throw new Error("That player doesn't seem to exist.");
			return player;
		})
		.with({ kind: "steam-url" }, async (x) => {
			try {
				const steamId = await steamIdByUrl(x.url);
				return await fetchPlayerBySteamId(steamId);
			} catch {
				throw new Error("We couldn't resolve a FACEIT player from that Steam URL.");
			}
		})
		.with({ kind: "steam-id" }, async (x) => {
			const [err, player] = await tc(fetchPlayerBySteamId(x.id));
			if (err) throw new Error("We couldn't resolve a FACEIT player from that Steam ID.");
			return player;
		})
		.exhaustive();
}

async function steamIdByUrl(url: string): Promise<string> {
	const steamIdMatch = url.match(RegExps.SteamUrlWithSteamId);
	if (steamIdMatch) return steamIdMatch[1];

	const customIdMatch = url.match(RegExps.SteamUrlWithCustomId);
	if (customIdMatch) return await steamIdByCustomId(customIdMatch[1]);

	throw new Error(`failed to resolve steam id: ${url}`);
}

interface SteamIdResponse {
	response: { steamid?: string };
}

async function steamIdByCustomId(customId: string): Promise<string> {
	const res = await api
		.get<SteamIdResponse>(
			`https://corsproxy.io/?url=https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${Env.VITE_STEAM_WEB_API_KEY}&vanityurl=${customId}`,
		)
		.json();
	const steamId = res.response.steamid;
	if (steamId === undefined) throw new Error(`failed to resolve custom id: ${customId}`);
	return steamId;
}

interface PlayerListItem {
	player_id: string;
	nickname: string;
	status: string;
	games: {
		name: string;
		skill_level: string;
	}[];
	country: string;
	verified: boolean;
	avatar: string;
}

interface PlayerListResponse {
	start: number;
	end: number;
	items: PlayerListItem[];
}

async function fetchPlayer(
	username: string,
	opts?: { signal?: AbortSignal },
): Promise<PlayerListItem> {
	const target = username.toLowerCase();
	const error = new Error(`player not found: ${username}`);

	for (let page = 0; ; page++) {
		const { items } = await faceitApi
			.get<PlayerListResponse>("search/players", {
				searchParams: {
					game: "cs2",
					nickname: username,
					limit: FaceitQueryLimit,
					offset: page * FaceitQueryLimit,
				},
				signal: opts?.signal,
			})
			.json();

		if (items.length === 0) throw error;

		const match = items.find((p) => p.nickname.toLowerCase() === target);
		if (match) return match;

		if (items.length < FaceitQueryLimit) throw error;
	}
}

interface PlayerMapStats {
	Assists: string;
	"Best Of": string;
	"Competition Id": string;
	"Created At": string;
	Deaths: string;
	"Final Score": string;
	"First Half Score": string;
	Game: string;
	"Game Mode": string;
	Headshots: string;
	"Headshots %": string;
	"K/D Ratio": string;
	"K/R Ratio": string;
	Kills: string;
	MVPs: string;
	Map: string;
	"Match Id": string;
	"Match Round": string;
	Nickname: string;
	"Overtime score": string;
	"Penta Kills": string;
	"Player Id": string;
	"Quadro Kills": string;
	Region: string;
	Result: string;
	Rounds: string;
	Score: string;
	"Second Half Score": string;
	Team: string;
	"Double Kills": string;
	"Triple Kills": string;
	"Updated At": string;
	Winner: string;
	ADR: string;
	"Match Finished At": number;
}

interface PlayerMapsResponse {
	start: number;
	end: number;
	items: {
		stats: PlayerMapStats;
	}[];
}

const FaceitPlayerMapsOffsetLimit = 200;

async function fetchMapHistory(
	playerId: string,
	version: GameVersion,
	opts?: { signal?: AbortSignal },
): Promise<PlayerMapStats[]> {
	const history: PlayerMapStats[] = [];

	while (true) {
		const { items } = await faceitApi
			.get<PlayerMapsResponse>(`players/${playerId}/games/${version}/stats`, {
				searchParams: {
					limit: FaceitQueryLimit,
					...(history.length <= FaceitPlayerMapsOffsetLimit
						? { offset: history.length }
						: { to: history.at(-1)?.["Match Finished At"] }),
				},
				signal: opts?.signal,
			})
			.json();
		if (items.length === 0) break;

		history.push(...items.map((x) => x.stats));
		if (items.length < FaceitQueryLimit) break;
	}

	return history;
}

interface PlayerBySteamIdResponse {
	player_id: string;
	nickname: string;
	avatar: string;
	country: string;
}

async function fetchPlayerBySteamId(steamId: string): Promise<PlayerBySteamIdResponse> {
	return await faceitApi
		.get<PlayerBySteamIdResponse>(`players?game=cs2&game_player_id=${steamId}`)
		.json();
}

function safeNumber(x: string | undefined) {
	if (x === undefined) return undefined;
	return Number(x);
}

export type PlayerMapStatsInput = Pick<
	PlayerMapStats,
	| "Kills"
	| "Deaths"
	| "Assists"
	| "Rounds"
	| "Headshots"
	| "ADR"
	| "Double Kills"
	| "Triple Kills"
	| "Quadro Kills"
	| "Penta Kills"
>;

function normalizeMapStats(x: PlayerMapStatsInput): MapStats {
	return {
		kills: Number(x.Kills),
		deaths: Number(x.Deaths),
		assists: Number(x.Assists),
		rounds: Number(x.Rounds),
		headshots: Number(x.Headshots),
		adr: safeNumber(x.ADR),
		doubleKills: safeNumber(x["Double Kills"]),
		tripleKills: Number(x["Triple Kills"]),
		quadroKills: Number(x["Quadro Kills"]),
		pentaKills: Number(x["Penta Kills"]),
	};
}

export function aggregatePlayerPerformance(maps: PlayerMapStatsInput[]) {
	return computePlayerPerformance(maps.map(normalizeMapStats));
}

function usePlayerPerformance(maps: PlayerMapStatsInput[]) {
	return useMemo(() => aggregatePlayerPerformance(maps), [maps]);
}

export function flagUrl(countryCode: string): string {
	return `https://hltv.org/img/static/flags/30x20/${countryCode.toUpperCase()}.gif`;
}
