export const insertNumberSign = (n: number) => {
	if (n > 0) {
		return `+${n}`;
	} else if (n < 0) {
		return `${n}`;
	} else {
		return `${n}`;
	}
};
