import { teardown } from "../core/lifecycle.js";

interface SideEffect {
	blocking: false;
	task: (signal: AbortSignal) => unknown | Promise<unknown>;
	resolve: undefined;
	reject: undefined;
}

interface Blocking {
	blocking: true;
	task: () => unknown | Promise<unknown>;
	resolve: (value: unknown) => void;
	reject: (value: unknown) => void;
}

type Task = SideEffect | Blocking;

/**
 * A queue for sequentially running async tasks that can be triggered by both the user and side effects.
 */
export class TaskSlot {
	#queue: Task[] = [];
	/**
	 * Number of tasks that need to be dequeued until this slot isn't blocked or any negative number. Zero indicates, that the last blocking task is currently running.
	 */
	#blocked = -1;
	#controller: AbortController | undefined = undefined;
	#running: Promise<void> | undefined = undefined;

	/**
	 * Create a new task slot.
	 *
	 * When the current lifecycle is disposed, all side effects are aborted and removed from the queue.
	 */
	constructor() {
		teardown(() => this.#abort());
	}

	#abort() {
		const queue = this.#queue;
		while (queue.length > 0 && !queue[0].blocking) {
			queue.shift();
			this.#blocked--;
		}
		this.#controller?.abort();
	}

	#run() {
		if (this.#running === undefined) {
			this.#running = (async () => {
				let task: Task | undefined;
				while (task = this.#queue.shift()) {
					this.#blocked--;
					if (task.blocking) {
						try {
							task.resolve(await task.task());
						} catch (error) {
							task.reject(error);
						}
					} else {
						const controller = new AbortController();
						this.#controller = controller;
						try {
							await task.task(controller.signal);
						} catch (error) {
							void Promise.reject(error);
						}
						this.#controller = undefined;
					}
				}
				this.#blocked--;
				this.#running = undefined;
			})();
		}
	}

	/**
	 * Queue a side effect to run if this slot isn't blocked.
	 *
	 * This will abort and remove all other side effects from the queue.
	 *
	 * @param task The side effect to queue.
	 */
	sideEffect(task: (signal: AbortSignal) => unknown | Promise<unknown>): void {
		if (this.#blocked >= 0) {
			return;
		}
		this.#abort();
		this.#queue.push({ blocking: false, task, resolve: undefined, reject: undefined });
		this.#run();
	}

	/**
	 * Queue a task to run and block this slot until it completes.
	 *
	 * This will abort and remove all other side effects from the queue.
	 *
	 * @param task The blocking task to queue.
	 * @returns The result of the task.
	 */
	block<T>(task: () => T | Promise<T>): Promise<T> {
		return new Promise<unknown>((resolve, reject) => {
			this.#abort();
			this.#blocked = this.#queue.push({ blocking: true, task, resolve, reject });
			this.#run();
		}) as Promise<T>;
	}
}
