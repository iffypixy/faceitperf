export function clamp(
	val: number,
	min: number = -Infinity,
	max: number = Infinity,
): number {
	return val < min ? min : val > max ? max : val;
}

export function toSignedString(n: number): string {
	if (n === 0) return "0";
	return (n > 0 ? "+" : "-") + Math.abs(n);
}
