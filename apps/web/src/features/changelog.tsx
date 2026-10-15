import { GiftIcon } from "lucide-react";

import ScreenshotMatchStats from "~/shared/assets/images/screenshots/match-stats.webp";
import ScreenshotProfile from "~/shared/assets/images/screenshots/profile.webp";
import ScreenshotSortableTables from "~/shared/assets/images/screenshots/sortable-tables.webp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/shared/ui";

const Changelog: Array<{
	title: string;
	description: string;
	image: string;
	date: string;
}> = [
	{
		title: "Every match, HLTV style",
		description:
			"Match pages now show HLTV's leaders and detailed stats, from opening duels to utility damage, with your own row highlighted. Profiles load faster and fit any phone.",
		image: ScreenshotMatchStats,
		date: "2026-10-15T12:00:00.000Z",
	},
	{
		title: "Find your best and worst maps instantly",
		description: "Click any column to sort your maps and sessions however you want.",
		image: ScreenshotSortableTables,
		date: "2025-12-23T18:30:38.709Z",
	},
	{
		title: "Smarter stats, cleaner look, more control",
		description:
			"Calculations are now more accurate, the UI has received a major overhaul, and you can explore your stats with new time, map, and version filters.",
		image: ScreenshotProfile,
		date: "2025-11-14T11:00:00.000Z",
	},
];

const LastSeenDateKey = "changelog/lastSeenDate";

export function hasReadChangelog(): boolean {
	const lastSeenDate = localStorage.getItem(LastSeenDateKey);
	return lastSeenDate !== null && new Date(lastSeenDate) >= new Date(Changelog[0].date);
}

export function markChangelogAsRead() {
	localStorage.setItem(LastSeenDateKey, Changelog[0].date);
}

export const ChangelogDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCloseAutoFocus: (ev: Event) => void;
}> = ({ open, onOpenChange, onCloseAutoFocus }) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent
			className="sm:max-w-[480px] grid-rows-[auto_minmax(0,1fr)]"
			onCloseAutoFocus={onCloseAutoFocus}
		>
			<DialogHeader>
				<DialogTitle className="flex flex-row items-center">
					<GiftIcon className="size-6 me-2" /> What's new?
				</DialogTitle>
			</DialogHeader>

			<div className="grid gap-8 overflow-y-auto overscroll-contain mt-4">
				{Changelog.map((x, index) => (
					<div key={index} className="flex flex-col gap-4">
						<img
							src={x.image}
							alt={x.title}
							className="max-w-full border border-card rounded-xs p-0.5"
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
