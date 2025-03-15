import type { ClassValue } from "../element-common.js";
import { teardown } from "../lifecycle.js";
import { watch } from "../signals.js";

class ClassBucket {
	#target: Element;
	#entries: { t: string, c: number }[] = [];
	#removeQueue: string[] = [];
	#addQueue: string[] = [];

	constructor(target: Element) {
		this.#target = target;
	}

	/**
	 * Increment the internal counter for the specified token until the current lifecycle is disposed.
	 */
	a(token: string): void {
		const entries = this.#entries;
		teardown(() => {
			const removeQueue = this.#removeQueue;
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				if (entry.t === token) {
					if (--entry.c === 0) {
						entries.splice(i, 1);
						removeQueue.push(token);
					}
					return;
				}
			}
		});
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (entry.t === token) {
				entry.c++;
				return;
			}
		}
		entries.push({ t: token, c: 1 });
		this.#addQueue.push(token);
	}

	/**
	 * Flush token additions & removals.
	 */
	f(): void {
		const target = this.#target;
		const removeQueue = this.#removeQueue;
		const addQueue = this.#addQueue;
		if (removeQueue.length > 0) {
			target.classList.remove(...removeQueue);
			removeQueue.length = 0;
		}
		if (addQueue.length > 0) {
			if (target.hasAttribute("class")) {
				target.classList.add(...addQueue);
			} else {
				target.setAttribute("class", addQueue.join(" "));
			}
			addQueue.length = 0;
		}
	}
}

function watchClass(value: ClassValue, bucket: ClassBucket, flush: boolean): void {
	watch(value, value => {
		if (typeof value === "string") {
			bucket.a(value);
		} else if (value) {
			if (Array.isArray(value)) {
				for (let i = 0; i < value.length; i++) {
					watchClass(value[i], bucket, false);
				}
			} else {
				for (const token in value) {
					watch(value[token], enable => {
						if (enable) {
							bucket.a(token);
						}
						if (flush) {
							bucket.f();
						}
					});
				}
			}
		}
		if (flush) {
			bucket.f();
		} else {
			flush = true;
		}
	});
}

export function setClass(elem: Element, value: ClassValue): void {
	watchClass(value, new ClassBucket(elem), true);
}
