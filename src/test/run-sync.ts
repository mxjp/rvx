import { captureSelf } from "../core/signals.js";

export type TestFn<T> = () => T;

export function runTest<T>(fn: TestFn<T>): T {
	return captureSelf(dispose => {
		try {
			return fn();
		} finally {
			dispose();
		}
	});
}
