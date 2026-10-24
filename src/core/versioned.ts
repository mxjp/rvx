import { Signal, StateEq } from "./signals.js";

/**
 * A {@link Signal} with a manually versioned state.
 */
export class Versioned<T> extends Signal<T> {
	#version = Symbol();

	constructor(value: T) {
		super(value, {
			s: _value => this.#version,
			e: (prev, _next) => prev === this.#version,
		} satisfies StateEq<T, symbol>);
	}

	/**
	 * Bump the version of this signal & notify observers.
	 */
	notify(): void {
		this.#version = Symbol();
		super.notify();
	}
}

/**
 * Shorthand for creating a {@link Versioned versioned signal}.
 *
 * @example
 * ```tsx
 * let value = 0;
 * const signal = $v();
 *
 * watch(() => {
 *   signal.access();
 *   return value;
 * }, () => {
 *   console.log("Value:", value);
 * });
 *
 * value++;
 * signal.notify();
 * ```
 */
export function $v(): Versioned<void>;

/**
 * Shorthand for creating a {@link Versioned versioned signal}.
 *
 * @example
 * ```tsx
 * const map = $v(new Map());
 * map.inert.set("foo", 1);
 * map.inert.set("bar", 2);
 * map.notify();
 * ```
 */
export function $v<T>(value: T): Versioned<T>;
export function $v<T>(value?: T): Versioned<T> {
	return new Versioned(value!);
}
