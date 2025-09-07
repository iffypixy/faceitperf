export function assert(
	condition: unknown,
	message?: string,
): asserts condition {
	if (!condition) throw new Error(message ?? "assertion failed");
}

export function assertNever(value: never, message?: string): never {
	throw new Error(message ?? `unexpected value: ${value}`);
}
