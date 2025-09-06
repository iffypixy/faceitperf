export type Score = {
	team1: (TeamScore | undefined)[];
	team2: (TeamScore | undefined)[];
};

export type TeamScore = {
	teamId: string;
	firstHalfScore: string;
	secondHalfScore: string;
	score: string;
	overtimeScore: string;
};
