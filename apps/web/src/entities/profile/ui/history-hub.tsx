import * as datefns from "date-fns";
import {cx} from "class-variance-authority";
import {useParams} from "wouter";

import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
	Table,
	TableRow,
	TableHeader,
	TableData,
} from "@shared/ui";

import {useProfile} from "../queries";

export const HistoryHub: React.FC = () => {
	const {username} = useParams() as {
		username: string;
	};

	const {profile, isFetching} = useProfile(username);

	if (!profile) return null;

	if (isFetching) return null;

	return (
		<div className="flex flex-col space-y-12 w-full max-w-[68rem] mx-auto">
			<Tabs defaultValue="matches" className="flex flex-col space-y-16">
				<TabsList className="w-full space-x-16 bg-fixed-profile border-fixed-hltv/25 border">
					<TabsTrigger value="matches" className="w-1/2">
						Matches
					</TabsTrigger>

					<TabsTrigger value="sessions" className="w-1/2">
						Sessions
					</TabsTrigger>
				</TabsList>

				<TabsContent value="matches">
					<Table className="w-full">
						<thead>
							<TableRow className="border-r-4 border-r-[#364250]">
								<TableHeader className="w-[20%]">
									Date
								</TableHeader>

								<TableHeader className="w-[15%]">
									Map
								</TableHeader>

								<TableHeader className="w-[20%]">
									K - D
								</TableHeader>

								<TableHeader className="w-[20%]">
									K/D
								</TableHeader>

								<TableHeader className="w-[25%]">
									Rating 2.0
								</TableHeader>
							</TableRow>
						</thead>

						<tbody>
							{profile?.matches.map((match, idx) => {
								const kd = +(
									match.kills / match.deaths
								).toFixed(2);

								const rating = +match.rating.toFixed(2);

								return (
									<TableRow
										key={idx}
										className={cx("border-r-4", {
											"border-r-[#fc1d1d]":
												match.result === 0,
											"border-r-[#09c100]":
												match.result === 1,
										})}
									>
										<TableData className="w-[20%]">
											{datefns.format(
												new Date(match.date),
												"dd/MM/yy",
											)}
										</TableData>

										<TableData className="w-[15%]">
											<a
												href={match.faceit}
												target="_blank"
												rel="noopener noreferrer"
												className="text-[#87a3bf]"
											>
												{
													{
														de_mirage: "mrg",
														de_anubis: "anb",
														de_inferno: "inf",
														de_dust2: "d2",
														de_overpass: "ovp",
														de_nuke: "nuke",
														de_vertigo: "vtg",
														de_ancient: "anc",
													}[match.map]
												}
											</a>
										</TableData>

										<TableData className="w-[20%]">
											{`${match.kills} - ${match.deaths}`}
										</TableData>

										<TableData
											className={cx(
												"w-[20%] font-semibold",
												{
													"text-[#fc1d1d]": kd < 0.95,
													"text-[#09c100]": kd > 1.05,
													"text-[#929a9e]":
														kd >= 0.95 &&
														kd <= 1.05,
												},
											)}
										>
											{kd}
										</TableData>

										<TableData
											className={cx(
												"w-[25%] font-semibold",
												{
													"text-[#fc1d1d]":
														rating < 0.95,
													"text-[#09c100]":
														rating > 1.05,
													"text-[#929a9e]":
														rating >= 0.95 &&
														rating <= 1.05,
												},
											)}
										>
											{rating}
										</TableData>
									</TableRow>
								);
							})}
						</tbody>
					</Table>
				</TabsContent>

				<TabsContent value="sessions">
					<Table className="w-full">
						<thead>
							<TableRow>
								<TableHeader className="w-[25%]">
									Date
								</TableHeader>

								<TableHeader className="w-[25%]">
									Matches
								</TableHeader>

								<TableHeader className="w-[25%]">
									K/D
								</TableHeader>

								<TableHeader className="w-[25%]">
									Rating 2.0
								</TableHeader>
							</TableRow>
						</thead>

						<tbody>
							{profile?.sessions.map((stats, idx) => {
								const kd = +stats.kd.toFixed(2);

								const rating = +stats.rating.toFixed(2);

								return (
									<TableRow key={idx}>
										<TableData className="w-[25%]">
											{datefns.format(
												new Date(stats.date),
												"dd/MM/yy",
											)}
										</TableData>

										<TableData className="w-[25%]">
											{stats.matches}
										</TableData>

										<TableData
											className={cx(
												"w-[25%] font-semibold",
												{
													"text-[#fc1d1d]": kd < 0.95,
													"text-[#09c100]": kd > 1.05,
													"text-[#929a9e]":
														kd >= 0.95 &&
														kd <= 1.05,
												},
											)}
										>
											{kd}
										</TableData>

										<TableData
											className={cx(
												"w-[25%] font-semibold",
												{
													"text-[#fc1d1d]":
														rating < 0.95,
													"text-[#09c100]":
														rating > 1.05,
													"text-[#929a9e]":
														rating >= 0.95 &&
														rating <= 1.05,
												},
											)}
										>
											{rating}
										</TableData>
									</TableRow>
								);
							})}
						</tbody>
					</Table>
				</TabsContent>
			</Tabs>
		</div>
	);
};
