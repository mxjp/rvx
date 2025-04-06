import { $, Signal, watchUpdates } from "../core/signals.js";

/**
 * Create a derived signal for trimming user input.
 *
 * + The source signal contains the trimmed value.
 * + The input signal contains the un-trimmed value.
 * + Updates are processed until the current lifecycle is disposed.
 *
 * @param source The source signal.
 * @returns The derived input signal.
 *
 * @example
 * ```tsx
 * import { trim } from "rvx/convert";
 *
 * <TextInput value={someSignal.pipe(trim)} />
 * ```
 */
export function trim(source: Signal<string>): Signal<string> {
	const input = $(source.value, source);

	watchUpdates(input, value => {
		source.value = value.trim();
	});

	watchUpdates(source, value => {
		if (input.value.trim() !== value) {
			input.value = value;
		}
	});

	return input;
}
