export interface Match {
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
	"Triple Kills": string;
	"Updated At": string;
	Winner: string;
}

export interface LifetimeStats {
	"Win Rate %": string;
	"K/D Ratio": string;
	"Average Headshots %": string;
	"Recent Results": string[];
	Matches: string;
	"Total Headshots %": string;
	"Current Win Streak": string;
	"Longest Win Streak": string;
	Wins: string;
	"Average K/D Ratio": string;
}

export interface LoadMatchesReq {
	playerId: string;
	limit?: number;
	skip?: number;
}
