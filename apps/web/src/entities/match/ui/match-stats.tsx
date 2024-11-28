import {cx} from "class-variance-authority";
import {twMerge} from "tailwind-merge";

import {insertNumberSign} from "@shared/lib/auxiliary";
import {Avatar, Table, TableData, TableHeader, TableRow} from "@shared/ui";

interface MatchStatsProps {
	team: {
		avatar: string;
		name: string;
		roster: {
			id: string;
			username: string;
			kills: number;
			deaths: number;
			adr: number;
			kast: number;
			rating: number;
			country: string;
		}[];
	};
}

export const MatchStats: React.FC<MatchStatsProps> = ({team}) => (
	<Table>
		<thead>
			<Row className="!bg-[#232d38] border-none">
				<Header className="w-[52.5%] justify-start px-16 py-8">
					<div className="flex items-center space-x-12">
						<Avatar
							src={team.avatar}
							alt="First team's avatar"
							className="w-32 h-auto rounded-full"
						/>

						<span>{team.name}</span>
					</div>
				</Header>

				<Header className="w-[10%]">K - D</Header>

				<Header className="w-[7.5%]">+/-</Header>

				<Header className="w-[10%]">ADR</Header>

				<Header className="w-[10%]">KAST</Header>

				<Header className="w-[10%]">Rating</Header>
			</Row>
		</thead>

		<tbody>
			{team.roster.map((player) => (
				<Row key={player.id}>
					<Data className="w-[52.5%] !justify-start !px-16">
						<div className="flex items-center space-x-6">
							<img
								src={`https://flagcdn.com/${player.country.toLowerCase()}.svg`}
								alt={player.country}
								className="w-24 border rounded-2 border-[#000]"
							/>

							<a href={`/@/${player.username}`} target="_blank">
								{player.username}
							</a>
						</div>
					</Data>

					<Data className="w-[10%]">
						{player.kills} - {player.deaths}
					</Data>

					<Data
						className={cx("w-[7.5%]", {
							"!text-[#09c100]": player.kills > player.deaths,
							"!text-[#fc1d1d]": player.kills < player.deaths,
						})}
					>
						{insertNumberSign(player.kills - player.deaths)}
					</Data>

					<Data className="w-[10%]">{player.adr.toFixed(1)}</Data>

					<Data className="w-[10%]">{player.kast.toFixed(1)}</Data>

					<Data className="w-[10%]">{player.rating.toFixed(2)}</Data>
				</Row>
			))}
		</tbody>
	</Table>
);

const Row: React.FC<React.ComponentProps<typeof TableRow>> = (props) => (
	<TableRow
		{...props}
		className={twMerge(
			cx(
				"first:bg-[#2e3844] bg-[#2e3844] even:!bg-[#232d38]",
				props.className,
			),
		)}
	/>
);

const Data: React.FC<React.ComponentProps<typeof TableData>> = (props) => (
	<TableData
		{...props}
		className={twMerge(cx("text-14 xs:text-12", props.className))}
	/>
);

const Header: React.FC<React.ComponentProps<typeof TableHeader>> = (props) => (
	<TableHeader
		{...props}
		className={cx(
			"text-14 flex items-center justify-center py-8 xs:text-12",
			props.className,
		)}
	/>
);
