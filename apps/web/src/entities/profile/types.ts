export interface Player {
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
