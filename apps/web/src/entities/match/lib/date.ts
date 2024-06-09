import * as datefns from "date-fns";

const getDayWithSuffix = (day: number) => {
	if (day > 3 && day < 21) return `${day}th`;
	switch (day % 10) {
		case 1:
			return `${day}st`;
		case 2:
			return `${day}nd`;
		case 3:
			return `${day}rd`;
		default:
			return `${day}th`;
	}
};

export const formatMatchDate = (date: Date) => {
	const day = getDayWithSuffix(date.getDate());
	const monthYear = datefns.format(date, "MMMM yyyy");

	return `${day} of ${monthYear}`;
};
