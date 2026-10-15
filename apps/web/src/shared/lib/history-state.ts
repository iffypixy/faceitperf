import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

/**
 * Like `useState`, but the value is kept in the current history entry, so going Back to the
 * page brings it back. A new entry (a link, a search) starts from `initial`.
 */
export function useHistoryState<T>(key: string, initial: T) {
	const [value, setValue] = useState<T>(() => window.history.state?.[key] ?? initial);

	const set = useCallback(
		(next: T) => {
			patchHistoryState({ [key]: next });
			setValue(next);
		},
		[key],
	);

	return [value, set] as const;
}

/**
 * Returns each history entry to the scroll position it was left at and starts new entries at
 * the top. The browser can't do this itself: on Back, the page is rebuilt after it has tried.
 */
export function useScrollRestoration() {
	const [location] = useLocation();
	const saveTimer = useRef<number>(undefined);

	useEffect(() => {
		window.history.scrollRestoration = "manual";

		// Saved once scrolling pauses: Safari throws when history is rewritten too often.
		const save = () => {
			window.clearTimeout(saveTimer.current);
			saveTimer.current = window.setTimeout(
				() => patchHistoryState({ scrollY: window.scrollY }),
				200,
			);
		};

		window.addEventListener("scroll", save, { passive: true });
		return () => window.removeEventListener("scroll", save);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs on every navigation, which `location` marks
	useLayoutEffect(() => {
		window.scrollTo(0, window.history.state?.scrollY ?? 0);

		// A save still pending belongs to the page just left, not to this entry.
		return () => window.clearTimeout(saveTimer.current);
	}, [location]);
}

/**
 * Whether the current history entry is being returned to (Back, Forward, a reload) rather than
 * opened for the first time. Only entries whose page was scrolled are recognised.
 */
export function isRestoredEntry(): boolean {
	return window.history.state?.scrollY !== undefined;
}

function patchHistoryState(patch: Record<string, unknown>) {
	window.history.replaceState({ ...window.history.state, ...patch }, "");
}
