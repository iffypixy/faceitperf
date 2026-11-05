import { Link } from "wouter";
import { translate } from "~/shared/lib/language";
import { useDocumentTitle } from "~/shared/lib/use-document-title";
import { Center, ContentTemplate } from "~/shared/ui";

const t = translate({
	en: {
		title: "Page not found",
		heading: "This page doesn't exist.",
		search: "Search for a player",
	},
	ru: {
		title: "Страница не найдена",
		heading: "Такой страницы нет.",
		search: "Найти игрока",
	},
});

export const NotFoundPage: React.FC = () => {
	useDocumentTitle(t.title);

	return (
		<ContentTemplate>
			<NotFound heading={t.heading} />
		</ContentTemplate>
	);
};

export const NotFound: React.FC<{ heading: string }> = ({ heading }) => (
	<Center className="flex-col gap-4 px-4 text-center">
		<h1 className="text-2xl">{heading}</h1>
		<Link href="/" className="text-primary-foreground">
			{t.search}
		</Link>
	</Center>
);
