import { CircleQuestionMark, GiftIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

import {
	Container,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	GitHubIcon,
	Button,
} from "@shared/ui";
import { ChangelogDialog, useChangelog } from "@shared/lib/changelog";

export const ContentTemplate: React.FC<React.PropsWithChildren> = ({ children }) => (
	<div className="fixed inset-0 grid grid-rows-[auto_1fr] overflow-auto">
		<header className="bg-card shadow-xs shadow-background z-10 py-4">
			<Container>
				<div className="flex items-center justify-between">
					<a
						href="https://github.com/iffypixy/faceitperf"
						target="_blank"
						rel="noopener noreferrer"
					>
						<GitHubIcon className="size-8 fill-foreground" />
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
	const [isChangelogOpen, setIsChangelogOpen] = useState(false);
	const { hasRead } = useChangelog();

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="icon" title="Help" className="rounded-full p-2 bg-background relative">
						<CircleQuestionMark className="size-6" />
						{!hasRead && <NotificationDot />}
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem onClick={() => setIsChangelogOpen(true)}>
						<GiftIcon className="size-4" /> What's new?
					</DropdownMenuItem>

					<a href="https://t.me/iffypixy" target="_blank" rel="noopener noreferrer">
						<DropdownMenuItem>
							<SendIcon className="size-4" /> Contact me
						</DropdownMenuItem>
					</a>
				</DropdownMenuContent>
			</DropdownMenu>

			<ChangelogDialog open={isChangelogOpen} onOpenChange={setIsChangelogOpen} />
		</>
	);
};

const NotificationDot: React.FC = () => (
	<>
		<div
			aria-hidden
			className="absolute rounded-full size-3 bg-faceit right-0 top-0 animate-ping"
		/>
		<div aria-hidden className="absolute rounded-full size-3 bg-faceit right-0 top-0" />
	</>
);

const Logo: React.FC = () => (
	<h3 className="font-extrabold text-4xl text-center leading-none">
		<span className="text-faceit">FACEIT</span>
		<span className="text-hltv text-[1.25em]">perf </span>
	</h3>
);
