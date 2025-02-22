import {Match} from "../types";

export const groupMatchesIntoSessions = (matches: Match[]) => {
	const SESSION_INTERVAL_HOURS = 4;
	const MATCH_DURATION = 0.65;

	const sessions: Match[][] = [];

	matches.forEach((match) => {
		const time = new Date(match["Created At"]).getTime();

		const empty = sessions.length === 0;

		if (empty) {
			sessions.push([match]);
		} else {
			const lastSession = sessions[sessions.length - 1];
			const lastMatch = lastSession[lastSession.length - 1];

			const lastMatchTime = new Date(lastMatch["Created At"]).getTime();

			const timeDifference = (lastMatchTime - time) / (1000 * 60 * 60);

			const timeThreshold = SESSION_INTERVAL_HOURS + MATCH_DURATION;

			if (timeDifference <= timeThreshold) {
				lastSession.push(match);
			} else {
				sessions.push([match]);
			}
		}
	});

	return sessions;
};
