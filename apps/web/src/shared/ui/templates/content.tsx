import {useState} from "react";
import {useLocation, useParams} from "wouter";

import {Container, Icon} from "@shared/ui";

export const ContentTemplate: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<div className="w-full min-h-screen py-44">
		<Container>
			<div className="flex flex-col space-y-72">
				<div className="flex flex-col text-center items-center">
					<h1 className="font-black text-52">
						<span className="text-fixed-faceit">FACEIT</span>
						<span className="text-fixed-hltv text-[6.8rem]">
							perf
						</span>
					</h1>

					<span className="text-paper-contrast/75 text-18">
						Get your{" "}
						<span className="text-fixed-faceit font-medium">
							FACEIT CS2
						</span>{" "}
						stats in a{" "}
						<span className="text-fixed-hltv font-medium">
							HLTV-like
						</span>{" "}
						fashion.
					</span>
				</div>

				<SearchForm />

				{children}
			</div>
		</Container>

		<div className="absolute right-44 top-44 xs:hidden">
			<a
				href="https://github.com/iffypixy/faceitperf"
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon.GitHub className="w-52 h-auto fill-white cursor-pointer duration-700 animate-bounce" />
			</a>
		</div>
	</div>
);

export const SearchForm: React.FC = () => {
	const {username: initialUsername} = useParams() as {
		username?: string;
	};

	const [username, setUsername] = useState(initialUsername || "");

	const [, navigate] = useLocation();

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();

				if (username) {
					navigate(`/@/${username}`);
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
				className="text-32 bg-fixed-faceit/5 border-fixed-faceit border-4 outline-none rounded-12 w-[44rem] h-[8rem] py-40 px-32"
			/>
		</form>
	);
};
