import { useEffect } from "react";

export const useDocumentTitle = (title: string) => {
	useEffect(() => {
		const prev = document.title;
		document.title = `${title} — faceitperf`;
		return () => {
			document.title = prev;
		};
	}, [title]);
};
