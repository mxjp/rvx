import { isolate } from "./isolate.js";
import { capture, teardown, TeardownHook } from "./lifecycle.js";
import { $, Expression, get, Signal, watch } from "./signals.js";

export interface MapArrayFn<I, O> {
	(value: I, index: () => number, partialOutput: O[]): O;
}

export function mapArray<I, O>(input: Expression<Iterable<I>>, fn: MapArrayFn<I, O>): () => O[] {
	let cycle = 0;
	const signal = $();
	const instances: Instance<I, O>[] = [];
	const groups = new Map<I, Group<I, O>>();
	const output: O[] = [];

	teardown(() => {
		for (const group of groups.values()) {
			group.dispose();
		}
	});

	watch(() => {
		try {
			let index = 0;
			for (const inputValue of get(input)) { // TODO: Check error behvaior.
				let instance: Instance<I, O> | undefined = instances[index];
				if (instance && instance.cycle !== cycle && Object.is(inputValue, instance.inputValue)) {
					instance.cycle = cycle;
					instance.indexSignal.value = index; // TODO: Check error behvaior.
				} else {
					// TODO: Skip group lookup if all instances are consumed.
					let group = groups.get(inputValue);
					instance = group?.consume(cycle);
					if (instance) {
						// TODO: Move consecutive matching values at once by lookahead in input iterator.

						const fromIndex = instances.indexOf(instance, index);
						if (fromIndex < 0) {
							// TODO: Cleanup.
							throw new Error("this should never happen");
						} else {
							instances.splice(fromIndex, 1);
							instances.splice(index, 0, instance);
							output.splice(fromIndex, 1);
							output.splice(index, 0, instance.outputValue);
							instance.indexSignal.value = index;
						}
					} else {
						let outputValue!: O;
						const indexSignal = $(index);
						const dispose = isolate(capture, () => {
							outputValue = fn(inputValue, () => indexSignal.value, output); // TODO: Check error behvaior.
						});

						instance = {
							cycle,
							inputValue,
							outputValue,
							indexSignal,
							dispose,
						};
						if (group) {
							group.push(instance);
						} else {
							groups.set(inputValue, new Group(instance));
						}

						instances.splice(index, 0, instance);
						output.splice(index, 0, outputValue);
					}
				}
				index++;
			}
			if (instances.length > index) {
				instances.length = index;
				output.length = index;
			}
			for (const [inputValue, group] of groups) {
				if (group.truncate(cycle)) {
					groups.delete(inputValue);
				}
			}
			signal.notify();
		} finally {
			cycle = (cycle + 1) | 0;
		}
	});

	return () => {
		signal.access();
		return output;
	};
}

interface Instance<I, O> {
	cycle: number;
	inputValue: I;
	outputValue: O;
	indexSignal: Signal<number>;
	dispose: TeardownHook;
}

class Group<I, O> {
	#consumed: number;
	#instances: Instance<I, O>[];

	constructor(instance: Instance<I, O>) {
		this.#consumed = 1;
		this.#instances = [instance];
	}

	push(instance: Instance<I, O>) {
		if (this.#consumed < this.#instances.length) {
			throw new Error("group not fully consumed");
		}
		this.#instances.push(instance);
		this.#consumed++;
	}

	consume(cycle: number): Instance<I, O> | undefined {
		// TODO: Check if this is needed for error recovery:
		if (this.#consumed > 0 && this.#instances[0].cycle !== cycle) {
			this.#consumed = 0;
		}
		while (this.#consumed < this.#instances.length) {
			const instance = this.#instances[this.#consumed];
			this.#consumed++;
			if (instance.cycle !== cycle) {
				instance.cycle = cycle;
				return instance;
			}
		}
		return undefined;
	}

	truncate(cycle: number): boolean {
		while (this.#consumed < this.#instances.length && this.#instances[this.#consumed].cycle === cycle) {
			this.#consumed++;
		}
		while (this.#instances.length > this.#consumed) {
			if (this.#instances[this.#consumed].cycle === cycle) {
				throw new Error("unconsumed stale instance");
			}
			this.#instances.pop()!.dispose(); // TODO: Check error behvaior.
		}
		this.#consumed = 0;
		return this.#instances.length === 0;
	}

	dispose(): void {
		const instances = this.#instances;
		for (let i = 0; i < instances.length; i++) {
			instances[i].dispose();
		}
	}
}
