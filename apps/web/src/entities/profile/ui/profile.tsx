import {useRef} from "react";
import {useParams} from "wouter";
import {toBlob as html2blob} from "html-to-image";
import toast from "react-hot-toast";

import noavatar from "@shared/assets/avatar.webp";
import {useStore} from "@shared/lib/store";
import {Loader} from "@shared/ui/loader";
import {Icon, Tooltip, TooltipContent, TooltipTrigger} from "@shared/ui";

import {useProfile} from "../queries";
import {StatsVisualizor} from "./stats-visualizor";

export const Profile: React.FC = () => {
	const ref = useRef<HTMLDivElement | null>(null);

	const {username} = useParams() as {
		username: string;
	};

	const {isCurrentFormOpen} = useStore();

	const {profile, isFetching, isError} = useProfile(username);

	const form = isCurrentFormOpen
		? profile?.currentForm
		: profile?.lifetimeForm;

	if (isFetching) return <Loader />;

	if (isError)
		return (
			<h3 className="text-center text-22 text-paper-contrast/75">
				Unfortunately, this player was not found. :c
			</h3>
		);

	if (!profile) return null;

	return (
		<div className="flex flex-col space-y-12">
			<div className="w-full max-w-[98rem] mx-auto">
				<div
					ref={ref}
					className="w-full flex flex-col space-y-68 bg-fixed-profile bg-profile rounded-8 border border-fixed-profile shadow-sm p-64 pb-84 xs:pb-64 xs:p-44 animate-in zoom-in-75 slide-in-from-top-44 duration-500"
				>
					<div className="flex relative">
						<div className="flex items-center space-x-30 overflow-hidden w-full">
							<a
								href={profile?.faceit}
								target="_blank"
								rel="noopener noreferrer"
							>
								<img
									src={`https://corsproxy.io/?${encodeURIComponent(`${profile?.avatar}?x=${Date.now()}`)}`}
									alt="An avatar of a player"
									onError={(event) => {
										event.currentTarget.src = noavatar;
										event.currentTarget.dataset.placeholder =
											"1";
									}}
									className="min-w-92 max-w-92 aspect-square rounded-8 border-fixed-profile border-2 data-[placeholder]:border-0"
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

						<IndividualFormToggle
							matches={{
								lifetime: profile.lifetimeForm.matches,
								recent: profile.currentForm.matches,
							}}
						/>
					</div>

					{form && <StatsVisualizor stats={form.stats} />}
				</div>
			</div>

			<div className="bg-fixed-profile border-fixed-hltv/25 border px-18 py-12 rounded-8 w-fit flex space-x-10 mx-auto">
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={() => {
								html2blob(ref.current!, {
									backgroundColor: "#2b343d",
									includeQueryParams: true,
									quality: 1,
								}).then((blob) => {
									navigator.clipboard.write([
										new ClipboardItem({
											"image/png": blob!,
										}),
									]);
								});

								toast.success("Profile image has been copied.");
							}}
							className="p-8 group active:translate-y-2 hover:scale-125 ease-in-out duration-200"
						>
							<Icon.CopyImage className="w-38 h-auto group-hover:fill-fixed-hltv duration-300 inline-flex fill-paper-contrast/100" />
						</button>
					</TooltipTrigger>

					<TooltipContent>Copy profile image</TooltipContent>
				</Tooltip>

				<div className="w-6 h-6 rounded-full bg-fixed-hltv my-auto flex" />

				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={() => {
								navigator.clipboard.writeText(
									window.location.href,
								);

								toast.success("Profile link has been copied.");
							}}
							className="p-8 group active:translate-y-2 hover:scale-125 ease-in-out duration-200"
						>
							<Icon.Copy className="w-32 h-auto group-hover:fill-fixed-hltv duration-300 inline-flex fill-paper-contrast/100" />
						</button>
					</TooltipTrigger>

					<TooltipContent>Copy profile link</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
};

const IndividualFormToggle: React.FC<{
	matches: {
		lifetime: number;
		recent: number;
	};
}> = ({matches}) => {
	const tooltipTriggerRef = useRef(null);

	const {isCurrentFormOpen, setIsCurrentFormOpen} = useStore();

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					ref={tooltipTriggerRef}
					role="presentation"
					onClick={(event) => {
						event.preventDefault();

						setIsCurrentFormOpen(!isCurrentFormOpen);
					}}
					className="text-paper-contrast/60 uppercase text-14 cursor-pointer absolute right-0 top-0 select-none underline underline-offset-2"
				>
					{isCurrentFormOpen ? "Current form" : "Lifetime stats"}
				</span>
			</TooltipTrigger>

			<TooltipContent
				align="center"
				onPointerDownOutside={(event) => {
					if (event.target === tooltipTriggerRef.current) {
						event.preventDefault();
					}
				}}
			>
				<span>
					{isCurrentFormOpen
						? `Based on past 2 weeks; ${matches.recent} matches`
						: `Based on ${matches.lifetime} matches`}
				</span>
			</TooltipContent>
		</Tooltip>
	);
};
