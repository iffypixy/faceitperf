import { CircleQuestionMark, GiftIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { ChangelogDialog, hasReadChangelog, markChangelogAsRead } from "~/features/changelog";
import {
	Button,
	Container,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	GitHubIcon,
} from "~/shared/ui";

export const ContentTemplate: React.FC<React.PropsWithChildren> = ({ children }) => (
	<div className="flex min-h-dvh flex-col">
		<header className="sticky top-0 z-10 bg-card shadow-xs shadow-background py-4">
			<Container>
				<div className="flex items-center justify-between">
					<a
						href="https://github.com/iffypixy/faceitperf"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Source code on GitHub"
					>
						<GitHubIcon className="size-8 fill-foreground" />
					</a>

					<Link to="/" aria-label="faceitperf home">
						<Logo />
					</Link>

					<HelpButton />
				</div>
			</Container>
		</header>

		<main className="grid flex-1 grid-cols-1 py-8 sm:py-12">{children}</main>
	</div>
);

const HelpButton: React.FC = () => {
	const [isChangelogOpen, setIsChangelogOpen] = useState(false);
	const [hasRead, setHasRead] = useState(hasReadChangelog);

	const openChangelog = () => {
		markChangelogAsRead();
		setHasRead(true);
		setIsChangelogOpen(true);
	};

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
					<DropdownMenuItem onClick={openChangelog}>
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
	<div aria-hidden className="absolute rounded-full size-3 bg-faceit right-0 top-0" />
);

const Logo: React.FC = () => (
	<span className="block font-extrabold text-3xl sm:text-4xl leading-none">
		<span className="text-faceit">FACEIT</span>
		<span className="text-hltv text-[1.25em]">perf</span>
	</span>
);
