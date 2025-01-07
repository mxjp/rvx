/*

# Counter
A simple counter to demonstrate basic signal usage.

*/

import { $ } from "rvx";

export function Example() {
	const count = $(0);
	return <button on:click={() => { count.value++ }}>
		Clicked {count} {() => count.value === 1 ? "time" : "times"}!
	</button>;
}
