import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { countryName, flagUrl } from "~/entities/country";
import { api } from "~/shared/api";
import { assert } from "~/shared/lib/assert";
import { translate } from "~/shared/lib/language";

const t = translate({
	en: { label: "Recent searches" },
	ru: { label: "Недавние поиски" },
});

// Each record is a Function request, which the free plan caps per day. Bots open profiles straight
// from their URLs, so the page a visit lands on doesn't count, and a profile opened again (back from
// a match) counts once.
const landingPath = window.location.pathname;
const recorded = new Set<string>();

/**
 * Adds a player to the feed of recent searches when their profile is opened from within the site,
 * once per visit.
 */
export function recordSearch(playerId: string) {
	if (window.location.pathname === landingPath || recorded.has(playerId)) return;
	recorded.add(playerId);
	api
		.post("/faceit/lookups", { json: { playerId } })
		// A lost search only leaves the feed a player short.
		.catch(() => {});
}

/** The players searched on faceitperf lately, newest first, coming in live as people search. */
export const RecentSearches: React.FC = () => {
	const query = useQuery({
		queryKey: ["recentSearches"],
		queryFn: () => api.get("/faceit/lookups").json<Search[]>(),
		refetchInterval: PollMs,
		// Back on the tab, the row catches up with what was searched meanwhile.
		refetchOnWindowFocus: true,
		// Back on the home page, the row starts afresh, rather than from an old list it then catches
		// up on name by name.
		gcTime: 0,
	});
	const searches = useStream(query.data);

	// The row is an extra: without it, or before anyone has searched, the page is still whole.
	if (searches ? searches.length === 0 : query.isError) return null;

	return (
		// The row's height is kept while it loads, so the page doesn't move when it comes in.
		<div className="w-full max-w-216 mx-auto h-8 flex items-center">
			{searches && (
				// Vertical swipes still scroll the page, and a sideways one at either end doesn't go back a
				// page. New names mustn't move it, hence no scroll anchoring. It reaches past the row by the
				// list's padding, so the first flag lines up with the search box.
				<div
					ref={mountRow}
					className="min-w-0 -mx-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [overflow-anchor:none] scroll-px-[8%] select-none [mask-image:linear-gradient(to_right,transparent,#000_var(--fade-before),#000_calc(100%_-_var(--fade-after)),transparent)] animate-in fade-in-0 duration-300 ease-out"
				>
					{/* Positioned, so the items' offsets count from the list, and padded for the focus ring
					    of a name at either end. */}
					<ul aria-label={t.label} className="relative flex w-max items-center gap-10 p-1">
						{searches.map((search) => (
							<li key={search.player_id} data-player-id={search.player_id}>
								<Link
									href={`/players/${search.nickname}`}
									className="flex items-center gap-2 whitespace-nowrap"
								>
									<img
										src={flagUrl(search.country)}
										alt={countryName(search.country)}
										width={30}
										height={20}
										className="w-6 shrink-0 border border-background"
									/>
									<span className="font-bold text-primary-foreground">{search.nickname}</span>
								</Link>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

interface Search {
	player_id: string;
	nickname: string;
	country: string;
	looked_up_at: number;
}

// How often the row checks for new searches. Every check is a Function request, which the free
// plan caps per day.
const PollMs = 60 * 1000;

/**
 * The searches the row shows: all there are at first, and then each new one on its own, spread over
 * the wait for the next check, so the row moves on as people search rather than in jumps.
 */
function useStream(data: Search[] | undefined) {
	const [shown, setShown] = useState<Search[]>();
	const newestShown = useRef<number>(undefined);

	useEffect(() => {
		if (!data) return;
		if (newestShown.current === undefined) {
			newestShown.current = data[0]?.looked_up_at ?? 0;
			setShown(data);
			return;
		}

		// Oldest first. The ones a previous check left waiting come again, so they're spread anew.
		const arrivals = data.filter((x) => x.looked_up_at > (newestShown.current ?? 0)).reverse();
		const timers = arrivals.map((search, index) =>
			setTimeout(
				() => {
					newestShown.current = search.looked_up_at;
					setShown((shown = []) =>
						[search, ...shown.filter((x) => x.player_id !== search.player_id)].slice(
							0,
							data.length,
						),
					);
				},
				(index * PollMs) / arrivals.length,
			),
		);
		return () => timers.forEach(clearTimeout);
	}, [data]);

	return shown;
}

// How quickly a wheel's glide gets where it's going, as the period of a critically damped spring:
// it eases in and out, and another turn mid-glide carries its speed on. Apple's for moving things.
const GlideResponse = 0.3;
// Firefox counts a wheel's turn in lines, three to a notch, where the other browsers scroll 100 px.
const WheelLine = 40;

// Names make room by moving as one; a new one fades in once the room starts to open.
const Slide: KeyframeAnimationOptions = {
	duration: 600,
	easing: "cubic-bezier(0.77, 0, 0.175, 1)",
};
const Appear: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

// A finger or a trackpad scrolls the row natively, and a mouse wheel glides it along. New searches
// come in at its start; further along, the names in view stay where they are.
function mountRow(el: HTMLDivElement | null) {
	if (!el) return;
	const list = el.firstElementChild;
	assert(list instanceof HTMLElement);

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let glide: { position: number; velocity: number; target: number } | null = null;
	let frame = 0;
	// Where the row last moved itself to, so its own scroll events aren't taken for a hand's.
	let movedTo = 0;

	const end = () => el.scrollWidth - el.clientWidth;
	const clamp = (x: number) => Math.min(Math.max(x, 0), end());

	// The edges fade only where the row goes on, so its start and end show.
	const fade = () => {
		const width = el.clientWidth * 0.08;
		el.style.setProperty("--fade-before", `${Math.round(Math.min(el.scrollLeft, width))}px`);
		el.style.setProperty("--fade-after", `${Math.round(Math.min(end() - el.scrollLeft, width))}px`);
	};
	fade();
	const resize = new ResizeObserver(fade);
	resize.observe(el);
	resize.observe(list);

	let lefts = itemLefts(list);
	const feed = new MutationObserver(() => {
		const before = lefts;
		lefts = itemLefts(list);

		// Everything ahead of the old first name is new, a player searched again included.
		const oldFirst = before.keys().next().value ?? "";
		const items = [...list.children] as HTMLElement[];
		const index = items.findIndex((x) => playerIdOf(x) === oldFirst);
		const arrivals = index === -1 ? items.length : index;
		const shift = index > 0 ? (lefts.get(oldFirst) ?? 0) - (before.get(oldFirst) ?? 0) : 0;

		// Scrolled along, the row keeps the names in view where they were.
		const hold = el.scrollLeft > 0 ? shift : 0;
		if (hold !== 0) {
			el.scrollLeft += hold;
			movedTo = el.scrollLeft;
			if (glide) {
				glide.position += hold;
				glide.target += hold;
			}
		}
		fade();

		if (reducedMotion.matches) {
			for (const item of items.slice(0, arrivals)) item.animate(Appear, 400);
			return;
		}
		items.forEach((item, position) => {
			const id = playerIdOf(item);
			const from =
				(position < arrivals ? -shift : (before.get(id) ?? 0) - (lefts.get(id) ?? 0)) + hold;
			if (from !== 0)
				item.animate([{ transform: `translateX(${from}px)` }, { transform: "none" }], Slide);
			if (position < arrivals)
				item.animate(Appear, {
					duration: 400,
					delay: 200,
					easing: "cubic-bezier(0.23, 1, 0.32, 1)",
					fill: "backwards",
				});
		});
	});
	feed.observe(list, { childList: true });

	const glideTo = (target: number) => {
		if (glide) {
			glide.target = target;
			return;
		}
		glide = { position: el.scrollLeft, velocity: 0, target };
		frame = requestAnimationFrame(function step(now: number, last = now) {
			if (!glide) return;
			// The spring's exact motion over the frame, which holds however long the frame took.
			const omega = (2 * Math.PI) / GlideResponse;
			const elapsed = Math.min(now - last, 100) / 1000;
			const distance = glide.position - glide.target;
			const pull = glide.velocity + omega * distance;
			const decay = Math.exp(-omega * elapsed);
			glide.position = glide.target + (distance + pull * elapsed) * decay;
			glide.velocity = (glide.velocity - omega * pull * elapsed) * decay;

			const isSettled =
				Math.abs(glide.position - glide.target) < 0.5 && Math.abs(glide.velocity) < 10;
			el.scrollLeft = isSettled ? glide.target : glide.position;
			movedTo = el.scrollLeft;
			if (isSettled) glide = null;
			else frame = requestAnimationFrame((next) => step(next, now));
		});
	};

	const listening = new AbortController();
	const { signal } = listening;

	el.addEventListener(
		"scroll",
		() => {
			fade();
			// A finger or a trackpad took over from the wheel.
			if (Math.abs(el.scrollLeft - movedTo) < 1) return;
			cancelAnimationFrame(frame);
			glide = null;
		},
		{ signal },
	);
	el.addEventListener(
		"wheel",
		(ev) => {
			if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
			const delta = ev.deltaY * (ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? WheelLine : 1);
			const from = glide?.target ?? el.scrollLeft;
			// A wheel turns up and down, which over the row means along it, until the row has no further
			// to go and the wheel goes back to scrolling the page. Within a pixel, as an offset can stop
			// a fraction short of its end.
			if ((delta < 0 ? from : end() - from) < 1) return;
			ev.preventDefault();
			glideTo(clamp(from + delta));
		},
		{ passive: false, signal },
	);

	return () => {
		cancelAnimationFrame(frame);
		resize.disconnect();
		feed.disconnect();
		listening.abort();
	};
}

function playerIdOf(item: HTMLElement): string {
	const id = item.dataset.playerId;
	assert(id);
	return id;
}

function itemLefts(list: HTMLElement): Map<string, number> {
	return new Map(([...list.children] as HTMLElement[]).map((x) => [playerIdOf(x), x.offsetLeft]));
}
