import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { GiftIcon } from "lucide-react";

import ScreenshotProfile from "@shared/assets/images/screenshots/profile.webp";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@shared/ui";

const ChangelogContext = createContext<{
	hasRead: boolean;
	markAsRead: () => void;
}>({ hasRead: false, markAsRead: () => {} });

const Changelog: Array<{
	title: string;
	description: string;
	image: string;
	date: string;
}> = [
	{
		title: "Smarter stats, cleaner look, more control",
		description:
			"Calculations are now more accurate, the UI has received a major overhaul, and you can explore your stats with new time, map, and version filters.",
		image: ScreenshotProfile,
		date: "2025-11-14T12:00:00+01:00",
	},
];

const lastChangelogEntryDate = new Date(Changelog[0].date);

export const ChangelogProvider: React.FC<PropsWithChildren> = ({ children }) => {
	const [lastSeenDate, setLastSeenDate] = useState(() => {
		const date = localStorage.getItem("changelog/lastSeenDate");
		return date !== null ? new Date(date) : null;
	});

	const markAsRead = useCallback(() => {
		localStorage.setItem("changelog/lastSeenDate", lastChangelogEntryDate.toISOString());
		setLastSeenDate(lastChangelogEntryDate);
	}, []);

	const hasRead = useMemo(() => {
		if (!lastSeenDate) return false;
		return lastSeenDate >= lastChangelogEntryDate;
	}, [lastSeenDate]);

	return (
		<ChangelogContext.Provider value={{ hasRead, markAsRead }}>
			{children}
		</ChangelogContext.Provider>
	);
};

export const useChangelog = () => useContext(ChangelogContext);

export const ChangelogDialog: React.FC<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
	const { markAsRead } = useChangelog();

	useEffect(() => {
		if (!open) return;
		markAsRead();
	}, [open, markAsRead]);

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
