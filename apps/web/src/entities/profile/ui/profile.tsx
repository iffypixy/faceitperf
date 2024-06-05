import {useParams} from "wouter";

import noavatar from "@shared/assets/avatar.webp";
import {useStore} from "@shared/lib/store";
import {Loader} from "@shared/ui/loader";

import {useProfile} from "../queries";
import {StatsVisualizor} from "./stats-visualizor";

export const Profile: React.FC = () => {
	const {username} = useParams() as {
		username: string;
	};

	const {setIsCurrentFormOpen, isCurrentFormOpen} = useStore();

	const {profile, isFetching, isError} = useProfile(username);

	const stats = isCurrentFormOpen
		? profile?.currentForm
		: profile?.lifetimeStats;

	if (isFetching) return <Loader />;

	if (isError)
		return (
			<h3 className="text-center text-22 text-paper-contrast/75">
				Unfortunately, this player was not found. :c
			</h3>
		);

	if (!profile) return null;

	return (
		<div className="w-full max-w-[98rem] mx-auto flex flex-col space-y-68 bg-fixed-profile bg-profile rounded-6 border border-fixed-hltv/25 shadow-sm p-64 xs:p-44 animate-in zoom-in-75 slide-in-from-top-44 duration-500">
			<div className="flex relative">
				<div className="flex items-center space-x-30 overflow-hidden w-full">
					<a
						href={profile?.faceit}
						target="_blank"
						rel="noopener noreferrer"
					>
						<img
							src={profile?.avatar}
							alt="An avatar of a player"
							onError={(event) => {
								event.currentTarget.src = noavatar;
								event.currentTarget.dataset.placeholder = "1";
							}}
							className="min-w-92 max-w-92 aspect-square rounded-8 border-fixed-hltv border data-[placeholder]:border-0"
						/>
					</a>

					<a
						href={profile?.faceit}
						target="_blank"
						rel="noopener noreferrer"
					>
						<h3 className="text-paper-contrast font-black text-52 leading-[0.8] xs:text-28">
							{profile?.username}
						</h3>
					</a>
				</div>

				<span
					role="presentation"
					onClick={() => {
						setIsCurrentFormOpen(!isCurrentFormOpen);
					}}
					className="text-paper-contrast/60 uppercase text-12 cursor-pointer absolute right-0 top-0"
				>
					{isCurrentFormOpen ? "Current form" : "Lifetime stats"}
				</span>
			</div>

			{stats && <StatsVisualizor stats={stats} />}
		</div>
	);
};
