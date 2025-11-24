import { Context } from "../core/context.js";
import { ENV } from "../core/env.js";
import { isolate } from "../core/isolate.js";
import { teardown } from "../core/lifecycle.js";
import { $, watch } from "../core/signals.js";

export type TaskSource = (() => unknown) | Promise<unknown> | null | undefined;

export interface TasksOptions {
	/**
	 * If true, focus is restored on the last active element when there are no more pending tasks in this instance.
	 *
	 * By default, this is inherited from the parent or true of there is none.
	 */
	restoreFocus?: boolean;
}

/**
 * Represents a set of pending tasks in a specific context.
 *
 * This is meant to be used for preventing concurrent user interaction in a specific context.
 */
export class Tasks {
	#pendingCount = 0;
	#pending = $(false);
	#restoreFocus: boolean;
	#parent: Tasks | undefined;

	/**
	 * Create a new tasks instance with the specified parent.
	 *
	 * @param parent The parent to use. Default is no parent.
	 */
	constructor(parent?: Tasks, options?: TasksOptions) {
		this.#parent = parent;
		this.#restoreFocus = options?.restoreFocus ?? (parent ? parent.#restoreFocus : true);

		if (this.#restoreFocus) {
			const env = ENV.current;
			let last: Element | null = null;
			watch(this.#pending, pending => {
				if (pending) {
					last = env.document.activeElement;
				} else if (last && env.document.activeElement === env.document.body) {
					const target = last;
					queueMicrotask(() => {
						if (last === target && env.document.activeElement === env.document.body) {
							(target as HTMLElement).focus?.();
						}
					});
				}
			});
		}
	}

	#setPending(): void {
		this.#pendingCount++;
		this.#pending.value = true;
	}

	#unsetPending(): void {
		this.#pendingCount--;
		this.#pending.value = this.#pendingCount > 0;
	}

	/**
	 * The parent instance or undefined if there is none.
	 */
	get parent(): Tasks | undefined {
		return this.#parent;
	}

	/**
	 * True if this instance has any pending tasks.
	 *
	 * @example
	 * ```tsx
	 * <div inert={() => tasks.selfPending}>...</div>
	 * ```
	 */
	get selfPending(): boolean {
		return this.#pending.value;
	}

	/**
	 * True if this instance or any of it's parents has any pending tasks.
	 *
	 * @example
	 * ```tsx
	 * <button disabled={() => tasks.pending}>...</button>
	 * ```
	 */
	get pending(): boolean {
		return (this.#parent?.pending ?? false) || this.#pending.value;
	}

	/**
	 * Pretend, that there is a pending task until the current lifecycle is disposed.
	 */
	setPending(): void {
		this.#setPending();
		let disposed = false;
		teardown(() => {
			if (!disposed) {
				disposed = true;
				this.#unsetPending();
			}
		});
	}

	/**
	 * Wait for an async function or a promise.
	 *
	 * @param source The async function or promise to wait for.
	 * + If this is a function, it runs {@link isolate isolated}.
	 */
	waitFor(source: TaskSource): void {
		if (typeof source === "function") {
			this.#setPending();
			void (async () => {
				try {
					return await isolate(source);
				} catch (error) {
					void Promise.reject(error);
				} finally {
					this.#unsetPending();
				}
			})();
		} else if (source instanceof Promise) {
			this.#setPending();
			void source.then(() => this.#unsetPending(), () => this.#unsetPending());
		}
	}

	/**
	 * Create a new tasks instance using the current instance as parent.
	 */
	static fork(options?: TasksOptions): Tasks {
		return new Tasks(TASKS.current, options);
	}
}

/**
 * Context for the current {@link Tasks} instance.
 */
export const TASKS = new Context<Tasks | undefined>();

/**
 * Check if there are any pending tasks in the current tasks instance.
 *
 * This can be used in conjuction with {@link Tasks.prototype.waitFor `TASKS.current.waitFor`} to indicate if there are any pending tasks.
 *
 * This is meant to be used for preventing concurrent user interaction in a specific context.
 *
 * @example
 * ```tsx
 * <div inert={isSelfPending}>...</div>
 * ```
 */
export function isSelfPending(): boolean {
	return TASKS.current?.selfPending ?? false;
}

/**
 * Check if there are any {@link Tasks.prototype.pending pending} tasks in the current tasks instance or any of it's parents.
 *
 * This can be used in conjunction with {@link Tasks.prototype.waitFor `TASKS.current.waitFor`} to disable inputs and buttons while there are any pending tasks.
 *
 * This is meant to be used for preventing concurrent user interaction in a specific context.
 *
 * @example
 * ```tsx
 * <button disabled={isPending}>...</button>
 * ```
 */
export function isPending(): boolean {
	return TASKS.current?.pending ?? false;
}

/**
 * @deprecated Use `TASKS.current.setPending()` instead. This silently fails if there is no `Tasks` instance in the current context.
 */
export function setPending(): void {
	TASKS.current?.setPending();
}

/**
 * @deprecated Use {@link Tasks.prototype.waitFor `TASKS.current.waitFor`} insead. This silently fails if there is no `Tasks` instance in the current context.
 */
export function waitFor(source: TaskSource): void {
	TASKS.current?.waitFor(source);
}
