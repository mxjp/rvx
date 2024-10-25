import { Context } from "../core/context.js";
import { sig } from "../core/signals.js";

/**
 * Represents pending operations in an asynchronously rendered tree.
 *
 * This can be used to wait until an entire async tree is rendered or to check if any unhandled errors occurred.
 */
export class AsyncContext {
	#parent: AsyncContext | undefined;
	#tasks = sig(new Set<Promise<unknown>>());
	#errorHandlers = new Set<unknown[]>();

	constructor(parent?: AsyncContext) {
		this.#parent = parent;
	}

	/**
	 * Reactively check if there are any pending tasks in this context.
	 *
	 * @example
	 * ```tsx
	 * <Show when={() => asyncCtx.pending}>
	 *   <div class="overlay">Please wait...</div>
	 * </Show>
	 * ```
	 */
	get pending(): boolean {
		return this.#tasks.value.size > 0;
	}

	/**
	 * Track the specified task in this and all parent contexts.
	 */
	track(task: Promise<unknown>): void {
		this.#parent?.track(task);
		this.#tasks.update(tasks => {
			tasks.add(task);
		});
		task.then(() => {
			this.#tasks.update(tasks => {
				tasks.delete(task);
			});
		}, error => {
			if (this.#errorHandlers.size > 0) {
				for (const errorHandler of this.#errorHandlers) {
					errorHandler.push(error);
				}
			} else {
				void Promise.reject(error);
			}
			this.#tasks.update(tasks => {
				tasks.delete(task);
			});
		});
	}

	/**
	 * Wait until all tracked tasks in this and all child contexts have completed.
	 *
	 * This also includes new tasks that are tracked while waiting.
	 *
	 * @throws Errors thrown by any tracked task or an {@link AsyncError} if multiple tasks failed.
	 */
	async complete(): Promise<void> {
		const errors: unknown[] = [];
		this.#errorHandlers.add(errors);
		while (this.#tasks.value.size > 0) {
			await Promise.allSettled(this.#tasks.value);
		}
		this.#errorHandlers.delete(errors);
		if (errors.length === 1) {
			throw errors[0];
		} else if (errors.length > 1) {
			throw new AsyncError(errors);
		}
	}

	/**
	 * Create a new async context using the {@link extract current} context as parent.
	 */
	static fork(): AsyncContext {
		return new AsyncContext(ASYNC.current);
	}
}

/**
 * Thrown by {@link AsyncContext.complete} if multiple unhandled {@link errors} occurred.
 */
export class AsyncError extends Error {
	errors: unknown[];

	constructor(errors: unknown[]) {
		super();
		this.errors = errors;
	}
}

/**
 * Context for the current {@link AsyncContext}.
 */
export const ASYNC = new Context<AsyncContext>();
