import { createBenchmark } from "../common/app-todo-user-actions.js";

export { multiplier } from "../common/app-todo-user-actions.js";

/** @param {import("rvx")} */
export function create(rvx) {
	return createBenchmark(rvx, false);
}
