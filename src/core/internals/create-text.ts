import { Expression, watch } from "../signals.js";

/**
 * Create a text node that displays the result of an expression.
 *
 * Null and undefined are displayed as an empty string.
 */
export function createText(expr: Expression<unknown>, env: typeof globalThis): Text {
	const text = env.document.createTextNode("");
	watch(expr, value => text.textContent = (value ?? "") as string);
	return text;
}
