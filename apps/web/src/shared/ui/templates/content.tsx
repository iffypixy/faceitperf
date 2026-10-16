import { CircleQuestionMark, GiftIcon, GlobeIcon, SendIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "wouter";
import { ChangelogDialog, hasReadChangelog, markChangelogAsRead } from "~/features/changelog";
import { assert } from "~/shared/lib/assert";
import {
	type Language,
	Languages,
	language,
	switchLanguage,
	translate,
} from "~/shared/lib/language";
import {
	Button,
	Container,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
	GitHubIcon,
} from "~/shared/ui";

const t = translate({
	en: {
		sourceCode: "Source code on GitHub",
		home: "faceitperf home",
		language: "Language",
		help: "Help",
		changelog: "What's new?",
		contact: "Contact me",
	},
	ru: {
		sourceCode: "Исходный код на GitHub",
		home: "faceitperf, главная",
		language: "Язык",
		help: "Помощь",
		changelog: "Что нового?",
		contact: "Написать мне",
	},
});

// Each language is named in itself, so a visitor finds theirs whatever the page is in.
const LanguageName: Record<Language, string> = {
	en: "English",
	ru: "Русский",
};

export const ContentTemplate: React.FC<React.PropsWithChildren> = ({ children }) => (
	<div className="flex min-h-dvh flex-col">
		<header className="sticky top-0 z-10 bg-card shadow-xs shadow-background py-4">
			<Container>
				{/* Wide screens centre the logo between equal side columns. A phone has no room for that
				    beside two buttons, so it spaces the items evenly, and the narrowest drop GitHub. */}
				<div className="flex items-center justify-between xs:grid xs:grid-cols-[1fr_auto_1fr]">
					<a
						href="https://github.com/iffypixy/faceitperf"
						target="_blank"
						rel="noopener noreferrer"
						aria-label={t.sourceCode}
						className="justify-self-start max-[359px]:hidden"
					>
						<GitHubIcon className="size-8 fill-foreground" />
					</a>

					<Link to="/" aria-label={t.home}>
						<Logo />
					</Link>

					<div className="justify-self-end flex items-center gap-3">
						<LanguageButton />
						<HelpButton />
					</div>
				</div>
			</Container>
		</header>

		{/* Focusable so navigation can move focus to the new page (see Routes). */}
		<main tabIndex={-1} className="grid flex-1 grid-cols-1 py-8 sm:py-12 outline-none">
			{children}
		</main>
	</div>
);

const LanguageButton: React.FC = () => (
	<DropdownMenu>
		<DropdownMenuTrigger asChild>
			<Button variant="icon" title={t.language} className="rounded-full p-2 bg-background">
				<GlobeIcon className="size-6" />
			</Button>
		</DropdownMenuTrigger>

		<DropdownMenuContent>
			<DropdownMenuRadioGroup
				value={language}
				onValueChange={(picked) => {
					const pickedLanguage = Languages.find((x) => x === picked);
					assert(pickedLanguage);
					if (pickedLanguage !== language) switchLanguage(pickedLanguage);
				}}
			>
				{Languages.map((x) => (
					<DropdownMenuRadioItem key={x} value={x} lang={x}>
						{LanguageName[x]}
					</DropdownMenuRadioItem>
				))}
			</DropdownMenuRadioGroup>
		</DropdownMenuContent>
	</DropdownMenu>
);

const HelpButton: React.FC = () => {
	const [isChangelogOpen, setIsChangelogOpen] = useState(false);
	const [hasRead, setHasRead] = useState(hasReadChangelog);
	const buttonRef = useRef<HTMLButtonElement>(null);

	const openChangelog = () => {
		markChangelogAsRead();
		setHasRead(true);
		setIsChangelogOpen(true);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						ref={buttonRef}
						variant="icon"
						title={t.help}
						className="rounded-full p-2 bg-background relative"
					>
						<CircleQuestionMark className="size-6" />
						{!hasRead && <NotificationDot />}
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem onClick={openChangelog}>
						<GiftIcon className="size-4" /> {t.changelog}
					</DropdownMenuItem>

					<DropdownMenuItem asChild>
						<a href="https://t.me/iffypixy" target="_blank" rel="noopener noreferrer">
							<SendIcon className="size-4" /> {t.contact}
						</a>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<ChangelogDialog
				open={isChangelogOpen}
				onOpenChange={setIsChangelogOpen}
				// The dialog opens from a menu item that's gone by the time it closes, so focus goes
				// back to the button that opened the menu.
				onCloseAutoFocus={(ev) => {
					ev.preventDefault();
					buttonRef.current?.focus();
				}}
			/>
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
