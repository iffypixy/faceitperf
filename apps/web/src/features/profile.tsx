import { createQueryKeys } from "@lukemorales/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { addMonths, getYear, isAfter, isToday, isYesterday, parseISO } from "date-fns";
import {
	AsteriskIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	CircleAlert,
	HistoryIcon,
	InfoIcon,
	ShieldUserIcon,
	XIcon,
} from "lucide-react";
import type React from "react";
import {
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { match, P } from "ts-pattern";
import { useLocation, useParams } from "wouter";
import { create } from "zustand";
import { type MapId, Maps, mapAlias, mapLabel } from "~/entities/map";
import { computePlayerPerformance, type MapStats } from "~/features/stats";
import { api, FaceitQueryLimit, faceitApi } from "~/shared/api";
import { cn } from "~/shared/lib/cn";
import { clamp, divide } from "~/shared/lib/numbers";
import { useDocumentTitle } from "~/shared/lib/use-document-title";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
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
} from "~/shared/ui";
import { Button } from "~/shared/ui/button";
import { Spinner } from "~/shared/ui/loader";

export const ProfileSearch: React.FC = () => {
	const { username } = useParams<{ username: string }>();

	useDocumentTitle(username ?? "Home");

	return (
		<ContentTemplate>
			<Container>
				<div className={cn("flex flex-col", username ? "gap-8" : "gap-16 pt-8 sm:pt-12")}>
					<div className="flex flex-col items-center gap-4">
						{!username && <Heading />}
						<ProfileSearchForm initialValue={username ?? ""} />
						<PlayerHistory current={username} />
					</div>

					{username && <Profile username={username} />}
				</div>
			</Container>
		</ContentTemplate>
	);
};

const Heading: React.FC = () => (
	<h1 className="text-2xl sm:text-3xl tracking-tight text-center">
		Your <span className="text-faceit font-medium">FACEIT</span> stats,{" "}
		<span className="text-hltv font-medium">HLTV</span> style.
	</h1>
);

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
		if (isAfter(startDate, TimeFilterPresetStartDate[preset](now))) continue;
		res.push(preset);
	}

	const startYear = getYear(startDate);
	for (let year = getYear(now); year >= startYear; year--) res.push(year);

	return res;
}

type MapFilterValue = "all" | MapId;

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
	const [filter, setFilter] = useState(filterFromUrl);

	// The address mirrors the filter, so a refresh or a shared link shows the same view.
	useEffect(() => {
		const query = filterToQuery(filter);
		window.history.replaceState(null, "", playerUrl(username) + (query && `?${query}`));
	}, [username, filter]);

	const playerQuery = usePlayerQuery(username.trim());
	const mapsQuery = useMapsQuery(playerQuery.data?.player_id ?? null, filter.version);

	const { addToHistory } = usePlayerHistory();

	useEffect(() => {
		if (!playerQuery.data) return;
		const { player_id, avatar, nickname } = playerQuery.data;
		addToHistory({ id: player_id, avatar, nickname });
	}, [playerQuery.data, addToHistory]);

	const maps = mapsQuery.data ?? null;

	const timeValues = useMemo(() => {
		const firstMap = maps?.at(-1);
		return timeFilterValues(firstMap ? new Date(firstMap["Created At"]) : null);
	}, [maps]);

	const mapValues = useMemo<MapFilterValue[]>(() => {
		const played = new Set(maps?.map((x) => x.Map));
		return ["all", ...Maps.filter((x) => played.has(x))];
	}, [maps]);

	// The filter outlives the maps it was picked for (another player or version),
	// so a value those maps don't offer falls back to "all".
	const selectedTime = timeValues.includes(filter.time) ? filter.time : "all";
	const selectedMap = mapValues.includes(filter.map) ? filter.map : "all";

	const filteredMaps = useMemo(
		() => maps && filterMaps(maps, selectedTime, selectedMap),
		[maps, selectedTime, selectedMap],
	);

	if (mapsQuery.isError)
		return (
			<p role="alert" className="text-destructive text-xl inline-flex items-center mx-auto">
				<CircleAlert className="size-5 me-2" />
				We couldn't load the maps. Try refreshing?
			</p>
		);

	return match(playerQuery)
		.with({ status: "error" }, () => null)
		.with({ status: "pending" }, () => <Spinner />)
		.with({ status: "success" }, (x) => (
			<div className="w-full flex flex-col mx-auto gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out">
				<div className="flex flex-col gap-2">
					<FilterGroup
						timeValues={timeValues}
						mapValues={mapValues}
						selectedTime={selectedTime}
						selectedMap={selectedMap}
						selectedVersion={filter.version}
						onTimeChange={(time) => setFilter({ ...filter, time })}
						onMapChange={(map) => setFilter({ ...filter, map })}
						onVersionChange={(version) => setFilter({ ...filter, version })}
					/>
					<PlayerCard player={x.data} version={filter.version}>
						{filteredMaps ? <MetricBox maps={filteredMaps} /> : <MetricBoxSkeleton />}
					</PlayerCard>
				</div>

				<HuntGGWidget />

				<MapHistory maps={filteredMaps} />
			</div>
		))
		.exhaustive();
};

function filterFromUrl(): FilterState {
	const query = new URLSearchParams(window.location.search);
	const time = query.get("time");

	return {
		time:
			TimeFilterPresets.find((x) => x === time) ??
			(time && Number.isInteger(Number(time)) ? Number(time) : "all"),
		map: Maps.find((x) => x === query.get("map")) ?? "all",
		version: GameVersions.find((x) => x === query.get("version")) ?? "cs2",
	};
}

function filterToQuery(filter: FilterState): string {
	const query = new URLSearchParams();
	if (filter.time !== "all") query.set("time", String(filter.time));
	if (filter.map !== "all") query.set("map", filter.map);
	if (filter.version !== "cs2") query.set("version", filter.version);

	return query.toString();
}

function filterMaps(
	maps: PlayerMapStats[],
	selectedTime: TimeFilterValue,
	selectedMap: MapFilterValue,
): PlayerMapStats[] {
	let res: PlayerMapStats[] = [];

	res = match(selectedTime)
		.with("all", () => maps)
		.with("lastMonth", "lastThreeMonths", "lastSixMonths", "lastTwelveMonths", (x) => {
			const presetStartDate = TimeFilterPresetStartDate[x](new Date());
			return maps.filter((map) => isAfter(parseISO(map["Created At"]), presetStartDate));
		})
		.with(P.number, (x) => maps.filter((map) => getYear(parseISO(map["Created At"])) === x))
		.exhaustive();

	res = match(selectedMap)
		.with("all", () => res)
		.with(P.string, (x) => res.filter((map) => map.Map === x))
		.exhaustive();

	return res;
}

const FilterGroup: React.FC<{
	timeValues: TimeFilterValue[];
	mapValues: MapFilterValue[];
	selectedTime: TimeFilterValue;
	selectedMap: MapFilterValue;
	selectedVersion: GameVersion;
	onTimeChange: (value: TimeFilterValue) => void;
	onMapChange: (value: MapFilterValue) => void;
	onVersionChange: (value: GameVersion) => void;
}> = ({
	timeValues,
	mapValues,
	selectedTime,
	selectedMap,
	selectedVersion,
	onTimeChange,
	onMapChange,
	onVersionChange,
}) => {
	const onSelectedTimeChange = useCallback(
		(valueStr: string) => {
			// Convert to number if it represents a year; otherwise keep as string.
			const valueNumber = Number(valueStr);
			const value = !Number.isNaN(valueNumber) ? valueNumber : valueStr;
			onTimeChange(value as TimeFilterValue);
		},
		[onTimeChange],
	);

	return (
		<div className="grid grid-cols-2 sm:grid-cols-[12rem_8rem_6rem] items-center bg-card gap-x-3 gap-y-4 sm:gap-x-8 p-4 rounded-xs">
			<div className="flex flex-col col-span-2 sm:col-span-1">
				<p className="text-muted-foreground text-sm uppercase tracking-wide">Time</p>

				<Select value={selectedTime.toString()} onValueChange={onSelectedTimeChange}>
					<SelectTrigger className="w-full" aria-label="Time">
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
				<p className="text-muted-foreground text-sm uppercase tracking-wide">Map</p>

				<Select value={selectedMap} onValueChange={onMapChange}>
					<SelectTrigger className="w-full" aria-label="Map">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{mapValues.map((x) => (
							<SelectItem key={x} value={x}>
								{x === "all" ? "All" : mapLabel(x)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col">
				<p className="text-muted-foreground text-sm uppercase tracking-wide">Version</p>

				<Select
					value={selectedVersion}
					onValueChange={(value: GameVersion) => onVersionChange(value)}
				>
					<SelectTrigger className="w-full" aria-label="Version">
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
	version: GameVersion;
	children: ReactNode;
}> = ({ player, version, children }) => {
	const detailsQuery = usePlayerDetailsQuery(player.player_id);
	const elo = detailsQuery.data?.games[version];

	return (
		<div className="grid md:grid-cols-[auto_1fr] bg-primary rounded-xs">
			<a
				href={playerFaceitUrl(player.nickname)}
				target="_blank"
				rel="noopener noreferrer"
				className="relative block h-64 md:h-96 md:aspect-square overflow-hidden border border-primary rounded-t-xs md:rounded-l-xs md:rounded-tr-none"
			>
				<div
					className="size-full bg-cover bg-center before:absolute before:inset-0 before:bg-background/50"
					style={{ backgroundImage: `url(${player.avatar})` }}
				/>

				<div className="absolute bottom-8 w-full flex flex-col items-center gap-1">
					<h1
						title={player.nickname}
						className="max-w-full text-2xl font-bold text-shadow-image flex items-center gap-2 px-4"
					>
						<img
							src={flagUrl(player.country)}
							alt={player.country}
							className="w-7 shrink-0 border border-card"
						/>
						<span className="truncate">{player.nickname}</span>
					</h1>

					{elo && (
						<p className="text-sm text-shadow-image text-white/75">
							Level {elo.skill_level}
							<span className="mx-1.5">·</span>
							{elo.faceit_elo.toLocaleString()} ELO
						</p>
					)}
				</div>
			</a>

			<div className="p-6 sm:p-12 md:h-96">{children}</div>
		</div>
	);
};

function playerFaceitUrl(username: string) {
	return `https://www.faceit.com/en/players/${username}`;
}

const MetricGrid =
	"grid grid-cols-2 sm:grid-cols-3 gap-x-6 sm:gap-x-12 gap-y-10 pb-5 md:h-full md:content-between";

const MetricBox: React.FC<{ maps: PlayerMapStats[] }> = ({ maps }) => {
	const performance = usePlayerPerformance(maps);
	// With no maps there is nothing to judge, so the values stay blank instead of reading "poor".
	const hasMaps = maps.length > 0;

	return (
		<div className={cn(MetricGrid, "animate-in fade-in-0 duration-200 ease-out")}>
			<Metric type="rating" value={hasMaps ? performance.rating : null} approximate />
			<Metric type="dpr" value={hasMaps ? performance.dpr : null} />
			<Metric type="kast" value={hasMaps ? performance.kast : null} approximate />
			<Metric type="kd" value={hasMaps ? performance.kd : null} />
			<Metric type="adr" value={hasMaps ? performance.adr : null} approximate />
			<Metric type="kpr" value={hasMaps ? performance.kpr : null} />
		</div>
	);
};

const MetricBoxSkeleton: React.FC = () => (
	<div className={MetricGrid}>
		{Array.from({ length: 6 }).map((_, index) => (
			<MetricSkeleton key={index} />
		))}
	</div>
);

const MetricSkeleton: React.FC = () => (
	<div className="flex flex-col gap-4 animate-pulse">
		<div className="h-5 w-20 bg-muted-foreground/25 rounded-xs" />
		<div className="flex flex-col gap-2">
			<div className="h-12 w-24 bg-muted-foreground/25 rounded-xs" />
			<div className="h-5 w-full bg-muted-foreground/25 rounded-xs" />
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
	poor: "#ff7369",
	okay: "#e3ae08",
	good: "#34c759",
};

// Each level's third of the bar, counted from the left.
const LevelStep: Record<Level, number> = {
	poor: 0,
	okay: 1,
	good: 2,
};

const Metric: React.FC<{
	type: MetricType;
	value: number | null;
	approximate?: boolean;
}> = ({ type, value, approximate }) => {
	const info = useMemo(() => (value === null ? null : metricInfo(type, value)), [type, value]);

	return (
		<div className="flex flex-col gap-3 min-w-0">
			<div className="flex items-start">
				<span className="text-primary-foreground uppercase tracking-wide">{MetricLabel[type]}</span>

				{approximate && (
					<Tooltip>
						<TooltipTrigger aria-label="About this estimate">
							<AsteriskIcon className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
						</TooltipTrigger>
						<TooltipContent>This value is an estimate, not a precise figure</TooltipContent>
					</Tooltip>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<span className={cn("font-bold text-4xl sm:text-5xl", !info && "text-muted-foreground")}>
					{info?.roundedValueStr ?? "–"}
				</span>
				{/* Moved with transforms, so a filter change slides the bar to its new reading. */}
				<div className="h-2 relative bg-border rounded-xs">
					{info && (
						<>
							<span
								className="absolute top-0 left-0 w-1/3 h-full rounded-xs transition-[transform,background-color,box-shadow] duration-250 ease-out motion-reduce:transition-none"
								style={{
									boxShadow: `0 0 10px 0 ${LevelColor[info.level]}`,
									backgroundColor: LevelColor[info.level],
									transform: `translateX(${LevelStep[info.level] * 100}%)`,
								}}
							/>
							<span
								className="absolute inset-0 transition-transform duration-250 ease-out motion-reduce:transition-none"
								style={{ transform: `translateX(${info.normalizedValue * 100}%)` }}
							>
								<span className="absolute -top-0.5 left-0 w-0.5 h-3 rounded-xs bg-foreground" />
							</span>
							<span
								className="absolute inset-x-0 -bottom-6 transition-transform duration-250 ease-out motion-reduce:transition-none"
								style={{ transform: `translateX(${LevelStep[info.level] * 50}%)` }}
							>
								<span
									className="inline-block uppercase text-sm tracking-wide transition-[transform,color] duration-250 ease-out motion-reduce:transition-none"
									style={{
										color: LevelColor[info.level],
										transform: `translateX(${LevelStep[info.level] * -50}%)`,
									}}
								>
									{info.level}
								</span>
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

const HuntCampaignId = "6a3af1f0956aac00125af12b";
const HuntRefCode = "FACEITPERF";
const HuntTrackingLink = `https://link.hunt.gg/cf/r/${HuntCampaignId}?ref_code=${HuntRefCode}`;
const HuntIframeSrc = `https://case-ad.hunt.gg?code=${HuntRefCode}&campaign_id=${HuntCampaignId}`;

/**
 * Reports whether the ad iframe failed to render — an adblocker cancelled its request, the
 * host is down, or a blocker collapsed it to zero size. Both checks are event-driven (no
 * timeout), so the banner appears within ms of a block and a slow connection is never
 * wrongly cut off.
 */
function useAdBlocked() {
	const ref = useRef<HTMLIFrameElement>(null);
	const [isBlocked, setIsBlocked] = useState(false);

	useEffect(() => {
		const iframe = ref.current;
		if (!iframe) return;

		let isCancelled = false;
		const collapseObserver = new ResizeObserver(() => {
			// Blockers that hide the iframe via CSS collapse it to zero size; catch that too.
			if (iframe.clientHeight === 0 || iframe.offsetParent === null) block();
		});

		// Idempotent: the first signal wins and tears down the rest so a detached
		// iframe is never observed after the swap.
		function block() {
			if (isCancelled) return;
			isCancelled = true;
			collapseObserver.disconnect();
			setIsBlocked(true);
		}

		// A blocked (or otherwise failed) request rejects almost instantly. redirect:"follow"
		// keeps a real redirect counting as reachable rather than a false block.
		fetch(HuntIframeSrc, { method: "GET", mode: "no-cors", redirect: "follow" }).catch(block);
		collapseObserver.observe(iframe);

		return () => {
			isCancelled = true;
			collapseObserver.disconnect();
		};
	}, []);

	return { ref, isBlocked };
}

const HuntGGWidget: React.FC = () => {
	const { ref, isBlocked } = useAdBlocked();

	if (isBlocked)
		return (
			<a
				href={HuntTrackingLink}
				target="_blank"
				rel="noopener noreferrer sponsored"
				className="w-full"
			>
				<img
					src="/hunt-banner.png"
					alt="hunt.gg"
					width={960}
					height={280}
					className="w-full h-auto rounded-xs"
				/>
			</a>
		);

	return (
		<iframe
			ref={ref}
			title="hunt.gg"
			src={HuntIframeSrc}
			loading="lazy"
			className="w-full aspect-[24/7] rounded-xs border-none bg-card focus-visible:outline-solid outline-1 outline-card"
		/>
	);
};

const MapHistory: React.FC<{
	maps: PlayerMapStats[] | null;
}> = ({ maps }) => {
	const sessions = useMemo(() => (maps ? groupMapsIntoSessions(maps) : null), [maps]);
	const sessionRule = `Maps you played within ${MaxSessionGapHours} hours are grouped into one session`;

	return (
		<Tabs defaultValue="maps" className="w-full flex items-center mx-auto gap-2">
			<TabsList className="w-full gap-2 bg-card">
				<TabsTrigger value="maps">Maps {maps && `— ${maps.length.toLocaleString()}`}</TabsTrigger>

				<TabsTrigger value="sessions" aria-description={sessionRule}>
					Sessions {sessions && `— ${sessions.length.toLocaleString()}`}
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<InfoIcon className="size-4 me-1 text-muted-foreground" />
							</span>
						</TooltipTrigger>
						<TooltipContent>{sessionRule}</TooltipContent>
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
	<span className="flex flex-col items-center">
		Rating <span className="text-sm font-normal -mt-2">2.0</span>
	</span>
);

type SortDirection = "asc" | "desc";

const SortableTableHead: React.FC<{
	direction: SortDirection | null;
	onClick: () => void;
	children: ReactNode;
	className?: string;
}> = ({ direction, onClick, children, className }) => (
	<TableHead
		className={cn("p-0", className)}
		aria-sort={match(direction)
			.with("asc", () => "ascending" as const)
			.with("desc", () => "descending" as const)
			.with(null, () => undefined)
			.exhaustive()}
	>
		<button
			type="button"
			onClick={onClick}
			className="flex h-12 w-full items-center justify-center gap-1 px-2 active:bg-muted/50 -outline-offset-2 outline-foreground focus-visible:outline-solid"
		>
			{children}

			{match(direction)
				.with("asc", () => <ChevronUpIcon className="size-4" />)
				.with("desc", () => <ChevronDownIcon className="size-4" />)
				.otherwise(() => null)}
		</button>
	</TableHead>
);

type TableSortState<T> = {
	column: T;
	direction: SortDirection;
};

function useTableSortState<T>(initialState: TableSortState<T>) {
	const [state, setState] = useState(initialState);

	const toggle = useCallback((column: T) => {
		setState((prev) => {
			if (prev.column !== column) return { column, direction: "desc" };
			return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
		});
	}, []);

	const register = useCallback(
		(column: T) => {
			return {
				onClick: () => toggle(column),
				direction: state.column === column ? state.direction : null,
			};
		},
		[state, toggle],
	);

	return { sortState: state, register };
}

type MapSortColumn = "datetime" | "map" | "score" | "kd-diff" | "kd" | "rating";

const MapsTable: React.FC<{ maps: PlayerMapStats[] | null }> = ({ maps }) => {
	const { sortState, register } = useTableSortState<MapSortColumn>({
		column: "datetime",
		direction: "desc",
	});

	const sortedMaps = useMemo(() => {
		if (!maps) return null;

		return [...maps].sort((a, b) => {
			const direction = match(sortState.direction)
				.with("asc", () => 1)
				.with("desc", () => -1)
				.exhaustive();

			const diff = match(sortState.column)
				.with("datetime", () => {
					const dateA = new Date(a["Created At"]);
					const dateB = new Date(b["Created At"]);
					return dateA.getTime() - dateB.getTime();
				})
				.with("map", () => {
					const mapA = a.Map;
					const mapB = b.Map;
					return mapA.localeCompare(mapB);
				})
				.with("score", () => {
					const roundsA = Number(a.Rounds);
					const roundsB = Number(b.Rounds);
					return roundsA - roundsB;
				})
				.with("kd-diff", () => {
					const diffA = Number(a.Kills) - Number(a.Deaths);
					const diffB = Number(b.Kills) - Number(b.Deaths);
					return diffA - diffB;
				})
				.with("kd", () => {
					const kdA = divide(Number(a.Kills), Number(a.Deaths));
					const kdB = divide(Number(b.Kills), Number(b.Deaths));
					return kdA - kdB;
				})
				.with("rating", () => {
					const perfA = aggregatePlayerPerformance([a]);
					const perfB = aggregatePlayerPerformance([b]);
					return perfA.rating - perfB.rating;
				})
				.exhaustive();

			return diff * direction;
		});
	}, [maps, sortState]);

	const { visible, hiddenCount, showMore } = usePaged(sortedMaps);

	return (
		<>
			<Table className="rounded-xs min-w-[36rem]">
				<TableHeader>
					<TableRow className="[&>th]:text-center">
						<SortableTableHead className="w-[30%]" {...register("datetime")}>
							Datetime
						</SortableTableHead>
						<SortableTableHead className="w-[10%]" {...register("map")}>
							Map
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("score")}>
							Score
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("kd-diff")}>
							K—D
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("kd")}>
							K/D
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("rating")}>
							<RatingColumnHead />
						</SortableTableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{visible ? (
						visible.map((map, index) => <MapRow key={index} map={map} />)
					) : (
						<TableSkeleton />
					)}
				</TableBody>
			</Table>
			<ShowMore hiddenCount={hiddenCount} onClick={showMore} />
		</>
	);
};

// Tables keep an average value neutral: a column full of yellow would shout.
export const PerformanceColor: Record<Level, string> = {
	...LevelColor,
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

const TimeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
const DateTimeFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "short",
	timeStyle: "short",
});

function readableMapDate(map: PlayerMapStats) {
	// FACEIT API currently sets "Created At" to the same value as "Match Finished At".
	// Until this is fixed, we use "Created At" if available, otherwise fallback to "Match Finished At".
	const date = new Date(map["Created At"] ?? map["Match Finished At"]);

	if (isToday(date)) return `Today, ${TimeFormat.format(date)}`;
	if (isYesterday(date)) return `Yesterday, ${TimeFormat.format(date)}`;
	return DateTimeFormat.format(date);
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

			<TableCell className="w-[10%] text-muted-foreground">{mapAlias(map.Map)}</TableCell>

			<TableCell className="w-[15%]" style={{ color: scoreColor }}>
				{ownScoreFirst(map)}
			</TableCell>

			<TableCell className="w-[15%]">
				{map.Kills}—{map.Deaths}
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

// FACEIT lists the two teams in lobby order, so the player's own score may come second.
function ownScoreFirst(map: PlayerMapStats): string {
	const scores = map.Score.split(" / ");
	return scores[1] === map["Final Score"] ? scores.reverse().join(" / ") : map.Score;
}

function matchUrl(matchId: string) {
	return `/matches/${matchId}`;
}

type SessionSortColumn = "datetime" | "maps" | "wins" | "kd-diff" | "kd" | "rating";

const SessionsTable: React.FC<{ sessions: PlayerMapStats[][] | null }> = ({ sessions }) => {
	const { sortState, register } = useTableSortState<SessionSortColumn>({
		column: "datetime",
		direction: "desc",
	});

	const sortedSessions = useMemo(() => {
		if (!sessions) return null;

		return [...sessions].sort((a, b) => {
			const direction = match(sortState.direction)
				.with("asc", () => 1)
				.with("desc", () => -1)
				.exhaustive();

			const perfA = aggregatePlayerPerformance(a);
			const perfB = aggregatePlayerPerformance(b);

			const diff = match(sortState.column)
				.with("datetime", () => {
					const dateA = new Date(a[0]["Created At"]);
					const dateB = new Date(b[0]["Created At"]);
					return dateA.getTime() - dateB.getTime();
				})
				.with("maps", () => a.length - b.length)
				.with("wins", () => {
					const winsA = a.filter((m) => m.Result === "1").length;
					const winsB = b.filter((m) => m.Result === "1").length;
					return winsA - winsB;
				})
				.with("kd-diff", () => {
					const diffA = perfA.kills - perfA.deaths;
					const diffB = perfB.kills - perfB.deaths;
					return diffA - diffB;
				})
				.with("kd", () => perfA.kd - perfB.kd)
				.with("rating", () => perfA.rating - perfB.rating)
				.exhaustive();

			return diff * direction;
		});
	}, [sortState, sessions]);

	const { visible, hiddenCount, showMore } = usePaged(sortedSessions);

	return (
		<>
			<Table className="rounded-xs min-w-[36rem]">
				<TableHeader>
					<TableRow className="[&>th]:text-center">
						<SortableTableHead className="w-[30%]" {...register("datetime")}>
							Datetime
						</SortableTableHead>
						<SortableTableHead className="w-[10%]" {...register("maps")}>
							Maps
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("wins")}>
							W/L
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("kd-diff")}>
							K—D
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("kd")}>
							K/D
						</SortableTableHead>
						<SortableTableHead className="w-[15%]" {...register("rating")}>
							<RatingColumnHead />
						</SortableTableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{visible ? (
						visible.map((session, index) => <SessionRow key={index} session={session} />)
					) : (
						<TableSkeleton />
					)}
				</TableBody>
			</Table>
			<ShowMore hiddenCount={hiddenCount} onClick={showMore} />
		</>
	);
};

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

const PageSize = 50;

function usePaged<T>(items: T[] | null) {
	const [count, setCount] = useState(PageSize);

	return {
		visible: items?.slice(0, count) ?? null,
		hiddenCount: Math.max((items?.length ?? 0) - count, 0),
		showMore: () => setCount(count + PageSize),
	};
}

const ShowMore: React.FC<{ hiddenCount: number; onClick: () => void }> = ({
	hiddenCount,
	onClick,
}) =>
	hiddenCount > 0 && (
		<Button
			// The next rows load by themselves as the button comes into view; pressing it still works.
			ref={(button) => {
				if (!button) return;

				const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onClick(), {
					rootMargin: "200px",
				});
				observer.observe(button);
				return () => observer.disconnect();
			}}
			className="w-full mt-2 text-base bg-card hover:bg-muted/50 active:scale-[0.99]"
			onClick={onClick}
		>
			Show {Math.min(hiddenCount, PageSize)} more
			<span className="ms-2 font-normal text-muted-foreground">
				{hiddenCount.toLocaleString()} left
			</span>
		</Button>
	);

const TableSkeleton: React.FC = () =>
	Array.from({ length: 10 }).map((_, index) => (
		<TableRow key={index} className="[&>td]:h-10">
			<TableCell className="w-[30%]">
				<div className="h-4 bg-muted-foreground/25 rounded-xs w-28 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[10%]">
				<div className="h-4 bg-muted-foreground/25 rounded-xs w-12 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-xs w-16 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-xs w-16 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-xs w-12 mx-auto animate-pulse" />
			</TableCell>
			<TableCell className="w-[15%]">
				<div className="h-4 bg-muted-foreground/25 rounded-xs w-12 mx-auto animate-pulse" />
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
	mapsByPlayerId: (playerId: string, version: GameVersion) => ["maps", playerId, version],
	playerByInput: (input: string) => ["player", input],
	playerDetailsById: (playerId: string) => ["player-details", playerId],
});

function usePlayerQuery(input: string, enabled: boolean = true) {
	return useQuery({
		queryKey: queryKeys.playerByInput(input).queryKey,
		queryFn: ({ signal }) => playerByInput(input, { signal }),
		enabled,
		retry: (failureCount, error) => !(error instanceof PlayerLookupError) && failureCount < 1,
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

function usePlayerDetailsQuery(playerId: string) {
	return useQuery({
		queryKey: queryKeys.playerDetailsById(playerId).queryKey,
		queryFn: ({ signal }) => fetchPlayerDetails(playerId, { signal }),
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
		setSearch(initialValue);
	}, [initialValue]);

	useEffect(() => {
		if (location !== homeUrl()) return;
		inputRef.current?.focus();
	}, [location]);

	const handleSubmit = useCallback(
		async (ev: FormEvent<HTMLFormElement>) => {
			ev.preventDefault();

			const { data, isSuccess } = await query.refetch();
			if (!isSuccess) return;

			navigate(playerUrl(data.nickname));

			// Navigation doesn't force remount for this component (-> no blur),
			// so we have to manually force blur the input.
			inputRef.current?.blur();
		},
		[navigate, query],
	);

	const onReset = useCallback(() => {
		setSearch("");
		inputRef.current?.focus();
	}, []);

	const isInitialSearch = search === initialValue && initialValue !== "";
	// The full hint would be cut mid-word in a narrower field.
	const placeholder = useMediaQuery("(min-width: 1024px)")
		? "FACEIT username, FACEIT URL, Steam URL, or Steam ID"
		: "Username or profile link";

	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				"flex flex-col gap-2 group w-full max-w-216 transition-[max-width] duration-250 ease-out motion-reduce:transition-none",
				isInitialSearch && "max-w-[24rem] focus-within:max-w-216",
			)}
		>
			<div className="relative">
				<ShieldUserIcon
					className={cn(
						"absolute left-4 top-1/2 -translate-y-1/2 size-6 sm:size-8 pointer-events-none opacity-0 transition-opacity duration-250 ease-out",
						isInitialSearch && "opacity-100 group-focus-within:opacity-0",
					)}
				/>
				<input
					value={search}
					ref={inputRef}
					onChange={(ev) => setSearch(ev.currentTarget.value)}
					placeholder={placeholder}
					aria-label="FACEIT username, FACEIT URL, Steam URL, or Steam ID"
					autoCapitalize="none"
					autoCorrect="off"
					spellCheck={false}
					enterKeyHint="search"
					className={cn(
						"w-full text-base sm:text-2xl text-ellipsis bg-background border-2 rounded-xs border-foreground/50 focus-visible:border-foreground outline-none pl-4 pr-36 sm:pr-56 py-3 sm:py-4 transition-[padding,border-color] duration-250 ease-out motion-reduce:transition-none",
						isInitialSearch &&
							"pl-12 sm:pl-14 pr-12 sm:pr-14 group-focus-within:pl-4 group-focus-within:pr-36 sm:group-focus-within:pr-56",
					)}
				/>
				<div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
					{search && (
						<Button
							type="button"
							variant="icon"
							// Keeps focus in the field, so the form can't resize and move the button mid-click.
							onMouseDown={(ev) => ev.preventDefault()}
							onClick={onReset}
							aria-label="Clear input"
						>
							<XIcon className="size-6 sm:size-8" />
						</Button>
					)}
					<Button
						type="submit"
						className={cn(
							"relative max-sm:text-base max-sm:px-3",
							isInitialSearch && "hidden group-focus-within:inline-flex",
						)}
						disabled={!input || query.isLoading}
					>
						<span
							className={cn(
								"transition-opacity duration-150 ease-out",
								query.isLoading && "opacity-0",
							)}
						>
							Show stats
						</span>
						{query.isLoading && (
							<span className="absolute inset-0 animate-in fade-in-0 duration-150 ease-out">
								<Spinner className="size-6" />
							</span>
						)}
					</Button>
				</div>
			</div>

			{query.error && (
				<p
					role="alert"
					className="text-destructive inline-flex items-start text-left animate-in fade-in-0 slide-in-from-top-1 duration-150 ease-out"
				>
					<CircleAlert className="size-5 me-2 mt-0.5 shrink-0" />
					{query.error instanceof PlayerLookupError
						? query.error.message
						: "We couldn't look up that player. Try again?"}
				</p>
			)}
		</form>
	);
};

function playerUrl(username: string) {
	return `/players/${username}`;
}

function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		() => window.matchMedia(query).matches,
	);
}

function homeUrl() {
	return "/";
}

interface PlayerHistoryEntry {
	id: string;
	nickname: string;
	avatar: string;
}

const PlayerHistoryKey = "player-history";
const MaxPlayerHistorySize = 5;

function loadPlayerHistory(): PlayerHistoryEntry[] {
	const json = localStorage.getItem(PlayerHistoryKey);
	if (json === null) return [];

	// A corrupted entry only costs the list of recent players, so start it over.
	try {
		return JSON.parse(json);
	} catch {
		return [];
	}
}

function savePlayerHistory(history: PlayerHistoryEntry[]) {
	localStorage.setItem(PlayerHistoryKey, JSON.stringify(history));
}

const usePlayerHistory = create<{
	history: PlayerHistoryEntry[];
	addToHistory: (player: PlayerHistoryEntry) => void;
	removeFromHistory: (id: string) => void;
}>((set) => ({
	history: loadPlayerHistory(),
	addToHistory: (player) =>
		set((state) => {
			const history = [player, ...state.history.filter((x) => x.id !== player.id)].slice(
				0,
				MaxPlayerHistorySize,
			);

			savePlayerHistory(history);
			return { history };
		}),
	removeFromHistory: (id) =>
		set((state) => {
			const history = state.history.filter((x) => x.id !== id);

			savePlayerHistory(history);
			return { history };
		}),
}));

const PlayerHistory: React.FC<{ current: string | undefined }> = ({ current }) => {
	const { history, removeFromHistory } = usePlayerHistory();
	const [, navigate] = useLocation();

	const others = history.filter((x) => x.nickname.toLowerCase() !== current?.toLowerCase());
	if (others.length === 0) return null;

	return (
		<div className="flex items-center gap-4">
			<HistoryIcon className="size-4 text-muted-foreground" />
			<div className="flex flex-wrap justify-center gap-2">
				{others.map((player) => (
					<div
						key={player.id}
						className="group/chip relative animate-in fade-in-0 zoom-in-95 duration-150 ease-out"
					>
						<button
							type="button"
							onClick={() => navigate(playerUrl(player.nickname))}
							className="flex items-center gap-2 py-1.5 px-3 border border-muted-foreground/25 rounded-xs hover:border-foreground/50 hover:bg-muted/50 transition-[color,background-color,border-color,scale] duration-160 ease-out active:scale-[0.97]"
						>
							<Avatar className="size-6 rounded-xs">
								<AvatarImage src={player.avatar} alt={player.nickname} />
								<AvatarFallback>{player.nickname[0]}</AvatarFallback>
							</Avatar>
							<span className="text-sm">{player.nickname}</span>
						</button>
						{/* Shown on hover; touch has no hover, so it stays visible there. */}
						<button
							type="button"
							onClick={() => removeFromHistory(player.id)}
							aria-label={`Remove ${player.nickname} from recent players`}
							className="absolute -top-2 -right-2 size-5 flex items-center justify-center rounded-full bg-muted border border-muted-foreground/25 text-muted-foreground hover:text-foreground active:text-foreground opacity-0 group-hover/chip:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity after:absolute after:-inset-2"
						>
							<XIcon className="size-3" />
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

const RegExps = {
	FaceitUrl: /^https?:\/\/(?:www\.)?faceit\.com\/[a-zA-Z-]+\/players\/([a-zA-Z0-9_ -]{1,24})\/?$/,
	FaceitUsername: /^[a-zA-Z0-9_ -]{1,24}$/,
	SteamUrlWithSteamId: /^https?:\/\/steamcommunity\.com\/profiles\/(\d{17})\/?$/,
	SteamUrlWithCustomId: /^https?:\/\/steamcommunity\.com\/id\/([a-zA-Z0-9_-]+)\/?$/,
	SteamId: /^\d{17}$/,
};

type PlayerInput =
	| { kind: "faceit-username"; username: string }
	| { kind: "steam-id"; id: string }
	| { kind: "steam-custom-id"; customId: string }
	| { kind: "invalid" };

function parseInput(input: string): PlayerInput {
	if (RegExps.SteamId.test(input)) return { kind: "steam-id", id: input };
	if (RegExps.FaceitUsername.test(input)) return { kind: "faceit-username", username: input };

	const faceitUrl = safeDecodeURIComponent(input).match(RegExps.FaceitUrl);
	if (faceitUrl) return { kind: "faceit-username", username: faceitUrl[1] };

	const steamId = input.match(RegExps.SteamUrlWithSteamId);
	if (steamId) return { kind: "steam-id", id: steamId[1] };

	const customId = input.match(RegExps.SteamUrlWithCustomId);
	if (customId) return { kind: "steam-custom-id", customId: customId[1] };

	return { kind: "invalid" };
}

function safeDecodeURIComponent(x: string): string {
	try {
		return decodeURIComponent(x);
	} catch {
		return x;
	}
}

// The input itself is the problem, so the message is shown as is and the lookup isn't retried.
class PlayerLookupError extends Error {}

function playerByInput(input: string, opts?: { signal?: AbortSignal }) {
	return match(parseInput(input))
		.with({ kind: "invalid" }, () => {
			throw new PlayerLookupError(
				"Hmm… that doesn't look like a valid FACEIT username, FACEIT URL, Steam URL, or Steam ID.",
			);
		})
		.with({ kind: "faceit-username" }, async (x) => {
			const player = await fetchPlayer(x.username, opts);
			if (!player) throw new PlayerLookupError("That player doesn't seem to exist.");
			return player;
		})
		.with({ kind: "steam-id" }, { kind: "steam-custom-id" }, async (x) => {
			const steamId = x.kind === "steam-id" ? x.id : await steamIdByCustomId(x.customId, opts);
			const player = steamId && (await fetchPlayerBySteamId(steamId, opts));
			if (!player)
				throw new PlayerLookupError("We couldn't resolve a FACEIT player from that Steam profile.");
			return player;
		})
		.exhaustive();
}

interface SteamIdResponse {
	response: { steamid?: string };
}

async function steamIdByCustomId(
	customId: string,
	opts?: { signal?: AbortSignal },
): Promise<string | null> {
	const res = await api
		.get<SteamIdResponse>("/steam/resolve", {
			searchParams: { vanityurl: customId },
			signal: opts?.signal,
		})
		.json();

	return res.response.steamid ?? null;
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

// FACEIT's exact lookup is case-sensitive, and its search is fuzzy: past the first
// pages it keeps returning loosely related players without end.
const MaxSearchPages = 2;

async function fetchPlayer(
	username: string,
	opts?: { signal?: AbortSignal },
): Promise<PlayerResponse | null> {
	const exact = await fetchPlayerByNickname(username, opts);
	if (exact) return exact;

	const target = username.toLowerCase();

	// The exact lookup is case-sensitive ("s1mple" is "S1mple"), so the usual spellings go
	// before the fuzzy search, which may never reach the player.
	const spellings = new Set([
		username.charAt(0).toUpperCase() + username.slice(1),
		target,
		username.toUpperCase(),
	]);
	spellings.delete(username);
	const respelled = (
		await Promise.all([...spellings].map((x) => fetchPlayerByNickname(x, opts)))
	).find((x) => x !== null);
	if (respelled) return respelled;

	for (let page = 0; page < MaxSearchPages; page++) {
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

		const player = items.find((p) => p.nickname.toLowerCase() === target);
		if (player) return player;

		if (items.length < FaceitQueryLimit) return null;
	}

	return null;
}

async function fetchPlayerByNickname(
	nickname: string,
	opts?: { signal?: AbortSignal },
): Promise<PlayerResponse | null> {
	const res = await faceitApi.get<PlayerResponse>("players", {
		searchParams: { nickname },
		signal: opts?.signal,
		throwHttpErrors: (status) => status !== 404,
	});

	return res.status === 404 ? null : await res.json();
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

interface PlayerResponse {
	player_id: string;
	nickname: string;
	avatar: string;
	country: string;
}

async function fetchPlayerBySteamId(
	steamId: string,
	opts?: { signal?: AbortSignal },
): Promise<PlayerResponse | null> {
	const res = await faceitApi.get<PlayerResponse>("players", {
		searchParams: { game: "cs2", game_player_id: steamId },
		signal: opts?.signal,
		// FACEIT answers 404 when no account is linked to the Steam ID.
		throwHttpErrors: (status) => status !== 404,
	});

	return res.status === 404 ? null : await res.json();
}

interface PlayerDetailsResponse {
	games: Record<string, { faceit_elo: number; skill_level: number }>;
}

async function fetchPlayerDetails(
	playerId: string,
	opts?: { signal?: AbortSignal },
): Promise<PlayerDetailsResponse> {
	return await faceitApi
		.get<PlayerDetailsResponse>(`players/${playerId}`, { signal: opts?.signal })
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
	return `/hltv/flags/${countryCode.toUpperCase()}.gif`;
}
