import * as datefns from "date-fns";

import {Match} from "../types";

export const groupMatchesIntoSessions = (matches: Match[]) => {
	const sessions: Record<string, Match[]> = {};

	matches.forEach((match) => {
		const dateOnly = datefns.format(match["Created At"], "dd/MM/yy");

		if (!sessions[dateOnly]) {
			sessions[dateOnly] = [];
		}

		sessions[dateOnly].push(match);
	});

	return Object.values(sessions);
};
