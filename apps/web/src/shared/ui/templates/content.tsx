import {useEffect, useState} from "react";
import {useLocation, useParams} from "wouter";
import toast from "react-hot-toast";

import {Container, Icon} from "@shared/ui";
import {
	extractSteamId,
	isValidSteamProfileUrl,
	loadFaceitUsernameBySteamId,
} from "@shared/lib/steam";
import {isValidFaceitUsername} from "@shared/lib/faceit";

export const ContentTemplate: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<div className="w-full min-h-screen py-44">
		<Container>
			<div className="flex flex-col space-y-72">
				<div className="flex flex-col text-center items-center">
					<a href="/">
						<h1 className="font-black text-52">
							<span className="text-fixed-faceit">FACEIT</span>
							<span className="text-fixed-hltv text-[6.8rem]">
								perf
							</span>
						</h1>
					</a>

					<span className="text-paper-contrast/80 text-18">
						View your{" "}
						<span className="text-fixed-faceit font-bold">
							FACEIT CS2
						</span>{" "}
						performance in an{" "}
						<span className="text-fixed-hltv font-bold">
							HLTV-style
						</span>{" "}
						format.
					</span>
				</div>

				<SearchForm />

				{children}
			</div>
		</Container>

		<div className="fixed right-44 top-44 xs:hidden md:absolute">
			<a
				href="https://github.com/iffypixy/faceitperf"
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon.GitHub className="w-52 h-auto fill-white cursor-pointer duration-500 ease-in-out hover:scale-125" />
			</a>
		</div>
	</div>
);

export const SearchForm: React.FC = () => {
	const {username: initialUsername} = useParams() as {
		username?: string;
	};

	const [username, setUsername] = useState(initialUsername || "");

	useEffect(() => {
		setUsername(initialUsername || "");
	}, [initialUsername]);

	const [, navigate] = useLocation();

	return (
		<form
			onSubmit={async (event) => {
				event.preventDefault();

				if (username) {
					const id = username.trim();

					if (isValidFaceitUsername(id)) {
						navigate(`/@/${username}`);
					} else if (isValidSteamProfileUrl(id)) {
						const steamId = await extractSteamId(id);

						if (steamId) {
							const faceitUsername =
								await loadFaceitUsernameBySteamId(steamId);

							if (faceitUsername) {
								navigate(`/@/${faceitUsername}`);
							} else {
								toast.error(
									"Sorry, the player was not found 😔",
								);
							}
						}
					} else {
						toast.error("Provide valid username 🙏");
					}
				}
			}}
			className="flex items-center justify-center"
		>
			<input
				value={username}
				onChange={(event) => {
					setUsername(event.currentTarget.value);
				}}
				placeholder="s1mple"
				autoFocus
				className="text-32 bg-fixed-faceit/5 border-fixed-faceit border-4 outline-none rounded-12 w-[54rem] h-[8rem] py-40 px-32"
			/>
		</form>
	);
};
