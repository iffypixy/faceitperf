import { CircleQuestionMark, GiftIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

import {
	Container,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	GitHubIcon,
} from "@shared/ui";
import ScreenshotProfile from "@shared/assets/images/screenshots/profile.webp";

export const ContentTemplate: React.FC<React.PropsWithChildren> = ({ children }) => (
	<div className="fixed inset-0 grid grid-rows-[auto,1fr] overflow-auto">
		<header className="bg-background-light shadow-sm shadow-background z-10 py-4">
			<Container>
				<div className="flex items-center justify-between">
					<a
						href="https://github.com/iffypixy/faceitperf"
						target="_blank"
						rel="noopener noreferrer"
					>
						<GitHubIcon className="size-8 fill-background-foreground" />
					</a>

					<Link to="/">
						<Logo />
					</Link>

					<HelpButton />
				</div>
			</Container>
		</header>

		<main className="overflow-auto py-24">{children}</main>
	</div>
);

const HelpButton: React.FC = () => {
	const [showChangelog, setShowChangelog] = useState(false);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button title="Help" className="rounded-full p-2 bg-background outline-none">
						<CircleQuestionMark className="size-6" />
					</button>
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => setShowChangelog(true)}>
						<GiftIcon className="size-4" /> What's new?
					</DropdownMenuItem>

					<a href="https://t.me/iffypixy" target="_blank" rel="noopener noreferrer">
						<DropdownMenuItem>
							<SendIcon className="size-4" /> Contact me
						</DropdownMenuItem>
					</a>
				</DropdownMenuContent>
			</DropdownMenu>

			<ChangelogDialog open={showChangelog} onOpenChange={setShowChangelog} />
		</>
	);
};

interface ChangelogEntry {
	title: string;
	description: string;
	image: string;
	date: string;
}

const Changelog: ChangelogEntry[] = [
	{
		title: "Better stats, fresh look, more control",
		description:
			"Your performance stats now follow improved HLTV-based formulas for a more realistic picture of how you play. The interface has been refreshed with a cleaner look, and you can now explore your data more freely with new filters for time range, map, and game version. Of course, tons of bug fixes :) Much more to come, stay tuned!",
		image: ScreenshotProfile,
		date: "2025-11-14T12:00:00+01:00",
	},
];

const ChangelogDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[480px]">
				<DialogHeader>
					<DialogTitle className="flex flex-row items-center">
						<GiftIcon className="size-6 me-2" /> What's new?
					</DialogTitle>
				</DialogHeader>

				<div className="grid gap-8 overflow-y-auto">
					{Changelog.map((x, index) => (
						<div key={index} className="flex flex-col gap-8">
							<img
								src={x.image}
								alt={x.title}
								className="max-w-full border border-background-light rounded-sm p-2"
							/>
							<div className="flex flex-col gap-2">
								<h5 className="text-xl font-medium">{x.title}</h5>
								<p className="text-muted-foreground">{x.description}</p>
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
};

const Logo: React.FC = () => (
	<h3 className="font-extrabold text-4xl text-center leading-none">
		<span className="text-brand-faceit">FACEIT</span>
		<span className="text-hltv text-[1.25em]">
			<span className="text-brand-hltv">perf</span>
		</span>
	</h3>
);
