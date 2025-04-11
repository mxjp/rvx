import { teardown } from "../core/lifecycle.js";
import { $, Signal, watchUpdates } from "../core/signals.js";

/**
 * Create a derived signal for debouncing user input updates.
 *
 * + If the source signal is updated, scheduled updates from the input are aborted.
 * + If the input signal is updated, a source update is scheduled with the specified delay and any previously scheduled update is aborted.
 * + Updates are processed until the current lifecycle is disposed.
 *
 * @param source The source signal.
 * @param delay The delay in milliseconds.
 * @returns The derived input signal.
 *
 * @example
 * ```tsx
 * import { debounce } from "rvx/convert";
 *
 * <TextInput value={someSignal.pipe(debounce, 300)} />
 * ```
 */
export function debounce<T>(source: Signal<T>, delay: number): Signal<T> {
	const input = $(source.value, source);

	watchUpdates(input, value => {
		if (!Object.is(source.value, value)) {
			const timeout = setTimeout(() => { source.value = value }, delay);
			teardown(() => clearTimeout(timeout));
		}
	});

	watchUpdates(source, value => {
		input.value = value;
	});

	return input;
}
