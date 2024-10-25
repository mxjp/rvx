import { ASYNC, AsyncContext } from "../async/async-context.js";
import { captureSelf, TeardownHook } from "../core/lifecycle.js";

export interface AsyncTestContext {
	asyncCtx: AsyncContext;
	use: <T>(fn: () => T) => T;
}

export type AsyncTestFn<T> = (ctx: AsyncTestContext) => Promise<T>;

export async function runAsyncTest<T>(fn: AsyncTestFn<T>): Promise<T> {
	const teardown: TeardownHook[] = [];

	const asyncCtx = new AsyncContext();

	async function cleanup() {
		for (let i = teardown.length - 1; i >= 0; i--) {
			teardown[i]();
		}
		return asyncCtx.complete();
	}

	try {
		const result = await fn({
			asyncCtx,
			use: fn => captureSelf(dispose => {
				teardown.push(dispose);
				return ASYNC.inject(asyncCtx, fn);
			}),
		});
		await cleanup();
		return result;
	} catch (error) {
		try {
			await cleanup();
		} catch {}
		throw error;
	}
}
