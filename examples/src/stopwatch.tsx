/*

# Stopwatch
A stopwatch that doesn't drift over time.

This example also demonstrates how state and logic can be separated from it's representation if needed.

*/

import { $, batch, Expression, get, Index, Nest, Overwrite, Show, watchUpdates } from "rvx";
import { useAnimation } from "rvx/async";

export function Example() {
	const stopwatch = new Stopwatch();

	return <div class="column">
		<Overwrite style={{ "font-size": "2rem" }}>
			<Time value={stopwatch.time} />
		</Overwrite>
		<div class="row">
			<Nest watch={stopwatch.running}>
				{running => running
					? <button on:click={stopwatch.stop}>Stop</button>
					: <button on:click={stopwatch.start}>Start</button>
				}
			</Nest>
			<button on:click={stopwatch.lap} disabled={() => !stopwatch.running()}>Lap</button>
			<button on:click={stopwatch.reset}>Reset</button>
		</div>
		<ul>
			<Index each={stopwatch.laps}>
				{(lap, i) => <li><Time value={lap() - (stopwatch.laps()[i - 1] ?? 0)} /></li>}
			</Index>
		</ul>
	</div>;
}

class Stopwatch {
	#runningSince = 0;
	#running = $(false);
	#time = $(0);
	#laps = $<number[]>([]);

	constructor() {
		watchUpdates(this.#running, running => {
			if (running) {
				this.#runningSince = performance.now() - this.#time.value;
				useAnimation(() => {
					this.#time.value = performance.now() - this.#runningSince;
				});
			}
		});
	}

	time = () => this.#time.value;
	running = () => this.#running.value;
	laps = () => this.#laps.value;

	start = () => { this.#running.value = true };
	stop = () => { this.#running.value = false };

	reset = () => batch(() => {
		this.#running.value = false;
		this.#time.value = 0;
		this.#laps.value = [];
	});

	lap = () => {
		this.#laps.update(laps => {
			laps.push(this.#time.value);
		});
	};
}

function Time(props: { value: Expression<number> }) {
	return <code>
		<Show when={() => Math.floor(get(props.value) / 1000 / 60 / 60)}>
			{hours => <>{hours}:</>}
		</Show>
		{() => Math.floor(get(props.value) / 1000 / 60) % 60}
		:
		{() => (Math.floor(get(props.value) / 1000) % 60).toFixed(0).padStart(2, "0")}
		.
		{() => (Math.floor(get(props.value)) % 1000).toFixed(0).padStart(3, "0")}
	</code>;
}
