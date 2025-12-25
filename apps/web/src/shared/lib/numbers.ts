export function clamp(val: number, min: number = -Infinity, max: number = Infinity): number {
	if (val < min) return min;
	else if (val > max) return max;
	return val;
}

export function toSignedString(n: number): string {
	if (n === 0) return "0";
	const sign = n > 0 ? "+" : "-";
	return `${sign}${Math.abs(n)}`;
}

export function divide(a: number, b: number) {
	if (b === 0) return a;
	return a / b;
}
