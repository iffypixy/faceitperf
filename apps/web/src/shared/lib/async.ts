type AwaitedReturn<T> = T extends PromiseLike<infer U> ? U : T;

export async function tc<T>(
	promise: Promise<T>,
): Promise<[null, AwaitedReturn<T>] | [Error, null]> {
	try {
		const data = await promise;
		return [null, data as AwaitedReturn<T>];
	} catch (err) {
		return [normalizeError(err), null];
	}
}

function normalizeError(err: unknown): Error {
	return err instanceof Error ? err : new Error(String(err));
}
