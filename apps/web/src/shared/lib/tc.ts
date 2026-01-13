export type Result<T> = [null, T] | [Error, null];

export function tc<TReturn>(f: () => Promise<TReturn>): Promise<Result<TReturn>>;
export function tc<TReturn>(f: () => TReturn): Result<TReturn>;

export function tc<TReturn>(f: () => TReturn | Promise<TReturn>) {
	try {
		const res = f();

		if (res instanceof Promise) {
			return res.then((res) => [null, res]).catch((error) => [normalizeError(error), null]);
		}

		return [null, res];
	} catch (error) {
		return [normalizeError(error), null];
	}
}

function normalizeError(err: unknown): Error {
	return err instanceof Error ? err : new Error(String(err));
}
